-- P0 defense in depth for lesson/module exam submission.
-- Lesson exams already checked exact lesson access inside the legacy function,
-- but module exams only checked historical lesson completion. A user whose
-- course access was later revoked could therefore retain enough progress to
-- reach the module-exam grading path by calling the RPC directly.
--
-- Move the proven grading implementation to private and put a current-access
-- facade in front of both lesson and module submissions. The legacy function
-- still performs its existing completion/attempt/scoring checks.

alter function public.ghc_student_submit_learning_exam(uuid, jsonb)
  rename to ghc_internal_submit_learning_exam_legacy;

alter function public.ghc_internal_submit_learning_exam_legacy(uuid, jsonb)
  set schema private;

revoke all on function private.ghc_internal_submit_learning_exam_legacy(uuid, jsonb)
  from public, anon, authenticated, service_role;

create function public.ghc_student_submit_learning_exam(
  p_exam_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_exam public.exams;
  v_lesson_id uuid;
  v_access jsonb;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión como alumno.';
  end if;

  if p_exam_id is null then
    raise exception 'exam_id es obligatorio.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Las respuestas deben enviarse como un objeto JSON.';
  end if;

  select e.* into v_exam
  from public.exams e
  where e.id = p_exam_id
    and e.status = 'published'
    and e.exam_scope in ('lesson','module');

  if v_exam.id is null then
    raise exception 'El examen no existe, no está publicado o no pertenece al flujo de aprendizaje.';
  end if;

  if v_exam.exam_scope = 'lesson' then
    if v_exam.lesson_id is null then
      raise exception 'El examen de lección no tiene lección asociada.';
    end if;
    v_lesson_id := v_exam.lesson_id;
  else
    if v_exam.module_id is null then
      raise exception 'El examen de módulo no tiene módulo asociado.';
    end if;

    select l.id into v_lesson_id
    from public.lessons l
    where l.module_id = v_exam.module_id
    order by coalesce(l.sort_order,0), l.created_at, l.id
    limit 1;

    if v_lesson_id is null then
      raise exception 'El módulo no tiene lecciones asociadas.';
    end if;
  end if;

  -- Exact lesson access is the canonical current-access/commercial gate. For a
  -- module exam use a real lesson from that module; the private legacy function
  -- still requires every module lesson to be completed before grading.
  v_access := public.ghc_internal_student_lesson_access(v_uid, v_lesson_id);
  if not coalesce((v_access ->> 'allowed')::boolean, false) then
    raise exception '%', coalesce(v_access ->> 'reason', 'El contenido está bloqueado.');
  end if;

  return private.ghc_internal_submit_learning_exam_legacy(p_exam_id, p_answers);
end;
$$;

revoke all on function public.ghc_student_submit_learning_exam(uuid, jsonb)
  from public, anon;
grant execute on function public.ghc_student_submit_learning_exam(uuid, jsonb)
  to authenticated;