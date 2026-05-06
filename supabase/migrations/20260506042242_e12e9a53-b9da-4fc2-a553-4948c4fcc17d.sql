
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
  p_strict_genre boolean DEFAULT false,
  p_speechiness numeric DEFAULT NULL,
  p_liveness numeric DEFAULT NULL,
  p_spectral_bandwidth numeric DEFAULT NULL,
  p_spectral_rolloff numeric DEFAULT NULL,
  p_spectral_flatness numeric DEFAULT NULL,
  p_zero_crossing_rate numeric DEFAULT NULL,
  p_key_name text DEFAULT NULL,
  p_mode text DEFAULT NULL
)
RETURNS TABLE(
  band text, filename text, genre text, tempo_bpm numeric,
  key_name text, mode text, lufs_integrated numeric, dynamic_range_db numeric,
  energy numeric, danceability numeric, valence numeric,
  acousticness numeric, instrumentalness numeric, spectral_centroid numeric,
  speechiness numeric, liveness numeric,
  spectral_flatness numeric, zero_crossing_rate numeric,
  similarity_score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      t.*,
      -- BPM tolerance: half/double-time aware
      CASE
        WHEN p_tempo_bpm IS NULL OR t.tempo_bpm IS NULL THEN NULL::numeric
        ELSE LEAST(
          ABS(t.tempo_bpm - p_tempo_bpm),
          ABS(t.tempo_bpm - p_tempo_bpm * 2),
          ABS(t.tempo_bpm - p_tempo_bpm / 2)
        )
      END AS bpm_diff,
      -- High-confidence physical metrics (large weights)
      CASE WHEN p_lufs_integrated IS NULL OR t.lufs_integrated IS NULL THEN NULL
           ELSE ABS(t.lufs_integrated - p_lufs_integrated) / 6.0 END AS d_lufs,
      CASE WHEN p_dynamic_range_db IS NULL OR t.dynamic_range_db IS NULL THEN NULL
           ELSE ABS(t.dynamic_range_db - p_dynamic_range_db) / 8.0 END AS d_dr,
      CASE WHEN p_spectral_centroid IS NULL OR t.spectral_centroid IS NULL THEN NULL
           ELSE ABS(t.spectral_centroid - p_spectral_centroid) / 1500.0 END AS d_centroid,
      CASE WHEN p_spectral_rolloff IS NULL OR t.spectral_rolloff IS NULL THEN NULL
           ELSE ABS(t.spectral_rolloff - p_spectral_rolloff) / 2500.0 END AS d_rolloff,
      CASE WHEN p_spectral_flatness IS NULL OR t.spectral_flatness IS NULL THEN NULL
           ELSE ABS(t.spectral_flatness - p_spectral_flatness) * 4.0 END AS d_flatness,
      CASE WHEN p_zero_crossing_rate IS NULL OR t.zero_crossing_rate IS NULL THEN NULL
           ELSE ABS(t.zero_crossing_rate - p_zero_crossing_rate) * 3.0 END AS d_zcr,
      CASE WHEN p_spectral_bandwidth IS NULL OR t.spectral_bandwidth IS NULL THEN NULL
           ELSE ABS(t.spectral_bandwidth - p_spectral_bandwidth) / 1500.0 END AS d_bw,
      -- Low-confidence perceptual heuristics (small weights)
      CASE WHEN p_energy IS NULL OR t.energy IS NULL THEN NULL
           ELSE ABS(t.energy - p_energy) * 0.4 END AS d_energy,
      CASE WHEN p_danceability IS NULL OR t.danceability IS NULL THEN NULL
           ELSE ABS(t.danceability - p_danceability) * 0.3 END AS d_dance,
      CASE WHEN p_valence IS NULL OR t.valence IS NULL THEN NULL
           ELSE ABS(t.valence - p_valence) * 0.3 END AS d_val,
      CASE WHEN p_acousticness IS NULL OR t.acousticness IS NULL THEN NULL
           ELSE ABS(t.acousticness - p_acousticness) * 0.3 END AS d_acous,
      CASE WHEN p_instrumentalness IS NULL OR t.instrumentalness IS NULL THEN NULL
           ELSE ABS(t.instrumentalness - p_instrumentalness) * 0.25 END AS d_instr,
      CASE WHEN p_liveness IS NULL OR t.liveness IS NULL THEN NULL
           ELSE ABS(t.liveness - p_liveness) * 0.25 END AS d_live,
      CASE WHEN p_speechiness IS NULL OR t.speechiness IS NULL THEN NULL
           ELSE ABS(t.speechiness - p_speechiness) * 0.4 END AS d_speech
    FROM public.music_reference_tracks t
    WHERE (NOT p_strict_genre OR p_genre IS NULL OR t.genre ILIKE p_genre)
  ),
  weighted AS (
    SELECT s.*,
      -- Weights for each metric (matches divisors above; perceptual ones lower)
      -- Sum of (weight * present) for normalization
      (
        (CASE WHEN d_lufs     IS NOT NULL THEN 2.5 ELSE 0 END) +
        (CASE WHEN d_dr       IS NOT NULL THEN 2.0 ELSE 0 END) +
        (CASE WHEN d_centroid IS NOT NULL THEN 2.0 ELSE 0 END) +
        (CASE WHEN d_rolloff  IS NOT NULL THEN 1.2 ELSE 0 END) +
        (CASE WHEN d_flatness IS NOT NULL THEN 1.2 ELSE 0 END) +
        (CASE WHEN d_zcr      IS NOT NULL THEN 1.0 ELSE 0 END) +
        (CASE WHEN d_bw       IS NOT NULL THEN 1.0 ELSE 0 END) +
        (CASE WHEN bpm_diff   IS NOT NULL THEN 1.5 ELSE 0 END) +
        (CASE WHEN d_energy   IS NOT NULL THEN 0.6 ELSE 0 END) +
        (CASE WHEN d_dance    IS NOT NULL THEN 0.5 ELSE 0 END) +
        (CASE WHEN d_val      IS NOT NULL THEN 0.4 ELSE 0 END) +
        (CASE WHEN d_acous    IS NOT NULL THEN 0.4 ELSE 0 END) +
        (CASE WHEN d_instr    IS NOT NULL THEN 0.3 ELSE 0 END) +
        (CASE WHEN d_live     IS NOT NULL THEN 0.3 ELSE 0 END) +
        (CASE WHEN d_speech   IS NOT NULL THEN 0.4 ELSE 0 END)
      ) AS total_weight,
      (
        COALESCE(d_lufs * 2.5,     0) +
        COALESCE(d_dr * 2.0,       0) +
        COALESCE(d_centroid * 2.0, 0) +
        COALESCE(d_rolloff * 1.2,  0) +
        COALESCE(d_flatness * 1.2, 0) +
        COALESCE(d_zcr * 1.0,      0) +
        COALESCE(d_bw * 1.0,       0) +
        COALESCE((bpm_diff / 30.0) * 1.5, 0) +
        COALESCE(d_energy * 0.6,   0) +
        COALESCE(d_dance * 0.5,    0) +
        COALESCE(d_val * 0.4,      0) +
        COALESCE(d_acous * 0.4,    0) +
        COALESCE(d_instr * 0.3,    0) +
        COALESCE(d_live * 0.3,     0) +
        COALESCE(d_speech * 0.4,   0)
      ) AS weighted_sum
    FROM scored s
  ),
  ranked AS (
    SELECT w.*,
      CASE WHEN total_weight > 0 THEN weighted_sum / total_weight ELSE 999 END AS norm_distance,
      -- Tonal bonus (small): same key+mode -0.15, only key -0.07
      CASE
        WHEN p_key_name IS NOT NULL AND p_mode IS NOT NULL
             AND w.key_name = p_key_name AND w.mode = p_mode THEN -0.15
        WHEN p_key_name IS NOT NULL AND w.key_name = p_key_name THEN -0.07
        ELSE 0
      END AS key_bonus,
      -- Genre bonus (small)
      CASE WHEN p_genre IS NOT NULL AND w.genre ILIKE p_genre THEN -0.10 ELSE 0 END AS genre_bonus
    FROM weighted w
  )
  SELECT
    r.band, r.filename, r.genre, r.tempo_bpm, r.key_name, r.mode,
    r.lufs_integrated, r.dynamic_range_db, r.energy, r.danceability,
    r.valence, r.acousticness, r.instrumentalness, r.spectral_centroid,
    r.speechiness, r.liveness, r.spectral_flatness, r.zero_crossing_rate,
    ROUND((1.0 / (1.0 + GREATEST(r.norm_distance + r.key_bonus + r.genre_bonus, 0)))::numeric, 4) AS similarity_score
  FROM ranked r
  ORDER BY (r.norm_distance + r.key_bonus + r.genre_bonus) ASC
  LIMIT GREATEST(p_limit, 1);
$$;
