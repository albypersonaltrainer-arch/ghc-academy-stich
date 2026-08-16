-- Fix privilege-confusion in the profile role trigger.
-- SECURITY DEFINER made current_user equal to the function owner, so the old
-- postgres/supabase_admin bypass was true during ordinary API writes.

create or replace function public.ghc_guard_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
begin
  if tg_op = 'INSERT' then
    if lower(coalesce(new.role,'')) in ('admin','superadmin','owner') then
      -- Direct trusted database maintenance (SQL editor / administrative DB session).
      if session_user in ('postgres','supabase_admin') then
        return new;
      end if;

      -- Trusted backend service context.
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
    if session_user in ('postgres','supabase_admin') then
      return new;
    end if;

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