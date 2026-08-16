-- Fail closed for future application objects created in schema public.
-- Existing objects are handled by explicit ACL/RLS migrations; this prevents a
-- future table, sequence or RPC from inheriting client privileges by accident.
--
-- Both roles are covered because Supabase-managed operations can use
-- supabase_admin while application migrations are normally owned by postgres.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated;
