
-- 1. Cosine similarity helper
CREATE OR REPLACE FUNCTION public.cosine_similarity_f8(a float8[], b float8[])
RETURNS float8
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  dot float8 := 0.0;
  norm_a float8 := 0.0;
  norm_b float8 := 0.0;
  len_a int;
  len_b int;
  i int;
BEGIN
  IF a IS NULL OR b IS NULL THEN RETURN NULL; END IF;
  len_a := array_length(a, 1);
  len_b := array_length(b, 1);
  IF len_a IS NULL OR len_b IS NULL OR len_a <> len_b THEN RETURN NULL; END IF;
  FOR i IN 1..len_a LOOP
    dot := dot + a[i] * b[i];
    norm_a := norm_a + a[i] * a[i];
    norm_b := norm_b + b[i] * b[i];
  END LOOP;
  IF norm_a = 0.0 OR norm_b = 0.0 THEN RETURN 0.0; END IF;
  RETURN LEAST(1.0, GREATEST(-1.0, dot / (sqrt(norm_a) * sqrt(norm_b))));
END;
$$;

-- 2. Drop old find_nearest_reference_tracks signature
DROP FUNCTION IF EXISTS public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, integer, boolean,
  numeric, numeric, numeric, numeric, numeric, numeric, text, text
);

-- 3. New find_nearest_reference_tracks with MFCC + Chroma cosine similarity
CREATE OR REPLACE FUNCTION public.find_nearest_reference_tracks(
  p_tempo_bpm          numeric  DEFAULT NULL,
  p_lufs_integrated    numeric  DEFAULT NULL,
  p_dynamic_range_db   numeric  DEFAULT NULL,
  p_spectral_centroid  numeric  DEFAULT NULL,
  p_spectral_flatness  numeric  DEFAULT NULL,
  p_spectral_rolloff   numeric  DEFAULT NULL,
  p_spectral_bandwidth numeric  DEFAULT NULL,
  p_zero_crossing_rate numeric  DEFAULT NULL,
  p_mfcc               float8[] DEFAULT NULL,
  p_chroma_cens        float8[] DEFAULT NULL,
  p_energy             numeric  DEFAULT NULL,
  p_danceability       numeric  DEFAULT NULL,
  p_valence            numeric  DEFAULT NULL,
  p_acousticness       numeric  DEFAULT NULL,
  p_instrumentalness   numeric  DEFAULT NULL,
  p_speechiness        numeric  DEFAULT NULL,
  p_liveness           numeric  DEFAULT NULL,
  p_key_name           text     DEFAULT NULL,
  p_mode               text     DEFAULT NULL,
  p_genre              text     DEFAULT NULL,
  p_limit              integer  DEFAULT 6,
  p_strict_genre       boolean  DEFAULT false
)
RETURNS TABLE(
  band text, filename text, genre text, tempo_bpm numeric,
  key_name text, mode text, lufs_integrated numeric, dynamic_range_db numeric,
  energy numeric, danceability numeric, valence numeric,
  acousticness numeric, instrumentalness numeric,
  spectral_centroid numeric, speechiness numeric, liveness numeric,
  spectral_flatness numeric, zero_crossing_rate numeric,
  similarity_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT t.*,
      (
        CASE
          WHEN p_mfcc IS NOT NULL AND t.mfcc IS NOT NULL
               AND array_length(p_mfcc, 1) = 13
               AND array_length(t.mfcc::float8[], 1) = 13
          THEN (1.0 - GREATEST(0.0, public.cosine_similarity_f8(p_mfcc, t.mfcc::float8[]))) * 2.5
          ELSE 0.0
        END
        + CASE
            WHEN p_chroma_cens IS NOT NULL AND t.chroma_cens IS NOT NULL
                 AND array_length(p_chroma_cens, 1) = 12
                 AND array_length(t.chroma_cens::float8[], 1) = 12
            THEN (1.0 - GREATEST(0.0, public.cosine_similarity_f8(p_chroma_cens, t.chroma_cens::float8[]))) * 1.5
            ELSE 0.0
          END
        + COALESCE(ABS(t.tempo_bpm - p_tempo_bpm) / 40.0, 0.0) * 1.5
        + COALESCE(ABS(t.lufs_integrated - p_lufs_integrated) / 8.0, 0.0) * 1.5
        + COALESCE(ABS(t.spectral_centroid - p_spectral_centroid) / 2000.0, 0.0) * 1.0
        + COALESCE(ABS(t.dynamic_range_db - p_dynamic_range_db) / 10.0, 0.0) * 0.8
        + COALESCE(ABS(t.spectral_flatness - p_spectral_flatness) * 3.0, 0.0) * 0.5
        + COALESCE(ABS(t.zero_crossing_rate - p_zero_crossing_rate) * 4.0, 0.0) * 0.3
        + COALESCE(ABS(t.spectral_rolloff - p_spectral_rolloff) / 3000.0, 0.0) * 0.3
        + COALESCE(ABS(t.spectral_bandwidth - p_spectral_bandwidth) / 1500.0, 0.0) * 0.2
        + COALESCE(ABS(t.energy - p_energy) * 0.2, 0.0)
        + COALESCE(ABS(t.danceability - p_danceability) * 0.2, 0.0)
        + COALESCE(ABS(t.valence - p_valence) * 0.15, 0.0)
        + COALESCE(ABS(t.acousticness - p_acousticness) * 0.15, 0.0)
        + COALESCE(ABS(t.instrumentalness - p_instrumentalness) * 0.1, 0.0)
        + COALESCE(ABS(t.speechiness - p_speechiness) * 0.2, 0.0)
        + COALESCE(ABS(t.liveness - p_liveness) * 0.15, 0.0)
        + CASE
            WHEN p_key_name IS NOT NULL AND p_mode IS NOT NULL
                 AND t.key_name = p_key_name AND t.mode = p_mode THEN -0.30
            WHEN p_key_name IS NOT NULL AND t.key_name = p_key_name THEN -0.15
            ELSE 0.0
          END
        + CASE WHEN p_genre IS NOT NULL AND t.genre ILIKE p_genre THEN -0.50 ELSE 0.0 END
      ) AS total_distance
    FROM public.music_reference_tracks t
    WHERE t.quarantined = false
      AND (NOT p_strict_genre OR p_genre IS NULL OR t.genre ILIKE p_genre)
  )
  SELECT
    d.band, d.filename, d.genre, d.tempo_bpm, d.key_name, d.mode,
    d.lufs_integrated, d.dynamic_range_db, d.energy, d.danceability,
    d.valence, d.acousticness, d.instrumentalness, d.spectral_centroid,
    d.speechiness, d.liveness, d.spectral_flatness, d.zero_crossing_rate,
    ROUND((1.0 / (1.0 + GREATEST(d.total_distance, 0.0)))::numeric, 4) AS similarity_score
  FROM d
  ORDER BY d.total_distance ASC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.cosine_similarity_f8(float8[], float8[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  float8[], float8[],
  numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, text, text, integer, boolean
) TO authenticated, service_role;
