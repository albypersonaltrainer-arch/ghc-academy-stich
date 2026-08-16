create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.ghc_student_can_read_course_asset(
  p_user_id uuid,
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if p_user_id is null or p_object_name is null or btrim(p_object_name) = '' then
    return false;
  end if;

  if auth.uid() is distinct from p_user_id and not public.ghc_is_admin() then
    return false;
  end if;

  return exists (
    select 1
    from public.lessons l
    where (l.video_url = p_object_name or l.audio_url = p_object_name or l.pdf_url = p_object_name)
      and coalesce((public.ghc_internal_student_lesson_access(p_user_id, l.id) ->> 'allowed')::boolean, false)
  );
end;
$$;

revoke all on function private.ghc_student_can_read_course_asset(uuid, text) from public, anon;
grant execute on function private.ghc_student_can_read_course_asset(uuid, text) to authenticated;

drop policy if exists "GHC students can read only accessible lesson assets" on storage.objects;
create policy "GHC students can read only accessible lesson assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ghc-course-assets'
  and (
    public.ghc_is_admin()
    or private.ghc_student_can_read_course_asset(auth.uid(), name)
  )
);