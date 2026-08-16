-- Low-risk performance hardening for Academy hot paths.
-- These indexes cover single-column foreign keys used by progress, exams,
-- streaming and support. They do not change RLS, constraints or business logic.

create index if not exists ghc_exam_attempts_user_fk_idx
  on public.exam_attempts (user_id);
create index if not exists ghc_exam_attempts_course_fk_idx
  on public.exam_attempts (course_id);
create index if not exists ghc_exam_attempts_exam_fk_idx
  on public.exam_attempts (exam_id);

create index if not exists ghc_exam_attempt_answers_selected_option_fk_idx
  on public.exam_attempt_answers (selected_option_id);

create index if not exists ghc_course_completions_exam_fk_idx
  on public.course_completions (exam_id);
create index if not exists ghc_course_completions_exam_attempt_fk_idx
  on public.course_completions (exam_attempt_id);

create index if not exists ghc_module_completions_exam_fk_idx
  on public.module_completions (exam_id);
create index if not exists ghc_module_completions_exam_attempt_fk_idx
  on public.module_completions (exam_attempt_id);

create index if not exists ghc_modules_course_fk_idx
  on public.modules (course_id);
create index if not exists ghc_lessons_module_fk_idx
  on public.lessons (module_id);
create index if not exists ghc_exams_lesson_fk_idx
  on public.exams (lesson_id);
create index if not exists ghc_lesson_media_assets_module_fk_idx
  on public.lesson_media_assets (module_id);

create index if not exists ghc_lesson_progress_course_fk_idx
  on public.lesson_progress (course_id);
create index if not exists ghc_lesson_progress_module_fk_idx
  on public.lesson_progress (module_id);
create index if not exists ghc_lesson_progress_lesson_fk_idx
  on public.lesson_progress (lesson_id);

create index if not exists ghc_lesson_reading_progress_course_fk_idx
  on public.lesson_reading_progress (course_id);
create index if not exists ghc_lesson_reading_progress_module_fk_idx
  on public.lesson_reading_progress (module_id);
create index if not exists ghc_lesson_reading_progress_lesson_fk_idx
  on public.lesson_reading_progress (lesson_id);

create index if not exists ghc_stream_playback_sessions_course_fk_idx
  on public.stream_playback_sessions (course_id);
create index if not exists ghc_stream_playback_sessions_lesson_fk_idx
  on public.stream_playback_sessions (lesson_id);

create index if not exists ghc_support_ticket_messages_sender_fk_idx
  on public.support_ticket_messages (sender_user_id);

-- Exact duplicates verified before removal. Keep the canonical certificates_* names.
drop index if exists public.idx_certificates_course_id;
drop index if exists public.idx_certificates_user_id;
