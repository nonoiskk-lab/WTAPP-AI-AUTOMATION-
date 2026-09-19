-- Pin search_path on all SECURITY DEFINER / SQL functions to close the
-- "mutable search_path" schema-injection footgun flagged by Supabase's
-- security advisor. No behavior change — these functions only ever
-- reference public-schema objects.
alter function set_updated_at() set search_path = public, pg_temp;
alter function is_active_admin() set search_path = public, pg_temp;
alter function match_knowledge_chunks(vector, int, float) set search_path = public, pg_temp;
alter function recompute_lead_score(uuid) set search_path = public, pg_temp;

-- is_active_admin() is a SECURITY DEFINER helper used inside RLS policies.
-- The anon role has no legitimate reason to call it (unauthenticated
-- requests should never reach admin-gated tables); restrict execution to
-- authenticated (logged-in) sessions only.
revoke execute on function is_active_admin() from public;
revoke execute on function is_active_admin() from anon;
grant execute on function is_active_admin() to authenticated;

-- Known accepted risk (not fixed here): the `vector` extension is installed
-- in the `public` schema rather than a dedicated `extensions` schema, per
-- Supabase's advisor. This is the standard/default pattern for pgvector on
-- Supabase and relocating it post-hoc risks breaking the `knowledge_chunks`
-- table's existing `vector(1536)` column type — left as-is deliberately.
