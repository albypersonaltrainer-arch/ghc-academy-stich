-- Fail closed for future application RPCs created in schema public by the
-- application migration owner (postgres).
--
-- Tables/sequences owned by postgres were already covered by
-- 20260816110100_preventa_public_default_privileges_fail_closed.sql.
-- This closes PostgreSQL's implicit/default function EXECUTE path too, so every
-- new client-facing RPC must grant EXECUTE explicitly.
--
-- Supabase also maintains default ACLs for its internal supabase_admin role.
-- The application migration connection is postgres and is not a member of that
-- platform role, so those defaults cannot be changed safely from application SQL.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
