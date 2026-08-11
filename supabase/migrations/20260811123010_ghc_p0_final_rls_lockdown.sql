-- Final P0 lockdown after Academy V2 is live.
drop policy if exists "Public can read lessons" on public.lessons;
drop policy if exists "Public can read modules" on public.modules;

drop policy if exists "GHC admins manage lessons" on public.lessons;
create policy "GHC admins manage lessons" on public.lessons for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

drop policy if exists "Authenticated read published exam questions legacy" on public.exam_questions;
drop policy if exists "Students read published exam question options" on public.exam_question_options;
drop policy if exists "Authenticated read published exam answers legacy" on public.exam_answers;
drop policy if exists "Published exams are readable" on public.exams;

drop policy if exists "GHC admins manage exam answers" on public.exam_answers;
create policy "GHC admins manage exam answers" on public.exam_answers for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

drop policy if exists "Users can insert their own exam attempts" on public.exam_attempts;
drop policy if exists "Users can insert their own lesson progress" on public.lesson_progress;
drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
drop policy if exists "Users can insert their own module completions" on public.module_completions;
drop policy if exists "Users can update their own module completions" on public.module_completions;
drop policy if exists "Users can insert their own course completions" on public.course_completions;
drop policy if exists "Users can update their own course completions" on public.course_completions;

drop policy if exists "GHC admins manage exam attempts" on public.exam_attempts;
create policy "GHC admins manage exam attempts" on public.exam_attempts for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

drop policy if exists "GHC admins manage lesson progress" on public.lesson_progress;
create policy "GHC admins manage lesson progress" on public.lesson_progress for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

drop policy if exists "GHC admins manage module completions" on public.module_completions;
create policy "GHC admins manage module completions" on public.module_completions for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

drop policy if exists "GHC admins manage course completions" on public.course_completions;
create policy "GHC admins manage course completions" on public.course_completions for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

drop policy if exists "GHC certificates public read verification" on public.certificates;
drop policy if exists "Public can verify valid certificates" on public.certificates;

revoke execute on function public.ghc_student_get_exam_attempt_result(uuid) from public, anon, authenticated;
revoke execute on function public.ghc_student_get_latest_exam_attempt_result(uuid) from public, anon, authenticated;

grant execute on function public.ghc_public_verify_certificate(text) to anon, authenticated;
grant execute on function public.ghc_public_get_course_catalog(text) to anon, authenticated;
