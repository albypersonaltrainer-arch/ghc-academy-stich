revoke execute on function public.set_updated_at() from public, anon;
grant execute on function public.set_updated_at() to authenticated, service_role;
