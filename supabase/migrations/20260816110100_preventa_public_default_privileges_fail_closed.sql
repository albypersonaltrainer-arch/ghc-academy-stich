-- Defense in depth for future application migrations.
-- Existing objects are intentionally untouched.
--
-- Supabase's current default ACL grants anon/authenticated privileges on newly
-- created public tables and sequences owned by postgres. If a future migration
-- forgets RLS or explicit REVOKE, that object could otherwise start life exposed.
--
-- service_role keeps its existing default privileges. Client-facing access must
-- be granted explicitly by the migration that creates the object.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Functions are deliberately not changed here. PostgreSQL's implicit PUBLIC
-- EXECUTE default is global rather than schema-local; changing it globally could
-- affect future Supabase/internal schemas. Application migrations must continue
-- to REVOKE/GRANT function EXECUTE explicitly.