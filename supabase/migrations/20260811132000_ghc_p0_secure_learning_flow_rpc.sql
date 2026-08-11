-- Secure sequential learning flow for lesson and module exams.

create or replace function public.ghc_internal_student_lesson_access(
  p_user_id uuid,
  p_lesson_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_target record;
  v_completed boolean := false;
  v_missing_lessons integer := 0;
  v_missing_modules integer := 0;
  v_redirect_lesson_id uuid := null;
  v_reason text := null;
begin
  if p_user_id is null or p_lesson_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'Acceso no válido.');
  end if;

  with module_ordered as (
    select m.id, m.course_id,
      row_number() over (
        partition by m.course_id
        order by coalesce(m.position, m.sort_order, 0), m.created_at, m.id
      ) as module_rn
    from public.modules m
  ), lesson_ordered as (
    select l.id as lesson_id, l.module_id, mo.course_id, mo.module_rn,
      row_number() over (
        partition by mo.course_id
        order by mo.module_rn, coalesce(l.sort_order, 0), l.created_at, l.id
      ) as lesson_rn
    from public.lessons l
    join module_ordered mo on mo.id = l.module_id
  )
  select * into v_target
  from lesson_ordered
  where lesson_id = p_lesson_id;

  if v_target.lesson_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'La lección no existe.');
  end if;

  select exists (
    select 1 from public.lesson_progress lp
    where lp.user_id = p_user_id
      and lp.lesson_id = p_lesson_id
      and lp.completed = true
  ) into v_completed;

  if v_completed then
    return jsonb_build_object(
      'allowed', true,
      'completed', true,
      'course_id', v_target.course_id,
      'module_id', v_target.module_id,
      'lesson_rn', v_target.lesson_rn,
      'module_rn', v_target.module_rn
    );
  end if;

  with module_ordered as (
    select m.id, m.course_id,
      row_number() over (
        partition by m.course_id
        order by coalesce(m.position, m.sort_order, 0), m.created_at, m.id
      ) as module_rn
    from public.modules m
    where m.course_id = v_target.course_id
  ), lesson_ordered as (
    select l.id as lesson_id, l.module_id, mo.module_rn,
      row_number() over (
        order by mo.module_rn, coalesce(l.sort_order, 0), l.created_at, l.id
      ) as lesson_rn
    from public.lessons l
    join module_ordered mo on mo.id = l.module_id
  )
  select count(*)::integer into v_missing_lessons
  from lesson_ordered lo
  where lo.lesson_rn < v_target.lesson_rn
    and not exists (
      select 1 from public.lesson_progress lp
      where lp.user_id = p_user_id
        and lp.lesson_id = lo.lesson_id
        and lp.completed = true
    );

  if v_missing_lessons > 0 then
    with module_ordered as (
      select m.id,
        row_number() over (
          order by coalesce(m.position, m.sort_order, 0), m.created_at, m.id
        ) as module_rn
      from public.modules m
      where m.course_id = v_target.course_id
    ), lesson_ordered as (
      select l.id as lesson_id, mo.module_rn,
        row_number() over (
          order by mo.module_rn, coalesce(l.sort_order, 0), l.created_at, l.id
        ) as lesson_rn
      from public.lessons l
      join module_ordered mo on mo.id = l.module_id
    )
    select lo.lesson_id into v_redirect_lesson_id
    from lesson_ordered lo
    where lo.lesson_rn < v_target.lesson_rn
      and not exists (
        select 1 from public.lesson_progress lp
        where lp.user_id = p_user_id
          and lp.lesson_id = lo.lesson_id
          and lp.completed = true
      )
    order by lo.lesson_rn
    limit 1;

    return jsonb_build_object(
      'allowed', false,
      'reason', 'Completa la lección anterior antes de continuar.',
      'redirect_lesson_id', v_redirect_lesson_id,
      'course_id', v_target.course_id,
      'module_id', v_target.module_id
    );
  end if;

  with module_ordered as (
    select m.id,
      row_number() over (
        order by coalesce(m.position, m.sort_order, 0), m.created_at, m.id
      ) as module_rn
    from public.modules m
    where m.course_id = v_target.course_id
  )
  select count(*)::integer into v_missing_modules
  from module_ordered mo
  where mo.module_rn < v_target.module_rn
    and not exists (
      select 1 from public.module_completions mc
      where mc.user_id = p_user_id
        and mc.module_id = mo.id
        and mc.completed = true
    );

  if v_missing_modules > 0 then
    with module_ordered as (
      select m.id,
        row_number() over (
          order by coalesce(m.position, m.sort_order, 0), m.created_at, m.id
        ) as module_rn
      from public.modules m
      where m.course_id = v_target.course_id
    ), blocker as (
      select mo.id, mo.module_rn
      from module_ordered mo
      where mo.module_rn < v_target.module_rn
        and not exists (
          select 1 from public.module_completions mc
          where mc.user_id = p_user_id
            and mc.module_id = mo.id
            and mc.completed = true
        )
      order by mo.module_rn
      limit 1
    )
    select l.id into v_redirect_lesson_id
    from public.lessons l
    join blocker b on b.id = l.module_id
    order by coalesce(l.sort_order, 0) desc, l.created_at desc, l.id desc
    limit 1;

    return jsonb_build_object(
      'allowed', false,
      'reason', 'Supera el examen del módulo anterior antes de continuar.',
      'redirect_lesson_id', v_redirect_lesson_id,
      'course_id', v_target.course_id,
      'module_id', v_target.module_id
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'completed', false,
    'course_id', v_target.course_id,
    'module_id', v_target.module_id,
    'lesson_rn', v_target.lesson_rn,
    'module_rn', v_target.module_rn
  );
end;
$$;

revoke execute on function public.ghc_internal_student_lesson_access(uuid, uuid) from public, anon, authenticated;

create or replace function public.ghc_student_get_lesson_experience(
  p_course_slug text,
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.courses;
  v_lesson public.lessons;
  v_module public.modules;
  v_access jsonb;
  v_lesson_exam public.exams;
  v_module_exam public.exams;
  v_lesson_questions jsonb := '[]'::jsonb;
  v_module_questions jsonb := '[]'::jsonb;
  v_lesson_attempt jsonb := null;
  v_module_attempt jsonb := null;
  v_lesson_attempt_count integer := 0;
  v_module_attempt_count integer := 0;
  v_module_ready boolean := false;
  v_modules jsonb := '[]'::jsonb;
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión como alumno.'; end if;

  select * into v_course from public.courses c where c.slug = p_course_slug limit 1;
  if v_course.id is null then raise exception 'No se encontró el curso.'; end if;

  select l.* into v_lesson
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id and m.course_id = v_course.id
  limit 1;
  if v_lesson.id is null then raise exception 'La lección no pertenece a este curso.'; end if;

  select * into v_module from public.modules where id = v_lesson.module_id;
  v_access := public.ghc_internal_student_lesson_access(v_user_id, v_lesson.id);

  if not coalesce((v_access ->> 'allowed')::boolean, false) then
    return jsonb_build_object(
      'allowed', false,
      'reason', v_access ->> 'reason',
      'redirect_lesson_id', v_access ->> 'redirect_lesson_id',
      'course', jsonb_build_object('id', v_course.id, 'title', v_course.title, 'slug', v_course.slug)
    );
  end if;

  insert into public.lesson_progress (
    user_id, course_id, module_id, lesson_id, completed, last_opened_at, created_at
  ) values (
    v_user_id, v_course.id, v_lesson.module_id, v_lesson.id, false, now(), now()
  )
  on conflict (user_id, lesson_id)
  do update set
    last_opened_at = excluded.last_opened_at,
    course_id = excluded.course_id,
    module_id = excluded.module_id;

  select count(*)::integer into v_total_lessons
  from public.lessons l join public.modules m on m.id = l.module_id
  where m.course_id = v_course.id;

  select count(*)::integer into v_completed_lessons
  from public.lesson_progress lp
  where lp.user_id = v_user_id and lp.course_id = v_course.id and lp.completed = true;

  select coalesce(jsonb_agg(module_json order by module_order), '[]'::jsonb)
  into v_modules
  from (
    select coalesce(m.position, m.sort_order, 0) as module_order,
      jsonb_build_object(
        'id', m.id,
        'title', m.title,
        'description', m.description,
        'completed', exists (
          select 1 from public.module_completions mc
          where mc.user_id = v_user_id and mc.module_id = m.id and mc.completed = true
        ),
        'lessons', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', l.id,
              'title', l.title,
              'content_type', coalesce(l.content_type, l.type, 'text'),
              'duration_minutes', l.duration_minutes,
              'completed', exists (
                select 1 from public.lesson_progress lp
                where lp.user_id = v_user_id and lp.lesson_id = l.id and lp.completed = true
              ),
              'accessible', coalesce((public.ghc_internal_student_lesson_access(v_user_id, l.id) ->> 'allowed')::boolean, false)
            ) order by coalesce(l.sort_order, 0), l.created_at, l.id
          ) from public.lessons l where l.module_id = m.id
        ), '[]'::jsonb)
      ) as module_json
    from public.modules m where m.course_id = v_course.id
  ) s;

  select e.* into v_lesson_exam
  from public.exams e
  where e.course_id = v_course.id and e.lesson_id = v_lesson.id
    and e.exam_scope = 'lesson' and e.status = 'published'
  order by e.published_at desc nulls last, e.created_at desc limit 1;

  if v_lesson_exam.id is not null then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', q.id, 'question', q.question, 'question_type', q.question_type,
        'sort_order', q.sort_order,
        'options', coalesce(
          (select jsonb_agg(jsonb_build_object('value', o.label, 'text', o.option_text)
             order by o.sort_order, o.created_at, o.id)
           from public.exam_question_options o where o.question_id = q.id),
          (select jsonb_agg(jsonb_build_object('value', x.label, 'text', x.option_text) order by x.ord)
           from (values ('A',q.option_a,1),('B',q.option_b,2),('C',q.option_c,3),('D',q.option_d,4)) x(label,option_text,ord)
           where nullif(trim(coalesce(x.option_text,'')),'') is not null)
        )
      ) order by q.sort_order, q.created_at, q.id
    ), '[]'::jsonb) into v_lesson_questions
    from public.exam_questions q
    where q.exam_id = v_lesson_exam.id and q.is_active = true;

    select count(*)::integer into v_lesson_attempt_count
    from public.exam_attempts ea where ea.user_id = v_user_id and ea.exam_id = v_lesson_exam.id;

    select jsonb_build_object(
      'id',ea.id,'score',ea.score,'total_questions',ea.total_questions,
      'correct_answers',ea.correct_answers,'passed',ea.passed,'completed_at',ea.completed_at
    ) into v_lesson_attempt
    from public.exam_attempts ea
    where ea.user_id=v_user_id and ea.exam_id=v_lesson_exam.id
    order by ea.completed_at desc nulls last, ea.created_at desc limit 1;
  end if;

  select count(*) = 0 into v_module_ready
  from public.lessons l
  where l.module_id = v_module.id
    and not exists (
      select 1 from public.lesson_progress lp
      where lp.user_id=v_user_id and lp.lesson_id=l.id and lp.completed=true
    );

  select e.* into v_module_exam
  from public.exams e
  where e.course_id=v_course.id and e.module_id=v_module.id
    and e.exam_scope='module' and e.status='published'
  order by e.published_at desc nulls last,e.created_at desc limit 1;

  if v_module_exam.id is not null then
    select count(*)::integer into v_module_attempt_count
    from public.exam_attempts ea where ea.user_id=v_user_id and ea.exam_id=v_module_exam.id;

    select jsonb_build_object(
      'id',ea.id,'score',ea.score,'total_questions',ea.total_questions,
      'correct_answers',ea.correct_answers,'passed',ea.passed,'completed_at',ea.completed_at
    ) into v_module_attempt
    from public.exam_attempts ea
    where ea.user_id=v_user_id and ea.exam_id=v_module_exam.id
    order by ea.completed_at desc nulls last,ea.created_at desc limit 1;

    if v_module_ready then
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',q.id,'question',q.question,'question_type',q.question_type,'sort_order',q.sort_order,
          'options',coalesce(
            (select jsonb_agg(jsonb_build_object('value',o.label,'text',o.option_text)
               order by o.sort_order,o.created_at,o.id)
             from public.exam_question_options o where o.question_id=q.id),
            (select jsonb_agg(jsonb_build_object('value',x.label,'text',x.option_text) order by x.ord)
             from (values ('A',q.option_a,1),('B',q.option_b,2),('C',q.option_c,3),('D',q.option_d,4)) x(label,option_text,ord)
             where nullif(trim(coalesce(x.option_text,'')),'') is not null)
          )
        ) order by q.sort_order,q.created_at,q.id
      ),'[]'::jsonb) into v_module_questions
      from public.exam_questions q
      where q.exam_id=v_module_exam.id and q.is_active=true;
    end if;
  end if;

  return jsonb_build_object(
    'allowed',true,
    'course',jsonb_build_object('id',v_course.id,'title',v_course.title,'slug',v_course.slug),
    'module',jsonb_build_object(
      'id',v_module.id,'title',v_module.title,'description',v_module.description,
      'completed',exists(select 1 from public.module_completions mc where mc.user_id=v_user_id and mc.module_id=v_module.id and mc.completed=true)
    ),
    'lesson',jsonb_build_object(
      'id',v_lesson.id,'module_id',v_lesson.module_id,'title',v_lesson.title,
      'content_type',coalesce(v_lesson.content_type,v_lesson.type,'text'),
      'content',v_lesson.content,'video_path',v_lesson.video_url,'audio_path',v_lesson.audio_url,
      'manual_path',v_lesson.pdf_url,'duration_minutes',v_lesson.duration_minutes,
      'completed',exists(select 1 from public.lesson_progress lp where lp.user_id=v_user_id and lp.lesson_id=v_lesson.id and lp.completed=true)
    ),
    'modules',v_modules,
    'progress',jsonb_build_object(
      'completed_lessons',v_completed_lessons,'total_lessons',v_total_lessons,
      'percent',case when v_total_lessons>0 then round(v_completed_lessons::numeric*100/v_total_lessons)::integer else 0 end
    ),
    'lesson_exam',case when v_lesson_exam.id is null then null else jsonb_build_object(
      'id',v_lesson_exam.id,'title',v_lesson_exam.title,'description',v_lesson_exam.description,
      'pass_percentage',coalesce(v_lesson_exam.pass_percentage,v_lesson_exam.pass_score,v_lesson_exam.passing_score,70),
      'attempts_mode',v_lesson_exam.attempts_mode,'max_attempts',v_lesson_exam.max_attempts,
      'block_advance',coalesce(v_lesson_exam.block_advance,true),'attempt_count',v_lesson_attempt_count,
      'latest_attempt',v_lesson_attempt,'questions',v_lesson_questions
    ) end,
    'module_exam',case when v_module_exam.id is null then null else jsonb_build_object(
      'id',v_module_exam.id,'title',v_module_exam.title,'description',v_module_exam.description,
      'pass_percentage',coalesce(v_module_exam.pass_percentage,v_module_exam.pass_score,v_module_exam.passing_score,70),
      'attempts_mode',v_module_exam.attempts_mode,'max_attempts',v_module_exam.max_attempts,
      'block_advance',coalesce(v_module_exam.block_advance,true),'unlocked',v_module_ready,
      'attempt_count',v_module_attempt_count,'latest_attempt',v_module_attempt,
      'questions',case when v_module_ready then v_module_questions else '[]'::jsonb end
    ) end
  );
end;
$$;

revoke execute on function public.ghc_student_get_lesson_experience(text,uuid) from public,anon;
grant execute on function public.ghc_student_get_lesson_experience(text,uuid) to authenticated;

create or replace function public.ghc_student_complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_lesson public.lessons;
  v_module public.modules;
  v_access jsonb;
  v_exam public.exams;
  v_has_questions boolean:=false;
  v_has_passed boolean:=false;
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión como alumno.'; end if;
  select * into v_lesson from public.lessons where id=p_lesson_id;
  if v_lesson.id is null then raise exception 'La lección no existe.'; end if;
  select * into v_module from public.modules where id=v_lesson.module_id;
  if v_module.id is null then raise exception 'El módulo no existe.'; end if;

  v_access:=public.ghc_internal_student_lesson_access(v_user_id,p_lesson_id);
  if not coalesce((v_access->>'allowed')::boolean,false) then
    raise exception '%',coalesce(v_access->>'reason','La lección está bloqueada.');
  end if;

  select e.* into v_exam from public.exams e
  where e.lesson_id=p_lesson_id and e.exam_scope='lesson' and e.status='published'
  order by e.published_at desc nulls last,e.created_at desc limit 1;

  if v_exam.id is not null then
    select exists(select 1 from public.exam_questions q where q.exam_id=v_exam.id and q.is_active=true) into v_has_questions;
    if v_has_questions and coalesce(v_exam.block_advance,true) then
      select exists(select 1 from public.exam_attempts ea where ea.user_id=v_user_id and ea.exam_id=v_exam.id and ea.passed=true) into v_has_passed;
      if not v_has_passed then raise exception 'Supera la evaluación de esta lección antes de marcarla como completada.'; end if;
    end if;
  end if;

  insert into public.lesson_progress(user_id,course_id,module_id,lesson_id,completed,completed_at,last_opened_at,created_at)
  values(v_user_id,v_module.course_id,v_module.id,v_lesson.id,true,now(),now(),now())
  on conflict(user_id,lesson_id) do update set
    course_id=excluded.course_id,module_id=excluded.module_id,completed=true,
    completed_at=coalesce(public.lesson_progress.completed_at,excluded.completed_at),last_opened_at=excluded.last_opened_at;

  return jsonb_build_object('completed',true,'lesson_id',v_lesson.id);
end;
$$;
revoke execute on function public.ghc_student_complete_lesson(uuid) from public,anon;
grant execute on function public.ghc_student_complete_lesson(uuid) to authenticated;

create or replace function public.ghc_student_submit_learning_exam(p_exam_id uuid,p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_exam public.exams;
  v_total_questions integer:=0;
  v_answered_questions integer:=0;
  v_correct_answers integer:=0;
  v_score integer:=0;
  v_pass_percentage integer:=70;
  v_passed boolean:=false;
  v_attempt_count integer:=0;
  v_attempt public.exam_attempts;
  v_access jsonb;
  v_missing_lessons integer:=0;
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión como alumno.'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'object' then raise exception 'Las respuestas deben enviarse como un objeto JSON.'; end if;

  select e.* into v_exam from public.exams e
  where e.id=p_exam_id and e.status='published' and e.exam_scope in('lesson','module');
  if v_exam.id is null then raise exception 'El examen no existe, no está publicado o no pertenece al flujo de aprendizaje.'; end if;

  if v_exam.exam_scope='lesson' then
    if v_exam.lesson_id is null then raise exception 'El examen de lección no tiene lección asociada.'; end if;
    v_access:=public.ghc_internal_student_lesson_access(v_user_id,v_exam.lesson_id);
    if not coalesce((v_access->>'allowed')::boolean,false) then raise exception '%',coalesce(v_access->>'reason','La lección está bloqueada.'); end if;
  else
    if v_exam.module_id is null then raise exception 'El examen de módulo no tiene módulo asociado.'; end if;
    select count(*)::integer into v_missing_lessons from public.lessons l
    where l.module_id=v_exam.module_id and not exists(
      select 1 from public.lesson_progress lp where lp.user_id=v_user_id and lp.lesson_id=l.id and lp.completed=true
    );
    if v_missing_lessons>0 then raise exception 'Completa todas las lecciones del módulo antes de realizar su examen.'; end if;
  end if;

  select count(*)::integer into v_total_questions from public.exam_questions q where q.exam_id=v_exam.id and q.is_active=true;
  if v_total_questions<=0 then raise exception 'El examen no tiene preguntas activas.'; end if;

  select count(*)::integer into v_answered_questions
  from public.exam_questions q join jsonb_each_text(p_answers) supplied on supplied.key=q.id::text
  where q.exam_id=v_exam.id and q.is_active=true and upper(trim(supplied.value)) in('A','B','C','D','E','F');
  if v_answered_questions<>v_total_questions then raise exception 'Debes responder todas las preguntas. Respondidas: %, total: %.',v_answered_questions,v_total_questions; end if;

  select count(*)::integer into v_attempt_count from public.exam_attempts ea where ea.user_id=v_user_id and ea.exam_id=v_exam.id;
  if coalesce(v_exam.attempts_mode,'unlimited')='limited' and v_exam.max_attempts is not null and v_attempt_count>=v_exam.max_attempts then
    raise exception 'Has agotado el número máximo de intentos configurado para este examen.';
  end if;

  with evaluated as(
    select q.id as question_id,upper(trim(supplied.value)) as selected_label,
      coalesce((select upper(trim(o.label)) from public.exam_question_options o where o.question_id=q.id and o.is_correct=true order by o.sort_order,o.created_at,o.id limit 1),upper(trim(q.correct_option))) as correct_label
    from public.exam_questions q join jsonb_each_text(p_answers) supplied on supplied.key=q.id::text
    where q.exam_id=v_exam.id and q.is_active=true
  )
  select count(*) filter(where selected_label=correct_label)::integer into v_correct_answers from evaluated;

  v_score:=round((v_correct_answers::numeric/v_total_questions::numeric)*100)::integer;
  v_pass_percentage:=coalesce(v_exam.pass_percentage,v_exam.pass_score,v_exam.passing_score,70);
  v_passed:=v_score>=v_pass_percentage;

  insert into public.exam_attempts(user_id,course_id,exam_id,score,total_questions,correct_answers,passed,answers,started_at,completed_at,created_at)
  values(v_user_id,v_exam.course_id,v_exam.id,v_score,v_total_questions,v_correct_answers,v_passed,p_answers,now(),now(),now()) returning * into v_attempt;

  insert into public.exam_attempt_answers(attempt_id,exam_id,question_id,selected_option_id,selected_option_label,selected_answer_text,is_correct,points_awarded,created_at)
  select v_attempt.id,v_exam.id,q.id,selected_option.id,upper(trim(supplied.value)),
    coalesce(selected_option.option_text,case upper(trim(supplied.value)) when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d else null end),
    upper(trim(supplied.value))=coalesce((select upper(trim(correct_option.label)) from public.exam_question_options correct_option where correct_option.question_id=q.id and correct_option.is_correct=true order by correct_option.sort_order,correct_option.created_at,correct_option.id limit 1),upper(trim(q.correct_option))),
    case when upper(trim(supplied.value))=coalesce((select upper(trim(correct_option.label)) from public.exam_question_options correct_option where correct_option.question_id=q.id and correct_option.is_correct=true order by correct_option.sort_order,correct_option.created_at,correct_option.id limit 1),upper(trim(q.correct_option))) then 1 else 0 end,
    now()
  from public.exam_questions q
  join jsonb_each_text(p_answers) supplied on supplied.key=q.id::text
  left join public.exam_question_options selected_option on selected_option.question_id=q.id and upper(trim(selected_option.label))=upper(trim(supplied.value))
  where q.exam_id=v_exam.id and q.is_active=true;

  if v_passed and v_exam.exam_scope='lesson' then
    insert into public.lesson_progress(user_id,course_id,module_id,lesson_id,completed,completed_at,last_opened_at,created_at)
    values(v_user_id,v_exam.course_id,v_exam.module_id,v_exam.lesson_id,true,now(),now(),now())
    on conflict(user_id,lesson_id) do update set course_id=excluded.course_id,module_id=excluded.module_id,completed=true,
      completed_at=coalesce(public.lesson_progress.completed_at,excluded.completed_at),last_opened_at=excluded.last_opened_at;
  end if;

  if v_passed and v_exam.exam_scope='module' then
    insert into public.module_completions(user_id,course_id,module_id,exam_id,exam_attempt_id,completed,final_score,completed_at,created_at,updated_at)
    values(v_user_id,v_exam.course_id,v_exam.module_id,v_exam.id,v_attempt.id,true,v_score,now(),now(),now())
    on conflict(user_id,module_id) do update set course_id=excluded.course_id,exam_id=excluded.exam_id,exam_attempt_id=excluded.exam_attempt_id,
      completed=true,final_score=excluded.final_score,completed_at=excluded.completed_at,updated_at=excluded.updated_at;
  end if;

  return jsonb_build_object(
    'attempt_id',v_attempt.id,'exam_id',v_exam.id,'exam_scope',v_exam.exam_scope,'score',v_score,
    'total_questions',v_total_questions,'correct_answers',v_correct_answers,'passed',v_passed,
    'pass_percentage',v_pass_percentage,'attempt_number',v_attempt_count+1,'attempts_mode',v_exam.attempts_mode,
    'max_attempts',v_exam.max_attempts,'lesson_completed',(v_passed and v_exam.exam_scope='lesson'),
    'module_completed',(v_passed and v_exam.exam_scope='module')
  );
end;
$$;
revoke execute on function public.ghc_student_submit_learning_exam(uuid,jsonb) from public,anon;
grant execute on function public.ghc_student_submit_learning_exam(uuid,jsonb) to authenticated;
