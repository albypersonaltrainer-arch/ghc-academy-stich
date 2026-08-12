drop policy if exists "GHC enrolled students can read course assets" on storage.objects;

create policy "GHC students can read only accessible lesson assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ghc-course-assets'
  and (
    public.ghc_is_admin()
    or exists (
      select 1
      from public.lessons l
      where (
        l.video_url = storage.objects.name
        or l.audio_url = storage.objects.name
        or l.pdf_url = storage.objects.name
      )
      and coalesce(
        (public.ghc_internal_student_lesson_access(auth.uid(), l.id) ->> 'allowed')::boolean,
        false
      ) = true
    )
  )
);
