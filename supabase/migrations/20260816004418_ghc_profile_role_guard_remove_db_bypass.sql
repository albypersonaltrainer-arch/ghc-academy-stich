-- Final form: no implicit database-user bypass inside the API-facing trigger.
-- Role changes are allowed only for a trusted service JWT or an authenticated GHC admin.

create or replace function public.ghc_guard_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
begin
  if tg_op = 'INSERT' then
    if lower(coalesce(new.role,'')) in ('admin','superadmin','owner') then
      if coalesce(auth.jwt() ->> 'role','') = 'service_role' then
        return new;
      end if;

      if not public.ghc_is_admin() then
        raise exception 'No autorizado: un usuario no puede crear su propio perfil con rol administrativo.';
      end if;
    end if;

    return new;
  end if;

  if new.role is distinct from old.role then
    if coalesce(auth.jwt() ->> 'role','') = 'service_role' then
      return new;
    end if;

    if not public.ghc_is_admin() then
      raise exception 'No autorizado: el rol del perfil solo puede cambiarlo administración.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.ghc_guard_profile_role() from public;
revoke all on function public.ghc_guard_profile_role() from anon, authenticated;