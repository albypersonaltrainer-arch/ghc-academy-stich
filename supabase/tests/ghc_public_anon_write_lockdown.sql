do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
      and (
        has_table_privilege('anon',c.oid,'INSERT')
        or has_table_privilege('anon',c.oid,'UPDATE')
        or has_table_privilege('anon',c.oid,'DELETE')
      )
  ) then
    raise exception 'ANON WRITE LOCKDOWN FAILED: anon retains mutation privilege on public table';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='S'
      and (
        has_sequence_privilege('anon',c.oid,'USAGE')
        or has_sequence_privilege('anon',c.oid,'SELECT')
        or has_sequence_privilege('anon',c.oid,'UPDATE')
      )
  ) then
    raise exception 'ANON WRITE LOCKDOWN FAILED: anon retains public sequence privilege';
  end if;

  if not has_function_privilege('anon','public.ghc_public_get_course_catalog(text)','EXECUTE')
     or not has_function_privilege('anon','public.ghc_public_get_course_payment_options(text)','EXECUTE')
     or not has_function_privilege('anon','public.ghc_public_verify_certificate(text)','EXECUTE') then
    raise exception 'ANON WRITE LOCKDOWN FAILED: intended public RPC execute lost';
  end if;
end
$$;

select 'GHC_PUBLIC_ANON_WRITE_LOCKDOWN_OK' as result;