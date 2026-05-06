
-- Add new average columns to music_dna_benchmarks
ALTER TABLE public.music_dna_benchmarks
  ADD COLUMN IF NOT EXISTS avg_spectral_centroid numeric,
  ADD COLUMN IF NOT EXISTS avg_spectral_flatness numeric,
  ADD COLUMN IF NOT EXISTS avg_zero_crossing_rate numeric,
  ADD COLUMN IF NOT EXISTS avg_dynamic_range_db numeric;

-- Drop and recreate find_nearest_reference_tracks with extended params
DROP FUNCTION IF EXISTS public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, integer, boolean
);

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
  SELECT
    t.band, t.filename, t.genre, t.tempo_bpm, t.key_name, t.mode,
    t.lufs_integrated, t.dynamic_range_db, t.energy, t.danceability,
    t.valence, t.acousticness, t.instrumentalness, t.spectral_centroid,
    t.speechiness, t.liveness, t.spectral_flatness, t.zero_crossing_rate,
    ROUND((1.0 / (1.0 + (
        COALESCE(ABS(t.tempo_bpm           - p_tempo_bpm)           / 40.0,    0)
      + COALESCE(ABS(t.lufs_integrated     - p_lufs_integrated)     / 8.0,     0)
      + COALESCE(ABS(t.energy              - p_energy)              * 1.2,     0)
      + COALESCE(ABS(t.danceability        - p_danceability)        * 1.0,     0)
      + COALESCE(ABS(t.valence             - p_valence)             * 0.8,     0)
      + COALESCE(ABS(t.acousticness        - p_acousticness)        * 0.8,     0)
      + COALESCE(ABS(t.instrumentalness    - p_instrumentalness)    * 0.6,     0)
      + COALESCE(ABS(t.dynamic_range_db    - p_dynamic_range_db)    / 10.0,    0)
      + COALESCE(ABS(t.spectral_centroid   - p_spectral_centroid)   / 2000.0,  0)
      + COALESCE(ABS(t.speechiness         - p_speechiness)         * 1.0,     0)
      + COALESCE(ABS(t.liveness            - p_liveness)            * 0.8,     0)
      + COALESCE(ABS(t.spectral_bandwidth  - p_spectral_bandwidth)  / 1500.0,  0)
      + COALESCE(ABS(t.spectral_rolloff    - p_spectral_rolloff)    / 3000.0,  0)
      + COALESCE(ABS(t.spectral_flatness   - p_spectral_flatness)   * 5.0,     0)
      + COALESCE(ABS(t.zero_crossing_rate  - p_zero_crossing_rate)  * 4.0,     0)
    )))::numeric, 4) AS similarity_score
  FROM public.music_reference_tracks t
  WHERE (NOT p_strict_genre OR p_genre IS NULL OR t.genre ILIKE p_genre)
  ORDER BY (
      COALESCE(ABS(t.tempo_bpm           - p_tempo_bpm)           / 40.0,    0)
    + COALESCE(ABS(t.lufs_integrated     - p_lufs_integrated)     / 8.0,     0)
    + COALESCE(ABS(t.energy              - p_energy)              * 1.2,     0)
    + COALESCE(ABS(t.danceability        - p_danceability)        * 1.0,     0)
    + COALESCE(ABS(t.valence             - p_valence)             * 0.8,     0)
    + COALESCE(ABS(t.acousticness        - p_acousticness)        * 0.8,     0)
    + COALESCE(ABS(t.instrumentalness    - p_instrumentalness)    * 0.6,     0)
    + COALESCE(ABS(t.dynamic_range_db    - p_dynamic_range_db)    / 10.0,    0)
    + COALESCE(ABS(t.spectral_centroid   - p_spectral_centroid)   / 2000.0,  0)
    + COALESCE(ABS(t.speechiness         - p_speechiness)         * 1.0,     0)
    + COALESCE(ABS(t.liveness            - p_liveness)            * 0.8,     0)
    + COALESCE(ABS(t.spectral_bandwidth  - p_spectral_bandwidth)  / 1500.0,  0)
    + COALESCE(ABS(t.spectral_rolloff    - p_spectral_rolloff)    / 3000.0,  0)
    + COALESCE(ABS(t.spectral_flatness   - p_spectral_flatness)   * 5.0,     0)
    + COALESCE(ABS(t.zero_crossing_rate  - p_zero_crossing_rate)  * 4.0,     0)
    + CASE WHEN p_genre IS NOT NULL AND t.genre ILIKE p_genre THEN -0.5 ELSE 0 END
    + CASE
        WHEN p_key_name IS NOT NULL AND p_mode IS NOT NULL
             AND t.key_name = p_key_name AND t.mode = p_mode THEN -0.30
        WHEN p_key_name IS NOT NULL AND t.key_name = p_key_name THEN -0.15
        ELSE 0
      END
  ) ASC
  LIMIT GREATEST(p_limit, 1);
$$;

-- Update recalcular_benchmark_genero to populate new avg columns
CREATE OR REPLACE FUNCTION public.recalcular_benchmark_genero(p_genero text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_dance numeric;
  v_energy numeric;
  v_loud numeric;
  v_speech numeric;
  v_acous numeric;
  v_instr numeric;
  v_live numeric;
  v_val numeric;
  v_tempo numeric;
  v_lufs numeric;
  v_centroid numeric;
  v_flatness numeric;
  v_zcr numeric;
  v_dr numeric;
  v_keys jsonb;
BEGIN
  WITH all_tracks AS (
    SELECT danceability, energy, loudness_db AS loud, speechiness, acousticness,
           instrumentalness, liveness, valence, tempo_bpm, lufs_integrated,
           NULL::numeric AS spectral_centroid,
           NULL::numeric AS spectral_flatness,
           NULL::numeric AS zero_crossing_rate,
           dynamic_range_db,
           key_name, mode_name AS mode_label
      FROM public.music_dna_analyses
     WHERE genre = p_genero AND danceability IS NOT NULL
    UNION ALL
    SELECT danceability, energy, loudness_rms_db AS loud, speechiness, acousticness,
           instrumentalness, liveness, valence, tempo_bpm, lufs_integrated,
           spectral_centroid, spectral_flatness, zero_crossing_rate,
           dynamic_range_db,
           key_name, mode AS mode_label
      FROM public.music_reference_tracks
     WHERE genre = p_genero AND danceability IS NOT NULL
  )
  SELECT COUNT(*), AVG(danceability), AVG(energy), AVG(loud),
         AVG(speechiness), AVG(acousticness), AVG(instrumentalness),
         AVG(liveness), AVG(valence), AVG(tempo_bpm), AVG(lufs_integrated),
         AVG(spectral_centroid), AVG(spectral_flatness), AVG(zero_crossing_rate),
         AVG(dynamic_range_db)
    INTO v_total, v_dance, v_energy, v_loud, v_speech, v_acous, v_instr,
         v_live, v_val, v_tempo, v_lufs,
         v_centroid, v_flatness, v_zcr, v_dr
    FROM all_tracks;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  WITH all_keys AS (
    SELECT key_name, mode_name AS mode_label FROM public.music_dna_analyses
     WHERE genre = p_genero AND key_name IS NOT NULL
    UNION ALL
    SELECT key_name, mode AS mode_label FROM public.music_reference_tracks
     WHERE genre = p_genero AND key_name IS NOT NULL
  )
  SELECT COALESCE(jsonb_object_agg(tom, contagem), '{}'::jsonb)
    INTO v_keys
    FROM (
      SELECT COALESCE(key_name, 'C') || ' ' || COALESCE(mode_label, 'major') AS tom,
             COUNT(*) AS contagem
        FROM all_keys
       GROUP BY 1
       ORDER BY 2 DESC
       LIMIT 5
    ) sub;

  INSERT INTO public.music_dna_benchmarks (
    genero, total_faixas, avg_danceability, avg_energy, avg_loudness_db,
    avg_speechiness, avg_acousticness, avg_instrumentalness, avg_liveness,
    avg_valence, avg_tempo_bpm, avg_lufs,
    avg_spectral_centroid, avg_spectral_flatness, avg_zero_crossing_rate, avg_dynamic_range_db,
    top_keys, atualizado_em
  ) VALUES (
    p_genero, v_total, v_dance, v_energy, v_loud, v_speech, v_acous, v_instr,
    v_live, v_val, v_tempo, v_lufs,
    v_centroid, v_flatness, v_zcr, v_dr,
    COALESCE(v_keys, '{}'::jsonb), now()
  )
  ON CONFLICT (genero) DO UPDATE SET
    total_faixas = EXCLUDED.total_faixas,
    avg_danceability = EXCLUDED.avg_danceability,
    avg_energy = EXCLUDED.avg_energy,
    avg_loudness_db = EXCLUDED.avg_loudness_db,
    avg_speechiness = EXCLUDED.avg_speechiness,
    avg_acousticness = EXCLUDED.avg_acousticness,
    avg_instrumentalness = EXCLUDED.avg_instrumentalness,
    avg_liveness = EXCLUDED.avg_liveness,
    avg_valence = EXCLUDED.avg_valence,
    avg_tempo_bpm = EXCLUDED.avg_tempo_bpm,
    avg_lufs = EXCLUDED.avg_lufs,
    avg_spectral_centroid = EXCLUDED.avg_spectral_centroid,
    avg_spectral_flatness = EXCLUDED.avg_spectral_flatness,
    avg_zero_crossing_rate = EXCLUDED.avg_zero_crossing_rate,
    avg_dynamic_range_db = EXCLUDED.avg_dynamic_range_db,
    top_keys = EXCLUDED.top_keys,
    atualizado_em = now();
END;
$$;
