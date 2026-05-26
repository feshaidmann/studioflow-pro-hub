
-- ── playlist_profiles ────────────────────────────────────────────────────────
CREATE TABLE public.playlist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_ranges jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  size integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.playlist_profiles TO authenticated;
GRANT ALL ON public.playlist_profiles TO service_role;

ALTER TABLE public.playlist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read playlist profiles"
ON public.playlist_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage playlist profiles"
ON public.playlist_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_playlist_profiles_updated_at
BEFORE UPDATE ON public.playlist_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RPC: estatísticas de seções por gênero ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_genre_section_stats(p_genre text)
RETURNS TABLE(
  sample_size integer,
  p50_duration_sec numeric,
  p50_segments_count numeric,
  p50_seconds_to_first_chorus_estimate numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::integer AS sample_size,
    ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_sec)::numeric, 1) AS p50_duration_sec,
    ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY segments_count)::numeric, 1) AS p50_segments_count,
    -- estimativa grosseira: assume que o primeiro refrão entra ~1.5 seções dentro
    -- (intro + verso); seg_dur = duration / segments_count
    ROUND(
      (percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_sec)
       / NULLIF(percentile_cont(0.5) WITHIN GROUP (ORDER BY segments_count), 0)
       * 1.5)::numeric,
      1
    ) AS p50_seconds_to_first_chorus_estimate
  FROM public.music_reference_tracks
  WHERE p_genre IS NOT NULL
    AND genre ILIKE p_genre
    AND quarantined = false
    AND duration_sec IS NOT NULL
    AND segments_count IS NOT NULL
    AND segments_count > 0;
$$;
