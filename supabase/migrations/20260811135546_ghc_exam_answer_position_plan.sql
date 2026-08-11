create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists private.ghc_exam_answer_position_plan (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_sort_order integer not null check (question_sort_order > 0),
  correct_label text not null check (correct_label in ('A','B','C','D','E','F')),
  created_at timestamptz not null default now(),
  primary key (exam_id, question_sort_order)
);

revoke all on private.ghc_exam_answer_position_plan from public, anon, authenticated;

create or replace function private.ghc_prepare_exam_answer_position_plan(p_exam_id uuid)
returns void
language plpgsql
security invoker
set search_path to 'public','private'
as $function$
declare
  v_total integer;
  v_option_count integer;
  v_existing integer;
  v_base integer;
  v_extra integer;
  v_labels text[];
  v_extra_labels text[];
  v_remaining jsonb := '{}'::jsonb;
  v_label text;
  v_position integer;
  v_last_1 text := null;
  v_last_2 text := null;
  v_choice text;
  v_count integer;
begin
  select
    greatest(1, coalesce(e.requested_question_count, 10)),
    greatest(2, least(6, coalesce(e.answer_count, 4)))
  into v_total, v_option_count
  from public.exams e
  where e.id = p_exam_id;

  if v_total is null then
    raise exception 'No existe el examen para preparar el plan de respuestas.';
  end if;

  select count(*)::integer
  into v_existing
  from private.ghc_exam_answer_position_plan p
  where p.exam_id = p_exam_id;

  if v_existing = v_total then
    return;
  end if;

  delete from private.ghc_exam_answer_position_plan where exam_id = p_exam_id;

  v_labels := (array['A','B','C','D','E','F']::text[])[1:v_option_count];
  v_base := floor(v_total::numeric / v_option_count::numeric)::integer;
  v_extra := mod(v_total, v_option_count);

  select coalesce(array_agg(label order by rnd), array[]::text[])
  into v_extra_labels
  from (
    select label, random() as rnd
    from unnest(v_labels) as label
  ) s;

  foreach v_label in array v_labels
  loop
    v_count := v_base + case when array_position(v_extra_labels[1:v_extra], v_label) is not null then 1 else 0 end;
    v_remaining := jsonb_set(v_remaining, array[v_label], to_jsonb(v_count), true);
  end loop;

  for v_position in 1..v_total
  loop
    select c.label
    into v_choice
    from (
      select label
      from unnest(v_labels) as label
      where coalesce((v_remaining ->> label)::integer, 0) > 0
        and not (v_last_1 = label and v_last_2 = label)
      order by random()
      limit 1
    ) c;

    if v_choice is null then
      select c.label
      into v_choice
      from (
        select label
        from unnest(v_labels) as label
        where coalesce((v_remaining ->> label)::integer, 0) > 0
        order by random()
        limit 1
      ) c;
    end if;

    if v_choice is null then
      raise exception 'No se pudo completar el plan de posiciones correctas.';
    end if;

    insert into private.ghc_exam_answer_position_plan(exam_id, question_sort_order, correct_label)
    values (p_exam_id, v_position, v_choice);

    v_count := coalesce((v_remaining ->> v_choice)::integer, 0) - 1;
    v_remaining := jsonb_set(v_remaining, array[v_choice], to_jsonb(v_count), true);
    v_last_2 := v_last_1;
    v_last_1 := v_choice;
  end loop;
end;
$function$;

revoke all on function private.ghc_prepare_exam_answer_position_plan(uuid) from public, anon, authenticated;

create or replace function public.ghc_admin_create_ai_question_with_options(
  p_blueprint_id uuid,
  p_exam_id uuid,
  p_ai_generation_id uuid,
  p_question text,
  p_question_type text default 'test'::text,
  p_options jsonb default '[]'::jsonb,
  p_correct_label text default 'A'::text,
  p_sort_order integer default 1,
  p_explanation text default null::text,
  p_difficulty text default 'mixed'::text,
  p_evaluated_objective text default null::text,
  p_source_course_id uuid default null::uuid,
  p_source_module_id uuid default null::uuid,
  p_source_lesson_id uuid default null::uuid,
  p_regenerated_from_question_id uuid default null::uuid
)
returns public.exam_questions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_question public.exam_questions;
  v_option_count integer;
  v_correct_count integer;
  v_correct_text text;
  v_incorrect_texts text[];
  v_allowed_labels text[];
  v_target_label text;
  v_shuffled_options jsonb := '[]'::jsonb;
  v_incorrect_index integer := 1;
  v_label text;
  v_option_text text;
  v_option record;
  v_option_a text;
  v_option_b text;
  v_option_c text;
  v_option_d text;
  v_question_type text;
  v_difficulty text;
begin
  if not public.ghc_is_admin() then
    raise exception 'GHC admin permission required';
  end if;

  if p_blueprint_id is null then raise exception 'blueprint_id es obligatorio.'; end if;
  if p_exam_id is null then raise exception 'exam_id es obligatorio.'; end if;
  if nullif(trim(coalesce(p_question, '')), '') is null then raise exception 'La pregunta es obligatoria.'; end if;
  if jsonb_typeof(coalesce(p_options, '[]'::jsonb)) <> 'array' then raise exception 'options debe ser un array JSON.'; end if;

  select count(*)::integer into v_option_count
  from jsonb_to_recordset(p_options) as opt(label text, option_text text, is_correct boolean)
  where nullif(trim(coalesce(opt.option_text, '')), '') is not null;

  if v_option_count < 2 or v_option_count > 6 then raise exception 'Cada pregunta debe tener entre 2 y 6 opciones no vacías.'; end if;
  if v_option_count <> jsonb_array_length(p_options) then raise exception 'Todas las opciones deben contener texto.'; end if;

  select count(*)::integer into v_correct_count
  from jsonb_to_recordset(p_options) as opt(label text, option_text text, is_correct boolean)
  where coalesce(opt.is_correct, false) = true;

  if v_correct_count <> 1 then raise exception 'Cada pregunta debe tener exactamente una opción correcta.'; end if;

  select trim(opt.option_text) into v_correct_text
  from jsonb_to_recordset(p_options) as opt(label text, option_text text, is_correct boolean)
  where coalesce(opt.is_correct, false) = true limit 1;

  select array_agg(trim(opt.option_text) order by random()) into v_incorrect_texts
  from jsonb_to_recordset(p_options) as opt(label text, option_text text, is_correct boolean)
  where coalesce(opt.is_correct, false) = false;

  v_allowed_labels := (array['A','B','C','D','E','F']::text[])[1:v_option_count];

  perform private.ghc_prepare_exam_answer_position_plan(p_exam_id);

  select p.correct_label into v_target_label
  from private.ghc_exam_answer_position_plan p
  where p.exam_id = p_exam_id
    and p.question_sort_order = greatest(1, coalesce(p_sort_order, 1));

  if v_target_label is null or not (v_target_label = any(v_allowed_labels)) then
    select label into v_target_label from unnest(v_allowed_labels) as label order by random() limit 1;
  end if;

  foreach v_label in array v_allowed_labels
  loop
    if v_label = v_target_label then
      v_option_text := v_correct_text;
    else
      v_option_text := v_incorrect_texts[v_incorrect_index];
      v_incorrect_index := v_incorrect_index + 1;
    end if;

    v_shuffled_options := v_shuffled_options || jsonb_build_array(jsonb_build_object(
      'label', v_label,
      'option_text', v_option_text,
      'is_correct', v_label = v_target_label
    ));
  end loop;

  select opt.option_text into v_option_a from jsonb_to_recordset(v_shuffled_options) as opt(label text, option_text text, is_correct boolean) where opt.label='A' limit 1;
  select opt.option_text into v_option_b from jsonb_to_recordset(v_shuffled_options) as opt(label text, option_text text, is_correct boolean) where opt.label='B' limit 1;
  select opt.option_text into v_option_c from jsonb_to_recordset(v_shuffled_options) as opt(label text, option_text text, is_correct boolean) where opt.label='C' limit 1;
  select opt.option_text into v_option_d from jsonb_to_recordset(v_shuffled_options) as opt(label text, option_text text, is_correct boolean) where opt.label='D' limit 1;

  v_question_type := lower(coalesce(p_question_type, 'test'));
  if v_question_type not in ('test','true_false','case_option') then v_question_type := 'test'; end if;

  v_difficulty := lower(coalesce(p_difficulty, 'mixed'));
  if v_difficulty not in ('basic','medium','advanced','mixed') then v_difficulty := 'mixed'; end if;

  insert into public.exam_questions(
    exam_id, question, option_a, option_b, option_c, option_d, correct_option,
    sort_order, explanation, question_type, blueprint_id, source_course_id,
    source_module_id, source_lesson_id, question_status, difficulty,
    evaluated_objective, ai_generation_id, regenerated_from_question_id,
    is_active, created_at, updated_at
  ) values (
    p_exam_id, trim(p_question), nullif(trim(coalesce(v_option_a,'')),''),
    nullif(trim(coalesce(v_option_b,'')),''), nullif(trim(coalesce(v_option_c,'')),''),
    nullif(trim(coalesce(v_option_d,'')),''),
    case when v_target_label in ('A','B','C','D') then v_target_label else null end,
    coalesce(p_sort_order,1), nullif(trim(coalesce(p_explanation,'')),''),
    v_question_type, p_blueprint_id, p_source_course_id, p_source_module_id,
    p_source_lesson_id, 'draft_ai', v_difficulty,
    nullif(trim(coalesce(p_evaluated_objective,'')),''), p_ai_generation_id,
    p_regenerated_from_question_id, true, now(), now()
  ) returning * into v_question;

  for v_option in
    select * from jsonb_to_recordset(v_shuffled_options) as opt(label text, option_text text, is_correct boolean)
  loop
    insert into public.exam_question_options(question_id,label,option_text,is_correct,sort_order,created_at,updated_at)
    values(
      v_question.id, v_option.label, trim(v_option.option_text), coalesce(v_option.is_correct,false),
      case v_option.label when 'A' then 1 when 'B' then 2 when 'C' then 3 when 'D' then 4 when 'E' then 5 when 'F' then 6 else 99 end,
      now(), now()
    )
    on conflict(question_id,label) do update set
      option_text=excluded.option_text,
      is_correct=excluded.is_correct,
      sort_order=excluded.sort_order,
      updated_at=now();
  end loop;

  return v_question;
end;
$function$;

revoke all on function public.ghc_admin_create_ai_question_with_options(uuid,uuid,uuid,text,text,jsonb,text,integer,text,text,text,uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.ghc_admin_create_ai_question_with_options(uuid,uuid,uuid,text,text,jsonb,text,integer,text,text,text,uuid,uuid,uuid,uuid) to authenticated;
