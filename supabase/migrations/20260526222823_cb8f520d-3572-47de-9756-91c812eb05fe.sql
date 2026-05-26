-- 1) Atualiza upsert_reference_tracks: NULL por feature, não quarentena total
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

    -- Coleta motivos apenas para registro; NÃO quarentena a faixa toda
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

    -- Anula individualmente cada feature fora de faixa em vez de descartar a faixa
    IF v_mode IS NOT NULL AND v_mode NOT IN ('major','minor') THEN v_mode := NULL; END IF;
    IF v_key IN ('major','minor') THEN v_key := NULL; END IF;
    IF v_energy IS NOT NULL AND (v_energy < 0 OR v_energy > 1) THEN v_energy := NULL; END IF;
    IF v_dance  IS NOT NULL AND (v_dance  < 0 OR v_dance  > 1) THEN v_dance  := NULL; END IF;
    IF v_val    IS NOT NULL AND (v_val    < 0 OR v_val    > 1) THEN v_val    := NULL; END IF;
    IF v_acous  IS NOT NULL AND (v_acous  < 0 OR v_acous  > 1) THEN v_acous  := NULL; END IF;
    IF v_instr  IS NOT NULL AND (v_instr  < 0 OR v_instr  > 1) THEN v_instr  := NULL; END IF;
    IF v_live   IS NOT NULL AND (v_live   < 0 OR v_live   > 1) THEN v_live   := NULL; END IF;
    IF v_speech IS NOT NULL AND (v_speech < 0 OR v_speech > 1) THEN v_speech := NULL; END IF;

    -- Quarentena somente quando NÃO sobra nenhuma feature básica utilizável
    v_quarantined := (
      NULLIF(r->>'lufs_integrated','')::numeric IS NULL
      AND NULLIF(r->>'spectral_centroid','')::numeric IS NULL
      AND NULLIF(r->>'dynamic_range_db','')::numeric IS NULL
      AND NOT (r ? 'mfcc')
      AND NOT (r ? 'chroma_cens')
    );
    IF v_quarantined THEN
      v_reason := COALESCE(NULLIF(v_reason,''), 'no_features');
    END IF;

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

-- 2) Backfill: anular features inválidas e remover quarentena de faixas afetadas
UPDATE public.music_reference_tracks
SET
  energy           = CASE WHEN energy           IS NOT NULL AND (energy           < 0 OR energy           > 1) THEN NULL ELSE energy           END,
  danceability     = CASE WHEN danceability     IS NOT NULL AND (danceability     < 0 OR danceability     > 1) THEN NULL ELSE danceability     END,
  valence          = CASE WHEN valence          IS NOT NULL AND (valence          < 0 OR valence          > 1) THEN NULL ELSE valence          END,
  acousticness     = CASE WHEN acousticness     IS NOT NULL AND (acousticness     < 0 OR acousticness     > 1) THEN NULL ELSE acousticness     END,
  instrumentalness = CASE WHEN instrumentalness IS NOT NULL AND (instrumentalness < 0 OR instrumentalness > 1) THEN NULL ELSE instrumentalness END,
  liveness         = CASE WHEN liveness         IS NOT NULL AND (liveness         < 0 OR liveness         > 1) THEN NULL ELSE liveness         END,
  speechiness      = CASE WHEN speechiness      IS NOT NULL AND (speechiness      < 0 OR speechiness      > 1) THEN NULL ELSE speechiness      END,
  mode             = CASE WHEN mode IS NOT NULL AND mode NOT IN ('major','minor') THEN NULL ELSE mode END,
  key_name         = CASE WHEN key_name IN ('major','minor') THEN NULL ELSE key_name END,
  quarantined      = false,
  quarantine_reason = NULL,
  updated_at = now()
WHERE quarantined = true
  AND quarantine_reason IS NOT NULL
  AND quarantine_reason ~ '(out_of_range|mode_invalid|key_swapped)'
  AND (
    mfcc IS NOT NULL
    OR chroma_cens IS NOT NULL
    OR (lufs_integrated IS NOT NULL AND spectral_centroid IS NOT NULL AND dynamic_range_db IS NOT NULL)
  );