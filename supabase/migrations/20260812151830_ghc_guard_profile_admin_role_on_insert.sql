create or replace function public.ghc_guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  if tg_op = 'INSERT' then
    if lower(coalesce(new.role,'')) in ('admin','superadmin','owner') then
      if current_user in ('postgres','supabase_admin') then
        return new;
      end if;
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
    if current_user in ('postgres','supabase_admin') then
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

drop trigger if exists ghc_guard_profile_role_before_insert on public.profiles;
create trigger ghc_guard_profile_role_before_insert
before insert on public.profiles
for each row execute function public.ghc_guard_profile_role();

revoke execute on function public.ghc_guard_profile_role() from public,anon,authenticated;
