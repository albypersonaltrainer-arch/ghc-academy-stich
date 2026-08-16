-- Fail closed for future application RPCs created by the application migration
-- owner (postgres).
--
-- PostgreSQL grants EXECUTE on newly-created functions to PUBLIC by default.
-- A per-schema REVOKE alone cannot neutralize that global default grant, so the
-- PUBLIC revoke must be global for the creating role. Supabase's schema-specific
-- defaults (for example storage) can still grant the client roles they explicitly
-- require, while public application RPCs must grant EXECUTE intentionally.
--
-- Tables/sequences owned by postgres were already covered by
-- 20260816110100_preventa_public_default_privileges_fail_closed.sql.
--
-- Supabase also maintains default ACLs for its internal supabase_admin role.
-- The application migration connection is postgres and is not a member of that
-- platform role, so those defaults cannot be changed safely from application SQL.

alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
