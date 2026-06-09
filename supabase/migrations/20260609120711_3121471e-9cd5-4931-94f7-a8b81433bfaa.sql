DROP FUNCTION IF EXISTS public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  double precision[], double precision[],
  numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, text, text, integer, boolean
);

CREATE OR REPLACE FUNCTION public.find_nearest_reference_tracks(
  p_tempo_bpm          numeric  DEFAULT NULL,
  p_lufs_integrated    numeric  DEFAULT NULL,
  p_dynamic_range_db   numeric  DEFAULT NULL,
  p_spectral_centroid  numeric  DEFAULT NULL,
  p_spectral_flatness  numeric  DEFAULT NULL,
  p_spectral_rolloff   numeric  DEFAULT NULL,
  p_spectral_bandwidth numeric  DEFAULT NULL,
  p_zero_crossing_rate numeric  DEFAULT NULL,
  p_mfcc               double precision[] DEFAULT NULL,
  p_chroma_cens        double precision[] DEFAULT NULL,
  p_energy             numeric  DEFAULT NULL,
  p_danceability       numeric  DEFAULT NULL,
  p_valence            numeric  DEFAULT NULL,
  p_acousticness       numeric  DEFAULT NULL,
  p_instrumentalness   numeric  DEFAULT NULL,
  p_speechiness        numeric  DEFAULT NULL,
  p_liveness           numeric  DEFAULT NULL,
  p_key_name           text     DEFAULT NULL,
  p_mode               text     DEFAULT NULL,
  p_genre_labels       text[]   DEFAULT NULL,
  p_limit              integer  DEFAULT 6,
  p_strict_genre       boolean  DEFAULT false
)
RETURNS TABLE(
  band text, filename text, genre text, tempo_bpm numeric,
  key_name text, mode text, lufs_integrated numeric, dynamic_range_db numeric,
  energy numeric, danceability numeric, valence numeric, acousticness numeric,
  instrumentalness numeric, spectral_centroid numeric, speechiness numeric,
  liveness numeric, spectral_flatness numeric, zero_crossing_rate numeric,
  similarity_score numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
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
        + COALESCE(ABS(t.tempo_bpm - p_tempo_bpm)              / 40.0,   0.0) * 1.5
        + COALESCE(ABS(t.lufs_integrated - p_lufs_integrated)  /  8.0,   0.0) * 1.5
        + COALESCE(ABS(t.spectral_centroid - p_spectral_centroid) / 2000.0, 0.0) * 1.0
        + COALESCE(ABS(t.dynamic_range_db - p_dynamic_range_db) / 10.0,  0.0) * 0.8
        + COALESCE(ABS(t.spectral_flatness - p_spectral_flatness) * 3.0, 0.0) * 0.5
        + COALESCE(ABS(t.zero_crossing_rate - p_zero_crossing_rate) * 4.0, 0.0) * 0.3
        + COALESCE(ABS(t.spectral_rolloff - p_spectral_rolloff) / 3000.0, 0.0) * 0.3
        + COALESCE(ABS(t.spectral_bandwidth - p_spectral_bandwidth) / 1500.0, 0.0) * 0.2
        + COALESCE(ABS(t.energy - p_energy)               * 0.20, 0.0)
        + COALESCE(ABS(t.danceability - p_danceability)   * 0.20, 0.0)
        + COALESCE(ABS(t.valence - p_valence)             * 0.15, 0.0)
        + COALESCE(ABS(t.acousticness - p_acousticness)   * 0.15, 0.0)
        + COALESCE(ABS(t.instrumentalness - p_instrumentalness) * 0.10, 0.0)
        + COALESCE(ABS(t.speechiness - p_speechiness)     * 0.20, 0.0)
        + COALESCE(ABS(t.liveness - p_liveness)           * 0.15, 0.0)
      )
      * CASE
          WHEN p_key_name IS NOT NULL AND p_mode IS NOT NULL
               AND t.key_name = p_key_name AND t.mode = p_mode THEN 0.80
          WHEN p_key_name IS NOT NULL AND t.key_name = p_key_name  THEN 0.90
          ELSE 1.0
        END
      * CASE WHEN p_genre_labels IS NOT NULL AND t.genre ILIKE ANY(p_genre_labels) THEN 0.70 ELSE 1.0 END
      AS total_distance
    FROM public.music_reference_tracks t
    WHERE t.quarantined = false
      AND (
        t.mfcc IS NOT NULL
        OR (t.lufs_integrated IS NOT NULL
            AND t.spectral_centroid IS NOT NULL
            AND t.dynamic_range_db  IS NOT NULL)
      )
      AND (NOT p_strict_genre OR p_genre_labels IS NULL OR t.genre ILIKE ANY(p_genre_labels))
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