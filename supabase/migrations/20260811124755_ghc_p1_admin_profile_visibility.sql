drop policy if exists "GHC admins read all profiles" on public.profiles;
create policy "GHC admins read all profiles"
on public.profiles
for select
to authenticated
using (public.ghc_is_admin());
