-- Existing public tables inherited broad anon table/sequence privileges from
-- legacy Supabase defaults. RLS denied all anonymous mutations, but keeping the
-- base grants made safety depend on every current/future policy remaining closed.
--
-- No anonymous write policy exists in schema public. Preventa writes through
-- trusted backend/service-role paths. Keep SELECT/function grants untouched.

revoke insert, update, delete on all tables in schema public from anon;
revoke usage, select, update on all sequences in schema public from anon;