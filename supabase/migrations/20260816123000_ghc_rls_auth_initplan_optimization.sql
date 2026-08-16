-- Mechanical RLS performance optimization recommended by Supabase.
-- Authorization semantics are unchanged: each auth.uid() call is wrapped in a
-- scalar SELECT so PostgreSQL can evaluate it once per statement instead of once
-- per candidate row.

alter policy "Users can read their own lesson progress"
  on public.lesson_progress
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own exam attempts"
  on public.exam_attempts
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own course completions"
  on public.course_completions
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own module completions"
  on public.module_completions
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own certificates"
  on public.certificates
  using ((select auth.uid()) = user_id);

alter policy "GHC certificates owner read valid"
  on public.certificates
  using ((user_id = (select auth.uid())) and (status = 'valid'::text));

alter policy "Students can read own course access"
  on public.course_access
  using (((select auth.uid()) = user_id) or ghc_is_admin());

alter policy "Students read own exam attempt answers"
  on public.exam_attempt_answers
  using (
    exists (
      select 1
      from public.exam_attempts a
      where a.id = exam_attempt_answers.attempt_id
        and a.user_id = (select auth.uid())
    )
  );

alter policy "Students manage own extra attempt requests"
  on public.exam_extra_attempt_requests
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "Students read own reading progress"
  on public.lesson_reading_progress
  using (((select auth.uid()) = user_id) or ghc_is_admin());

alter policy "Users can insert their own profile"
  on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Users can read their own profile"
  on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can update their own profile"
  on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "Students read own support tickets"
  on public.support_tickets
  using ((user_id = (select auth.uid())) or ghc_is_admin());

alter policy "Students read own support messages"
  on public.support_ticket_messages
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and ((t.user_id = (select auth.uid())) or ghc_is_admin())
    )
  );
