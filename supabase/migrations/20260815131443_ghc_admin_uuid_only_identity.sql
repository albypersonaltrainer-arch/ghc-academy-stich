create or replace function public.is_ghc_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin', 'owner')
      and (
        not exists (
          select 1
          from auth.mfa_factors f
          where f.user_id = p.id
            and f.status::text = 'verified'
        )
        or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      )
  );
$$;

revoke all on function public.is_ghc_admin() from public, anon;
grant execute on function public.is_ghc_admin() to authenticated;
