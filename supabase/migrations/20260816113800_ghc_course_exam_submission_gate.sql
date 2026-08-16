-- P0: direct RPC calls to ghc_student_submit_course_exam previously bypassed
-- the canonical final-exam unlock rule. The student UI checked the gate, but
-- the submit RPC itself did not. This facade now reuses the same canonical
-- rule used by ghc_student_get_published_course_exam:
--   active course access + commercial payment complete + all modules complete.
-- The proven grading/attempt/certificate implementation is moved to private
-- and is no longer directly executable by API roles.

alter function public.ghc_student_submit_course_exam(uuid, jsonb)
  rename to ghc_internal_submit_course_exam_legacy;

alter function public.ghc_internal_submit_course_exam_legacy(uuid, jsonb)
  set schema private;

revoke all on function private.ghc_internal_submit_course_exam_legacy(uuid, jsonb)
  from public, anon, authenticated, service_role;

create function public.ghc_student_submit_course_exam(
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
  v_course_id uuid;
  v_gate jsonb;
  v_gate_exam_id uuid;
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

  select e.course_id
    into v_course_id
  from public.exams e
  where e.id = p_exam_id
    and e.status = 'published'
    and e.exam_scope = 'course';

  if v_course_id is null then
    raise exception 'El examen no existe, no está publicado o no es el examen final del curso.';
  end if;

  -- Canonical final-exam gate: enrollment/access, commercial state and module
  -- completion. Do not duplicate those rules in this facade.
  v_gate := public.ghc_student_get_published_course_exam(v_course_id);

  if not coalesce((v_gate ->> 'unlocked')::boolean, false) then
    raise exception 'El examen final todavía no está desbloqueado para tu matrícula.';
  end if;

  begin
    v_gate_exam_id := nullif(v_gate -> 'exam' ->> 'id', '')::uuid;
  exception when others then
    v_gate_exam_id := null;
  end;

  if v_gate_exam_id is null or v_gate_exam_id <> p_exam_id then
    raise exception 'El examen indicado no es el examen final disponible para este curso.';
  end if;

  return private.ghc_internal_submit_course_exam_legacy(p_exam_id, p_answers);
end;
$$;

revoke all on function public.ghc_student_submit_course_exam(uuid, jsonb)
  from public, anon;
grant execute on function public.ghc_student_submit_course_exam(uuid, jsonb)
  to authenticated;