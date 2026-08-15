create or replace function private.ghc_guard_lesson_content_xss()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_content text := coalesce(new.content, '');
begin
  if v_content ~* '(<[[:space:]]*(script|iframe|object|embed|svg|math|form|input|button|textarea)([[:space:]>\/])|on[a-z]+[[:space:]]*=|javascript[[:space:]]*:|srcdoc[[:space:]]*=|data[[:space:]]*:[[:space:]]*text/html)' then
    raise exception 'Contenido de lección rechazado por política de seguridad HTML.';
  end if;

  return new;
end;
$$;

revoke all on function private.ghc_guard_lesson_content_xss() from public, anon, authenticated;

drop trigger if exists ghc_guard_lesson_content_xss on public.lessons;
create trigger ghc_guard_lesson_content_xss
before insert or update of content on public.lessons
for each row execute function private.ghc_guard_lesson_content_xss();
