create or replace function private.ghc_course_commercial_state(p_user_id uuid, p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare v_access public.course_access;
begin
  select * into v_access from public.course_access
  where user_id=p_user_id and course_id=p_course_id and status='active'
    and (expires_at is null or expires_at>now())
  limit 1;
  if v_access.id is null then
    return jsonb_build_object('has_access',false,'fully_paid',false,'max_module_order',0,'commercial_order_id',null);
  end if;
  return jsonb_build_object(
    'has_access',true,
    'fully_paid',case when v_access.commercial_order_id is null then true else coalesce(v_access.commercial_fully_paid,false) end,
    'max_module_order',v_access.commercial_max_module_order,
    'commercial_order_id',v_access.commercial_order_id,
    'manual_override',coalesce(v_access.commercial_manual_override,false)
  );
end;
$$;

create or replace function public.ghc_internal_student_lesson_access(p_user_id uuid, p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public','private'
as $$
declare
  v_target record;
  v_completed boolean := false;
  v_redirect_lesson_id uuid := null;
  v_blocking_module record;
  v_commercial jsonb;
  v_max_module integer;
begin
  if p_user_id is null or p_lesson_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'Acceso no válido.');
  end if;
  with module_ordered as (
    select m.id,m.course_id,row_number() over(partition by m.course_id order by coalesce(m.position,m.sort_order,0),m.created_at,m.id) module_rn
    from public.modules m
  ), lesson_ordered as (
    select l.id lesson_id,l.module_id,mo.course_id,mo.module_rn,
      row_number() over(partition by mo.course_id order by mo.module_rn,coalesce(l.sort_order,0),l.created_at,l.id) lesson_rn
    from public.lessons l join module_ordered mo on mo.id=l.module_id
  )
  select * into v_target from lesson_ordered where lesson_id=p_lesson_id;
  if v_target.lesson_id is null then return jsonb_build_object('allowed',false,'reason','La lección no existe.'); end if;
  if not public.ghc_has_course_access_for_user(p_user_id,v_target.course_id) then
    return jsonb_build_object('allowed',false,'reason','No tienes una matrícula activa para este curso.','course_id',v_target.course_id,'module_id',v_target.module_id);
  end if;
  v_commercial:=private.ghc_course_commercial_state(p_user_id,v_target.course_id);
  v_max_module:=nullif(v_commercial->>'max_module_order','')::integer;
  if (v_commercial->>'commercial_order_id') is not null and not coalesce((v_commercial->>'fully_paid')::boolean,false)
     and v_max_module is not null and v_target.module_rn>v_max_module then
    return jsonb_build_object(
      'allowed',false,
      'reason','Este contenido todavía no está incluido en los pagos confirmados de tu plan. Se desbloqueará automáticamente cuando corresponda el siguiente pago.',
      'commercial_lock',true,'commercial_max_module_order',v_max_module,
      'course_id',v_target.course_id,'module_id',v_target.module_id
    );
  end if;
  select exists(select 1 from public.lesson_progress lp where lp.user_id=p_user_id and lp.lesson_id=p_lesson_id and lp.completed=true) into v_completed;
  if v_completed then
    return jsonb_build_object('allowed',true,'completed',true,'course_id',v_target.course_id,'module_id',v_target.module_id,'lesson_rn',v_target.lesson_rn,'module_rn',v_target.module_rn,'commercial_max_module_order',v_max_module);
  end if;
  with module_ordered as (
    select m.id,row_number() over(order by coalesce(m.position,m.sort_order,0),m.created_at,m.id) module_rn
    from public.modules m where m.course_id=v_target.course_id
  ), lesson_ordered as (
    select l.id lesson_id,row_number() over(order by mo.module_rn,coalesce(l.sort_order,0),l.created_at,l.id) lesson_rn
    from public.lessons l join module_ordered mo on mo.id=l.module_id
  )
  select lo.lesson_id into v_redirect_lesson_id from lesson_ordered lo
  where lo.lesson_rn<v_target.lesson_rn and not exists(
    select 1 from public.lesson_progress lp where lp.user_id=p_user_id and lp.lesson_id=lo.lesson_id and lp.completed=true
  ) order by lo.lesson_rn limit 1;
  if v_redirect_lesson_id is not null then
    return jsonb_build_object('allowed',false,'reason','Completa la lección anterior antes de continuar.','redirect_lesson_id',v_redirect_lesson_id,'course_id',v_target.course_id,'module_id',v_target.module_id);
  end if;
  with module_ordered as (
    select m.id,m.title,row_number() over(order by coalesce(m.position,m.sort_order,0),m.created_at,m.id) module_rn
    from public.modules m where m.course_id=v_target.course_id
  )
  select mo.id,mo.title,mo.module_rn into v_blocking_module from module_ordered mo
  where mo.module_rn<v_target.module_rn and not public.ghc_internal_student_module_complete(p_user_id,mo.id)
  order by mo.module_rn limit 1;
  if v_blocking_module.id is not null then
    select l.id into v_redirect_lesson_id from public.lessons l where l.module_id=v_blocking_module.id
    order by coalesce(l.sort_order,0) desc,l.created_at desc,l.id desc limit 1;
    return jsonb_build_object('allowed',false,'reason','Completa el módulo anterior antes de continuar.','redirect_lesson_id',v_redirect_lesson_id,'course_id',v_target.course_id,'module_id',v_target.module_id);
  end if;
  return jsonb_build_object('allowed',true,'completed',false,'course_id',v_target.course_id,'module_id',v_target.module_id,'lesson_rn',v_target.lesson_rn,'module_rn',v_target.module_rn,'commercial_max_module_order',v_max_module);
end;
$$;

create or replace function public.ghc_guard_exam_attempt_insert()
returns trigger
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare
  v_exam public.exams;
  v_effective_user uuid:=coalesce(new.user_id,auth.uid());
  v_access jsonb;
  v_commercial jsonb;
  v_module_order integer;
  v_max integer;
begin
  select * into v_exam from public.exams e where e.id=new.exam_id;
  if v_exam.id is null then raise exception 'No existe el examen indicado.'; end if;
  if v_exam.status<>'published' then raise exception 'El examen no está publicado.'; end if;
  if new.course_id is distinct from v_exam.course_id then raise exception 'El curso del intento no coincide con el examen.'; end if;
  if not public.ghc_has_course_access_for_user(v_effective_user,v_exam.course_id) then raise exception 'No tienes una matrícula activa para este curso.'; end if;
  v_commercial:=private.ghc_course_commercial_state(v_effective_user,v_exam.course_id);
  if v_exam.exam_scope='lesson' then
    if v_exam.lesson_id is null then raise exception 'El examen de lección no tiene lección asociada.'; end if;
    v_access:=public.ghc_internal_student_lesson_access(v_effective_user,v_exam.lesson_id);
    if not coalesce((v_access->>'allowed')::boolean,false) then raise exception '%',coalesce(v_access->>'reason','La lección está bloqueada.'); end if;
  elsif v_exam.exam_scope='module' then
    if v_exam.module_id is null then raise exception 'El examen de módulo no tiene módulo asociado.'; end if;
    select module_rn::integer into v_module_order from (
      select m.id,row_number() over(order by coalesce(m.position,m.sort_order,0),m.created_at,m.id) module_rn
      from public.modules m where m.course_id=v_exam.course_id
    ) x where id=v_exam.module_id;
    v_max:=nullif(v_commercial->>'max_module_order','')::integer;
    if (v_commercial->>'commercial_order_id') is not null and not coalesce((v_commercial->>'fully_paid')::boolean,false)
       and v_max is not null and v_module_order>v_max then
      raise exception 'Este examen pertenece a un tramo todavía no cubierto por tus pagos confirmados.';
    end if;
    if exists(select 1 from public.lessons l where l.module_id=v_exam.module_id and not exists(select 1 from public.lesson_progress lp where lp.user_id=v_effective_user and lp.lesson_id=l.id and lp.completed=true)) then
      raise exception 'Completa todas las lecciones del módulo antes de realizar su examen.';
    end if;
  elsif v_exam.exam_scope='course' then
    if not coalesce((v_commercial->>'fully_paid')::boolean,false) then
      raise exception 'El examen final se desbloquea cuando el precio total del curso está satisfecho.';
    end if;
    if exists(select 1 from public.modules m where m.course_id=v_exam.course_id and not public.ghc_internal_student_module_complete(v_effective_user,m.id)) then
      raise exception 'Completa todos los módulos antes de realizar el examen final.';
    end if;
  else
    raise exception 'Tipo de examen no permitido en el flujo de alumno.';
  end if;
  return new;
end;
$$;

create or replace function public.ghc_student_get_published_course_exam(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare
  v_user_id uuid:=auth.uid();
  v_exam public.exams;
  v_questions jsonb:='[]'::jsonb;
  v_attempt_count integer:=0;
  v_best_score integer:=null;
  v_has_passed boolean:=false;
  v_certificate jsonb:=null;
  v_module_count integer:=0;
  v_completed_module_count integer:=0;
  v_unlocked boolean:=false;
  v_payment_complete boolean:=false;
  v_commercial jsonb;
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión como alumno.'; end if;
  if p_course_id is null then raise exception 'course_id es obligatorio.'; end if;
  if not public.ghc_has_course_access_for_user(v_user_id,p_course_id) then raise exception 'No tienes una matrícula activa para este curso.'; end if;
  v_commercial:=private.ghc_course_commercial_state(v_user_id,p_course_id);
  v_payment_complete:=coalesce((v_commercial->>'fully_paid')::boolean,false);
  select count(*)::integer into v_module_count from public.modules m where m.course_id=p_course_id;
  select count(*)::integer into v_completed_module_count from public.modules m where m.course_id=p_course_id and public.ghc_internal_student_module_complete(v_user_id,m.id);
  v_unlocked:=v_module_count>0 and v_completed_module_count=v_module_count and v_payment_complete;
  select * into v_exam from public.exams e where e.course_id=p_course_id and e.exam_scope='course' and e.status='published' order by e.published_at desc nulls last,e.created_at desc limit 1;
  if v_exam.id is null then
    return jsonb_build_object('exam',null,'questions','[]'::jsonb,'unlocked',false,'payment_complete',v_payment_complete,'module_count',v_module_count,'completed_module_count',v_completed_module_count,'attempt_count',0,'best_score',null,'has_passed',false,'certificate',null);
  end if;
  select count(*)::integer,max(ea.score)::integer,bool_or(coalesce(ea.passed,false)) into v_attempt_count,v_best_score,v_has_passed from public.exam_attempts ea where ea.user_id=v_user_id and ea.exam_id=v_exam.id;
  select jsonb_build_object('id',c.id,'certificate_code',c.certificate_code,'verification_slug',c.verification_slug,'status',c.status,'issued_at',c.issued_at) into v_certificate
  from public.certificates c where c.user_id=v_user_id and c.course_id=p_course_id and c.status='valid' order by c.issued_at desc limit 1;
  if not v_unlocked and not coalesce(v_has_passed,false) then
    return jsonb_build_object('exam',null,'questions','[]'::jsonb,'unlocked',false,'payment_complete',v_payment_complete,
      'lock_reason',case when not v_payment_complete then 'El examen final se desbloqueará cuando el curso esté pagado por completo.' else 'Completa todos los módulos antes de realizar el examen final.' end,
      'module_count',v_module_count,'completed_module_count',v_completed_module_count,'attempt_count',coalesce(v_attempt_count,0),'best_score',v_best_score,'has_passed',coalesce(v_has_passed,false),'certificate',v_certificate);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'exam_id',q.exam_id,'question',q.question,'question_type',q.question_type,'difficulty',q.difficulty,'evaluated_objective',q.evaluated_objective,'sort_order',q.sort_order,
    'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'text',o.option_text,'sort_order',o.sort_order) order by o.sort_order) from public.exam_question_options o where o.question_id=q.id),
      (select coalesce(jsonb_agg(jsonb_build_object('id',null,'label',x.label,'text',x.option_text,'sort_order',x.ord) order by x.ord),'[]'::jsonb) from (values('A',q.option_a,1),('B',q.option_b,2),('C',q.option_c,3),('D',q.option_d,4)) x(label,option_text,ord) where nullif(trim(coalesce(x.option_text,'')),'') is not null))
  ) order by q.sort_order,q.created_at,q.id),'[]'::jsonb) into v_questions
  from public.exam_questions q where q.exam_id=v_exam.id and q.is_active=true and q.question_status in ('approved','edited');
  return jsonb_build_object('exam',jsonb_build_object('id',v_exam.id,'course_id',v_exam.course_id,'title',v_exam.title,'description',v_exam.description,'exam_scope',v_exam.exam_scope,'pass_percentage',coalesce(v_exam.pass_percentage,v_exam.pass_score,v_exam.passing_score,70),'attempts_mode',coalesce(v_exam.attempts_mode,'unlimited'),'max_attempts',v_exam.max_attempts),
    'questions',v_questions,'unlocked',true,'payment_complete',v_payment_complete,'module_count',v_module_count,'completed_module_count',v_completed_module_count,'attempt_count',coalesce(v_attempt_count,0),'best_score',v_best_score,'has_passed',coalesce(v_has_passed,false),'certificate',v_certificate);
end;
$$;

create or replace function public.ghc_guard_certificate_commercial_payment()
returns trigger
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare v_state jsonb;
begin
  if new.status='valid' and new.user_id is not null and new.course_id is not null then
    v_state:=private.ghc_course_commercial_state(new.user_id,new.course_id);
    if (v_state->>'commercial_order_id') is not null and not coalesce((v_state->>'fully_paid')::boolean,false) then
      raise exception 'No se puede emitir un certificado válido mientras exista saldo pendiente del curso.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ghc_guard_certificate_commercial_payment_before on public.certificates;
create trigger ghc_guard_certificate_commercial_payment_before
before insert or update of status,user_id,course_id on public.certificates
for each row execute function public.ghc_guard_certificate_commercial_payment();

revoke execute on function private.ghc_course_commercial_state(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.ghc_guard_certificate_commercial_payment() from public,anon,authenticated;
revoke execute on function public.ghc_guard_exam_attempt_insert() from public,anon,authenticated;
