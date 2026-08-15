drop policy if exists "GHC direct owner can manage courses" on public.courses;
drop policy if exists "GHC direct owner can manage modules" on public.modules;

drop policy if exists "GHC certificates admin full access" on public.certificates;
create policy "GHC certificates admin full access"
on public.certificates
for all
to authenticated
using (public.ghc_is_admin())
with check (public.ghc_is_admin());
