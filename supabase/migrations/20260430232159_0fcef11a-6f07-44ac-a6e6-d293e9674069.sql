CREATE OR REPLACE FUNCTION public.find_nearest_reference_tracks(
  p_tempo_bpm numeric DEFAULT NULL,
  p_lufs_integrated numeric DEFAULT NULL,
  p_energy numeric DEFAULT NULL,
  p_danceability numeric DEFAULT NULL,
  p_valence numeric DEFAULT NULL,
  p_acousticness numeric DEFAULT NULL,
  p_instrumentalness numeric DEFAULT NULL,
  p_dynamic_range_db numeric DEFAULT NULL,
  p_spectral_centroid numeric DEFAULT NULL,
  p_genre text DEFAULT NULL,
  p_limit integer DEFAULT 6,
  p_strict_genre boolean DEFAULT false
)
RETURNS TABLE(
  band text,
  filename text,
  genre text,
  tempo_bpm numeric,
  key_name text,
  mode text,
  lufs_integrated numeric,
  dynamic_range_db numeric,
  energy numeric,
  danceability numeric,
  valence numeric,
  acousticness numeric,
  instrumentalness numeric,
  spectral_centroid numeric,
  similarity_score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.band, t.filename, t.genre, t.tempo_bpm, t.key_name, t.mode,
    t.lufs_integrated, t.dynamic_range_db, t.energy, t.danceability,
    t.valence, t.acousticness, t.instrumentalness, t.spectral_centroid,
    ROUND((1.0 / (1.0 + (
        COALESCE(ABS(t.tempo_bpm        - p_tempo_bpm)        / 40.0,  0)
      + COALESCE(ABS(t.lufs_integrated  - p_lufs_integrated)  / 8.0,   0)
      + COALESCE(ABS(t.energy           - p_energy)           * 1.2,   0)
      + COALESCE(ABS(t.danceability     - p_danceability)     * 1.0,   0)
      + COALESCE(ABS(t.valence          - p_valence)          * 0.8,   0)
      + COALESCE(ABS(t.acousticness     - p_acousticness)     * 0.8,   0)
      + COALESCE(ABS(t.instrumentalness - p_instrumentalness) * 0.6,   0)
      + COALESCE(ABS(t.dynamic_range_db - p_dynamic_range_db) / 10.0,  0)
      + COALESCE(ABS(t.spectral_centroid- p_spectral_centroid)/ 2000.0,0)
    )))::numeric, 4) AS similarity_score
  FROM public.music_reference_tracks t
  WHERE (NOT p_strict_genre OR p_genre IS NULL OR t.genre ILIKE p_genre)
  ORDER BY (
      COALESCE(ABS(t.tempo_bpm        - p_tempo_bpm)        / 40.0,  0)
    + COALESCE(ABS(t.lufs_integrated  - p_lufs_integrated)  / 8.0,   0)
    + COALESCE(ABS(t.energy           - p_energy)           * 1.2,   0)
    + COALESCE(ABS(t.danceability     - p_danceability)     * 1.0,   0)
    + COALESCE(ABS(t.valence          - p_valence)          * 0.8,   0)
    + COALESCE(ABS(t.acousticness     - p_acousticness)     * 0.8,   0)
    + COALESCE(ABS(t.instrumentalness - p_instrumentalness) * 0.6,   0)
    + COALESCE(ABS(t.dynamic_range_db - p_dynamic_range_db) / 10.0,  0)
    + COALESCE(ABS(t.spectral_centroid- p_spectral_centroid)/ 2000.0,0)
    + CASE WHEN p_genre IS NOT NULL AND t.genre ILIKE p_genre THEN -0.5 ELSE 0 END
  ) ASC
  LIMIT GREATEST(p_limit, 1);
$$;