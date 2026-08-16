do $$
declare
  idx text;
  expected_indexes text[] := array[
    'ghc_exam_attempts_user_fk_idx',
    'ghc_exam_attempts_course_fk_idx',
    'ghc_exam_attempts_exam_fk_idx',
    'ghc_exam_attempt_answers_selected_option_fk_idx',
    'ghc_course_completions_exam_fk_idx',
    'ghc_course_completions_exam_attempt_fk_idx',
    'ghc_module_completions_exam_fk_idx',
    'ghc_module_completions_exam_attempt_fk_idx',
    'ghc_modules_course_fk_idx',
    'ghc_lessons_module_fk_idx',
    'ghc_exams_lesson_fk_idx',
    'ghc_lesson_media_assets_module_fk_idx',
    'ghc_lesson_progress_course_fk_idx',
    'ghc_lesson_progress_module_fk_idx',
    'ghc_lesson_progress_lesson_fk_idx',
    'ghc_lesson_reading_progress_course_fk_idx',
    'ghc_lesson_reading_progress_module_fk_idx',
    'ghc_lesson_reading_progress_lesson_fk_idx',
    'ghc_stream_playback_sessions_course_fk_idx',
    'ghc_stream_playback_sessions_lesson_fk_idx',
    'ghc_support_ticket_messages_sender_fk_idx'
  ];
begin
  foreach idx in array expected_indexes loop
    if to_regclass('public.' || idx) is null then
      raise exception 'HOTPATH INDEX TEST FAILED: missing %', idx;
    end if;
  end loop;

  if to_regclass('public.idx_certificates_course_id') is not null then
    raise exception 'HOTPATH INDEX TEST FAILED: duplicate idx_certificates_course_id still exists';
  end if;

  if to_regclass('public.idx_certificates_user_id') is not null then
    raise exception 'HOTPATH INDEX TEST FAILED: duplicate idx_certificates_user_id still exists';
  end if;
end
$$;

select 'GHC_ACADEMY_HOTPATH_INDEXES_OK' as result;
