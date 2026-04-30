REVOKE EXECUTE ON FUNCTION public.get_genre_reference_examples(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_genre_reference_examples(text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.upsert_reference_tracks(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_reference_tracks(jsonb) TO authenticated;