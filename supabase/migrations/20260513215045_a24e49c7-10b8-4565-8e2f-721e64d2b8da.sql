
-- ============================================================
-- ONDA 1: Saneamento de dados do catálogo de referências
-- ============================================================

-- 1.1 Coluna de quarentena
ALTER TABLE public.music_reference_tracks
  ADD COLUMN IF NOT EXISTS quarantined boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quarantine_reason text;

-- 1.2 Marca todas as linhas atualmente corrompidas
UPDATE public.music_reference_tracks t
   SET quarantined = true,
       quarantine_reason = trim(both ',' FROM concat_ws(',',
         CASE WHEN mode IS NOT NULL AND mode NOT IN ('major','minor') THEN 'mode_invalid' END,
         CASE WHEN key_name IN ('major','minor') THEN 'key_swapped' END,
         CASE WHEN energy IS NOT NULL AND (energy < 0 OR energy > 1) THEN 'energy_out_of_range' END,
         CASE WHEN danceability IS NOT NULL AND (danceability < 0 OR danceability > 1) THEN 'danceability_out_of_range' END,
         CASE WHEN valence IS NOT NULL AND (valence < 0 OR valence > 1) THEN 'valence_out_of_range' END,
         CASE WHEN acousticness IS NOT NULL AND (acousticness < 0 OR acousticness > 1) THEN 'acousticness_out_of_range' END,
         CASE WHEN instrumentalness IS NOT NULL AND (instrumentalness < 0 OR instrumentalness > 1) THEN 'instrumentalness_out_of_range' END,
         CASE WHEN liveness IS NOT NULL AND (liveness < 0 OR liveness > 1) THEN 'liveness_out_of_range' END,
         CASE WHEN speechiness IS NOT NULL AND (speechiness < 0 OR speechiness > 1) THEN 'speechiness_out_of_range' END,
         CASE WHEN EXISTS (
           SELECT 1 FROM public.music_reference_tracks b
            WHERE lower(b.band) = lower(t.genre)
              AND b.id <> t.id
         ) THEN 'genre_is_band_name' END
       ))
 WHERE
       (mode IS NOT NULL AND mode NOT IN ('major','minor'))
    OR  key_name IN ('major','minor')
    OR (energy IS NOT NULL AND (energy < 0 OR energy > 1))
    OR (danceability IS NOT NULL AND (danceability < 0 OR danceability > 1))
    OR (valence IS NOT NULL AND (valence < 0 OR valence > 1))
    OR (acousticness IS NOT NULL AND (acousticness < 0 OR acousticness > 1))
    OR (instrumentalness IS NOT NULL AND (instrumentalness < 0 OR instrumentalness > 1))
    OR (liveness IS NOT NULL AND (liveness < 0 OR liveness > 1))
    OR (speechiness IS NOT NULL AND (speechiness < 0 OR speechiness > 1))
    OR EXISTS (
        SELECT 1 FROM public.music_reference_tracks b
         WHERE lower(b.band) = lower(t.genre) AND b.id <> t.id
       );

-- Índice para acelerar filtragem
CREATE INDEX IF NOT EXISTS idx_music_reference_tracks_active
  ON public.music_reference_tracks (genre)
  WHERE quarantined = false;

-- 1.3 Endurece o upsert: marca quarentena automaticamente em valores fora de domínio
CREATE OR REPLACE FUNCTION public.upsert_reference_tracks(p_rows jsonb)
 RETURNS TABLE(inserted_count integer, updated_count integer, genres_updated text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
  v_updated  integer := 0;
  v_genres   text[];
  r jsonb;
  v_existing uuid;
  v_energy numeric; v_dance numeric; v_val numeric; v_acous numeric;
  v_instr numeric; v_live numeric; v_speech numeric;
  v_mode text; v_key text;
  v_quarantined boolean; v_reason text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem importar faixas de referência';
  END IF;

  FOR r IN SELECT jsonb_array_elements(p_rows)
  LOOP
    v_energy := NULLIF(r->>'energy','')::numeric;
    v_dance  := NULLIF(r->>'danceability','')::numeric;
    v_val    := NULLIF(r->>'valence','')::numeric;
    v_acous  := NULLIF(r->>'acousticness','')::numeric;
    v_instr  := NULLIF(r->>'instrumentalness','')::numeric;
    v_live   := NULLIF(r->>'liveness','')::numeric;
    v_speech := NULLIF(r->>'speechiness','')::numeric;
    v_mode   := r->>'mode';
    v_key    := r->>'key_name';

    v_reason := trim(both ',' FROM concat_ws(',',
      CASE WHEN v_mode IS NOT NULL AND v_mode NOT IN ('major','minor') THEN 'mode_invalid' END,
      CASE WHEN v_key IN ('major','minor') THEN 'key_swapped' END,
      CASE WHEN v_energy IS NOT NULL AND (v_energy < 0 OR v_energy > 1) THEN 'energy_out_of_range' END,
      CASE WHEN v_dance  IS NOT NULL AND (v_dance  < 0 OR v_dance  > 1) THEN 'danceability_out_of_range' END,
      CASE WHEN v_val    IS NOT NULL AND (v_val    < 0 OR v_val    > 1) THEN 'valence_out_of_range' END,
      CASE WHEN v_acous  IS NOT NULL AND (v_acous  < 0 OR v_acous  > 1) THEN 'acousticness_out_of_range' END,
      CASE WHEN v_instr  IS NOT NULL AND (v_instr  < 0 OR v_instr  > 1) THEN 'instrumentalness_out_of_range' END,
      CASE WHEN v_live   IS NOT NULL AND (v_live   < 0 OR v_live   > 1) THEN 'liveness_out_of_range' END,
      CASE WHEN v_speech IS NOT NULL AND (v_speech < 0 OR v_speech > 1) THEN 'speechiness_out_of_range' END
    ));
    v_quarantined := length(coalesce(v_reason,'')) > 0;

    SELECT id INTO v_existing
      FROM public.music_reference_tracks
     WHERE band = (r->>'band') AND filename = (r->>'filename');

    INSERT INTO public.music_reference_tracks (
      band, filename, genre, source_batch, analysis_date,
      duration_sec, tempo_bpm, tempo_confidence, key_index, key_name, mode,
      danceability, energy, loudness_rms_db, lufs_integrated, lufs_method, dynamic_range_db,
      speechiness, acousticness, instrumentalness, liveness, valence,
      spectral_centroid, spectral_bandwidth, spectral_rolloff, spectral_flatness, zero_crossing_rate,
      spectral_contrast, mfcc, chroma_cens, segments_count, beat_times,
      quarantined, quarantine_reason
    ) VALUES (
      r->>'band', r->>'filename', COALESCE(r->>'genre',''), COALESCE(r->>'source_batch',''),
      NULLIF(r->>'analysis_date','')::timestamptz,
      NULLIF(r->>'duration_sec','')::numeric,
      NULLIF(r->>'tempo_bpm','')::numeric,
      NULLIF(r->>'tempo_confidence','')::numeric,
      NULLIF(r->>'key_index','')::integer,
      v_key, v_mode,
      v_dance, v_energy,
      NULLIF(r->>'loudness_rms_db','')::numeric,
      NULLIF(r->>'lufs_integrated','')::numeric,
      r->>'lufs_method',
      NULLIF(r->>'dynamic_range_db','')::numeric,
      v_speech, v_acous, v_instr, v_live, v_val,
      NULLIF(r->>'spectral_centroid','')::numeric,
      NULLIF(r->>'spectral_bandwidth','')::numeric,
      NULLIF(r->>'spectral_rolloff','')::numeric,
      NULLIF(r->>'spectral_flatness','')::numeric,
      NULLIF(r->>'zero_crossing_rate','')::numeric,
      CASE WHEN r ? 'spectral_contrast'
           THEN ARRAY(SELECT (jsonb_array_elements_text(r->'spectral_contrast'))::numeric)
           ELSE NULL END,
      CASE WHEN r ? 'mfcc'
           THEN ARRAY(SELECT (jsonb_array_elements_text(r->'mfcc'))::numeric)
           ELSE NULL END,
      CASE WHEN r ? 'chroma_cens'
           THEN ARRAY(SELECT (jsonb_array_elements_text(r->'chroma_cens'))::numeric)
           ELSE NULL END,
      NULLIF(r->>'segments_count','')::integer,
      COALESCE(r->'beat_times', '[]'::jsonb),
      v_quarantined, NULLIF(v_reason,'')
    )
    ON CONFLICT (band, filename) DO UPDATE SET
      genre = EXCLUDED.genre,
      source_batch = EXCLUDED.source_batch,
      analysis_date = EXCLUDED.analysis_date,
      duration_sec = EXCLUDED.duration_sec,
      tempo_bpm = EXCLUDED.tempo_bpm,
      tempo_confidence = EXCLUDED.tempo_confidence,
      key_index = EXCLUDED.key_index,
      key_name = EXCLUDED.key_name,
      mode = EXCLUDED.mode,
      danceability = EXCLUDED.danceability,
      energy = EXCLUDED.energy,
      loudness_rms_db = EXCLUDED.loudness_rms_db,
      lufs_integrated = EXCLUDED.lufs_integrated,
      lufs_method = EXCLUDED.lufs_method,
      dynamic_range_db = EXCLUDED.dynamic_range_db,
      speechiness = EXCLUDED.speechiness,
      acousticness = EXCLUDED.acousticness,
      instrumentalness = EXCLUDED.instrumentalness,
      liveness = EXCLUDED.liveness,
      valence = EXCLUDED.valence,
      spectral_centroid = EXCLUDED.spectral_centroid,
      spectral_bandwidth = EXCLUDED.spectral_bandwidth,
      spectral_rolloff = EXCLUDED.spectral_rolloff,
      spectral_flatness = EXCLUDED.spectral_flatness,
      zero_crossing_rate = EXCLUDED.zero_crossing_rate,
      spectral_contrast = EXCLUDED.spectral_contrast,
      mfcc = EXCLUDED.mfcc,
      chroma_cens = EXCLUDED.chroma_cens,
      segments_count = EXCLUDED.segments_count,
      beat_times = EXCLUDED.beat_times,
      quarantined = EXCLUDED.quarantined,
      quarantine_reason = EXCLUDED.quarantine_reason,
      updated_at = now();

    IF v_existing IS NULL THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  SELECT ARRAY(
    SELECT DISTINCT (g->>'genre')
      FROM jsonb_array_elements(p_rows) AS g
     WHERE COALESCE(g->>'genre','') <> ''
  ) INTO v_genres;

  inserted_count := v_inserted;
  updated_count  := v_updated;
  genres_updated := COALESCE(v_genres, ARRAY[]::text[]);
  RETURN NEXT;
END;
$function$;

-- ============================================================
-- ONDA 2: Fairness no ranking de vizinhos
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_nearest_reference_tracks(
  p_tempo_bpm numeric DEFAULT NULL::numeric,
  p_lufs_integrated numeric DEFAULT NULL::numeric,
  p_energy numeric DEFAULT NULL::numeric,
  p_danceability numeric DEFAULT NULL::numeric,
  p_valence numeric DEFAULT NULL::numeric,
  p_acousticness numeric DEFAULT NULL::numeric,
  p_instrumentalness numeric DEFAULT NULL::numeric,
  p_dynamic_range_db numeric DEFAULT NULL::numeric,
  p_spectral_centroid numeric DEFAULT NULL::numeric,
  p_genre text DEFAULT NULL::text,
  p_limit integer DEFAULT 6,
  p_strict_genre boolean DEFAULT false,
  p_speechiness numeric DEFAULT NULL::numeric,
  p_liveness numeric DEFAULT NULL::numeric,
  p_spectral_bandwidth numeric DEFAULT NULL::numeric,
  p_spectral_rolloff numeric DEFAULT NULL::numeric,
  p_spectral_flatness numeric DEFAULT NULL::numeric,
  p_zero_crossing_rate numeric DEFAULT NULL::numeric,
  p_key_name text DEFAULT NULL::text,
  p_mode text DEFAULT NULL::text
)
 RETURNS TABLE(
   band text, filename text, genre text, tempo_bpm numeric, key_name text, mode text,
   lufs_integrated numeric, dynamic_range_db numeric, energy numeric, danceability numeric,
   valence numeric, acousticness numeric, instrumentalness numeric, spectral_centroid numeric,
   speechiness numeric, liveness numeric, spectral_flatness numeric, zero_crossing_rate numeric,
   similarity_score numeric, dims_used integer, dims_total integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH scored AS (
    SELECT
      t.*,
      CASE
        WHEN p_tempo_bpm IS NULL OR t.tempo_bpm IS NULL THEN NULL::numeric
        ELSE LEAST(
          ABS(t.tempo_bpm - p_tempo_bpm),
          -- Penaliza levemente half/double-time (fator 1.4)
          ABS(t.tempo_bpm - p_tempo_bpm * 2) * 1.4,
          ABS(t.tempo_bpm - p_tempo_bpm / 2) * 1.4
        )
      END AS bpm_diff,
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
    WHERE t.quarantined = false
      AND (NOT p_strict_genre OR p_genre IS NULL OR t.genre ILIKE p_genre)
  ),
  weighted AS (
    SELECT s.*,
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
        (CASE WHEN d_lufs     IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_dr       IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_centroid IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_rolloff  IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_flatness IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_zcr      IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_bw       IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN bpm_diff   IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_energy   IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_dance    IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_val      IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_acous    IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_instr    IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_live     IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN d_speech   IS NOT NULL THEN 1 ELSE 0 END)
      )::integer AS dims_used,
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
      -- Bônus reduzidos para evitar inflar score por gênero/tom
      CASE
        WHEN p_key_name IS NOT NULL AND p_mode IS NOT NULL
             AND w.key_name = p_key_name AND w.mode = p_mode THEN -0.05
        WHEN p_key_name IS NOT NULL AND w.key_name = p_key_name THEN -0.025
        ELSE 0
      END AS key_bonus,
      CASE WHEN p_genre IS NOT NULL AND w.genre ILIKE p_genre THEN -0.10 ELSE 0 END AS genre_bonus
    FROM weighted w
    WHERE w.dims_used >= 8  -- exige cobertura mínima de dimensões
  ),
  -- Cap de 2 faixas por banda (evita Beastie Boys monopolizando o top)
  capped AS (
    SELECT r.*,
      ROW_NUMBER() OVER (
        PARTITION BY r.band
        ORDER BY (r.norm_distance + r.key_bonus + r.genre_bonus) ASC, r.filename ASC
      ) AS rn_band
    FROM ranked r
  )
  SELECT
    c.band, c.filename, c.genre, c.tempo_bpm, c.key_name, c.mode,
    c.lufs_integrated, c.dynamic_range_db, c.energy, c.danceability,
    c.valence, c.acousticness, c.instrumentalness, c.spectral_centroid,
    c.speechiness, c.liveness, c.spectral_flatness, c.zero_crossing_rate,
    ROUND((1.0 / (1.0 + GREATEST(c.norm_distance + c.key_bonus + c.genre_bonus, 0)))::numeric, 4) AS similarity_score,
    c.dims_used,
    15 AS dims_total
  FROM capped c
  WHERE c.rn_band <= 2
  ORDER BY (c.norm_distance + c.key_bonus + c.genre_bonus) ASC, c.band ASC, c.filename ASC
  LIMIT GREATEST(p_limit, 1);
$function$;

-- ============================================================
-- Recalcular benchmarks ignorando linhas em quarentena
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_benchmark_genero(p_genero text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
  v_dance numeric; v_energy numeric; v_loud numeric; v_speech numeric;
  v_acous numeric; v_instr numeric; v_live numeric; v_val numeric;
  v_tempo numeric; v_lufs numeric; v_centroid numeric; v_flatness numeric;
  v_zcr numeric; v_dr numeric; v_keys jsonb;
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
     WHERE genre = p_genero AND danceability IS NOT NULL AND quarantined = false
  )
  SELECT COUNT(*), AVG(danceability), AVG(energy), AVG(loud),
         AVG(speechiness), AVG(acousticness), AVG(instrumentalness),
         AVG(liveness), AVG(valence), AVG(tempo_bpm), AVG(lufs_integrated),
         AVG(spectral_centroid), AVG(spectral_flatness), AVG(zero_crossing_rate),
         AVG(dynamic_range_db)
    INTO v_total, v_dance, v_energy, v_loud, v_speech, v_acous, v_instr,
         v_live, v_val, v_tempo, v_lufs, v_centroid, v_flatness, v_zcr, v_dr
    FROM all_tracks;

  IF v_total = 0 THEN RETURN; END IF;

  WITH all_keys AS (
    SELECT key_name, mode_name AS mode_label FROM public.music_dna_analyses
     WHERE genre = p_genero AND key_name IS NOT NULL
    UNION ALL
    SELECT key_name, mode AS mode_label FROM public.music_reference_tracks
     WHERE genre = p_genero AND key_name IS NOT NULL AND quarantined = false
  )
  SELECT COALESCE(jsonb_object_agg(tom, contagem), '{}'::jsonb)
    INTO v_keys
    FROM (
      SELECT COALESCE(key_name, 'C') || ' ' || COALESCE(mode_label, 'major') AS tom,
             COUNT(*) AS contagem
        FROM all_keys
       GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    ) sub;

  INSERT INTO public.music_dna_benchmarks (
    genero, total_faixas, avg_danceability, avg_energy, avg_loudness_db,
    avg_speechiness, avg_acousticness, avg_instrumentalness, avg_liveness,
    avg_valence, avg_tempo_bpm, avg_lufs,
    avg_spectral_centroid, avg_spectral_flatness, avg_zero_crossing_rate, avg_dynamic_range_db,
    top_keys, atualizado_em
  ) VALUES (
    p_genero, v_total, v_dance, v_energy, v_loud, v_speech, v_acous, v_instr,
    v_live, v_val, v_tempo, v_lufs, v_centroid, v_flatness, v_zcr, v_dr,
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
$function$;

-- Recalcula benchmarks de todos os gêneros (limpando o efeito das linhas corrompidas)
DO $$
DECLARE g text;
BEGIN
  FOR g IN SELECT DISTINCT genre FROM public.music_reference_tracks WHERE genre <> '' LOOP
    PERFORM public.recalcular_benchmark_genero(g);
  END LOOP;
END $$;

-- Atualiza também a contagem usada pelo edge function
CREATE OR REPLACE FUNCTION public.count_reference_tracks_by_genre(p_genre text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
    FROM public.music_reference_tracks
   WHERE p_genre IS NOT NULL
     AND genre ILIKE p_genre
     AND quarantined = false;
$function$;
