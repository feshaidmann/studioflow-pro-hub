
-- 1) Storage: remove broad public SELECT on public buckets (CDN public URLs keep working)
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view creative assets" ON storage.objects;

-- 2) SECURITY DEFINER functions: lock down EXECUTE
-- Default: revoke from PUBLIC, anon, authenticated; then grant back as needed.

-- Trigger functions (never callable directly)
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vbs_validate_expiry() FROM PUBLIC, anon, authenticated;

-- Internal/admin-only functions (called via service_role from edge fns or pg_cron)
REVOKE ALL ON FUNCTION public.recalcular_benchmark_genero(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_reference_tracks(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_file_download_url(uuid) FROM PUBLIC, anon, authenticated;

-- Admin-only metrics (do internal has_role check, but no need to expose to anon)
REVOKE ALL ON FUNCTION public.get_oportunidades_search_metrics(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_summary_variant_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_extract_metrics(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_reference_coverage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_oportunidades_search_metrics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_summary_variant_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_extract_metrics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_reference_coverage() TO authenticated;

-- Auth-required helpers (no business reason to allow anon)
REVOKE ALL ON FUNCTION public.get_auth_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_professional_project_count(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_member_projects() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_project_for_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_user_applications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_professional_project_count(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_for_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Public-by-design functions stay callable by anon (public profiles + reference catalog lookups)
-- get_public_profile, get_public_profile_history, get_public_profile_ratings,
-- count_reference_tracks_by_genre, find_nearest_reference_tracks, get_genre_reference_examples
-- → keep default grants (executable by anon and authenticated)
