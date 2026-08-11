create or replace function public.ghc_sync_certificate_snapshots()
returns trigger
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  v_email text;
begin
  new.student_name_snapshot := coalesce(
    nullif(trim(coalesce(new.student_name_snapshot, '')), ''),
    nullif(trim(coalesce(new.student_name, '')), ''),
    'Alumno GHC Academy'
  );

  new.course_title_snapshot := coalesce(
    nullif(trim(coalesce(new.course_title_snapshot, '')), ''),
    nullif(trim(coalesce(new.course_title, '')), ''),
    'Curso GHC Academy'
  );

  if nullif(trim(coalesce(new.student_email, '')), '') is null and new.user_id is not null then
    select coalesce(
      nullif(trim(coalesce(p.email, '')), ''),
      nullif(trim(coalesce(u.email, '')), '')
    )
    into v_email
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = new.user_id
    limit 1;

    new.student_email := v_email;
  end if;

  new.verification_code := coalesce(nullif(trim(coalesce(new.verification_code, '')), ''), new.certificate_code);
  new.code := coalesce(nullif(trim(coalesce(new.code, '')), ''), new.certificate_code);

  return new;
end;
$function$;

revoke all on function public.ghc_sync_certificate_snapshots() from public, anon, authenticated;

drop trigger if exists ghc_sync_certificate_snapshots_before_write on public.certificates;
create trigger ghc_sync_certificate_snapshots_before_write
before insert or update on public.certificates
for each row execute function public.ghc_sync_certificate_snapshots();

update public.certificates c
set
  student_name_snapshot = coalesce(nullif(trim(coalesce(c.student_name_snapshot, '')), ''), nullif(trim(coalesce(c.student_name, '')), ''), 'Alumno GHC Academy'),
  course_title_snapshot = coalesce(nullif(trim(coalesce(c.course_title_snapshot, '')), ''), nullif(trim(coalesce(c.course_title, '')), ''), 'Curso GHC Academy'),
  student_email = coalesce(
    nullif(trim(coalesce(c.student_email, '')), ''),
    (select coalesce(nullif(trim(coalesce(p.email, '')), ''), nullif(trim(coalesce(u.email, '')), '')) from auth.users u left join public.profiles p on p.id=u.id where u.id=c.user_id limit 1)
  ),
  verification_code = coalesce(nullif(trim(coalesce(c.verification_code, '')), ''), c.certificate_code),
  code = coalesce(nullif(trim(coalesce(c.code, '')), ''), c.certificate_code),
  updated_at = now()
where
  nullif(trim(coalesce(c.student_name_snapshot, '')), '') is null
  or nullif(trim(coalesce(c.course_title_snapshot, '')), '') is null
  or nullif(trim(coalesce(c.student_email, '')), '') is null
  or nullif(trim(coalesce(c.verification_code, '')), '') is null
  or nullif(trim(coalesce(c.code, '')), '') is null;
