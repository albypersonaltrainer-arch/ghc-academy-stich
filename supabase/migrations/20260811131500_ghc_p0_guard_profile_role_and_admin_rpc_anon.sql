-- GHC Academy P0 security hardening
-- Applied to production on 2026-08-11 and tracked here for repository parity.

create or replace function public.ghc_guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if current_user in ('postgres', 'supabase_admin') then
      return new;
    end if;

    if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
      return new;
    end if;

    if not public.ghc_is_admin() then
      raise exception 'No autorizado: el rol del perfil solo puede cambiarlo administración.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ghc_guard_profile_role_before_update on public.profiles;
create trigger ghc_guard_profile_role_before_update
before update of role on public.profiles
for each row
execute function public.ghc_guard_profile_role();

revoke execute on function public.ghc_guard_profile_role() from public, anon, authenticated;

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'ghc_admin_%'
  loop
    execute 'revoke execute on function ' || r.fn || ' from public, anon';
  end loop;
end;
$$;

revoke execute on function public.ghc_is_admin() from public, anon;
revoke execute on function public.is_ghc_admin() from public, anon;
