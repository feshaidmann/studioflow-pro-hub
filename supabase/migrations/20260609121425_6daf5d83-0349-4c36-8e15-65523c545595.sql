CREATE OR REPLACE FUNCTION public.get_genre_taxonomy()
RETURNS TABLE(
  label           text,
  canonical       text,
  parent          text,
  active_count    integer,
  quarantined_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(NULLIF(t.genre,''), '(sem)')          AS label,
    public.genre_canonical(t.genre)                 AS canonical,
    public.genre_parent(public.genre_canonical(t.genre)) AS parent,
    COUNT(*) FILTER (WHERE t.quarantined = false)::int  AS active_count,
    COUNT(*) FILTER (WHERE t.quarantined = true)::int   AS quarantined_count
  FROM public.music_reference_tracks t
  GROUP BY 1, 2, 3
  ORDER BY active_count DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_genre_taxonomy() TO authenticated, service_role;