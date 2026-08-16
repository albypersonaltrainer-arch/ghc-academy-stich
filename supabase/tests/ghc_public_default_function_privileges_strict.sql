create function public.ghc_default_acl_probe()
returns boolean
language sql
as $$ select true $$;

do $$
declare
  probe_oid oid;
begin
  select p.oid into probe_oid
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='ghc_default_acl_probe';

  if probe_oid is null then
    raise exception 'DEFAULT FUNCTION ACL TEST FAILED: probe function missing';
  end if;

  if has_function_privilege('anon', probe_oid, 'EXECUTE') then
    raise exception 'DEFAULT FUNCTION ACL TEST FAILED: anon inherited EXECUTE';
  end if;

  if has_function_privilege('authenticated', probe_oid, 'EXECUTE') then
    raise exception 'DEFAULT FUNCTION ACL TEST FAILED: authenticated inherited EXECUTE';
  end if;
end
$$;

drop function public.ghc_default_acl_probe();

select 'GHC_PUBLIC_DEFAULT_FUNCTION_PRIVILEGES_STRICT_OK' as result;
