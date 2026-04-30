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
BEGIN
  -- Permite chamadas server-side (sem usuário) OU usuários com papel admin
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem importar faixas de referência';
  END IF;

  FOR r IN SELECT jsonb_array_elements(p_rows)
  LOOP
    SELECT id INTO v_existing
      FROM public.music_reference_tracks
     WHERE band = (r->>'band') AND filename = (r->>'filename');

    INSERT INTO public.music_reference_tracks (
      band, filename, genre, source_batch, analysis_date,
      duration_sec, tempo_bpm, tempo_confidence, key_index, key_name, mode,
      danceability, energy, loudness_rms_db, lufs_integrated, lufs_method, dynamic_range_db,
      speechiness, acousticness, instrumentalness, liveness, valence,
      spectral_centroid, spectral_bandwidth, spectral_rolloff, spectral_flatness, zero_crossing_rate,
      spectral_contrast, mfcc, chroma_cens, segments_count, beat_times
    ) VALUES (
      r->>'band', r->>'filename', COALESCE(r->>'genre',''), COALESCE(r->>'source_batch',''),
      NULLIF(r->>'analysis_date','')::timestamptz,
      NULLIF(r->>'duration_sec','')::numeric,
      NULLIF(r->>'tempo_bpm','')::numeric,
      NULLIF(r->>'tempo_confidence','')::numeric,
      NULLIF(r->>'key_index','')::integer,
      r->>'key_name', r->>'mode',
      NULLIF(r->>'danceability','')::numeric,
      NULLIF(r->>'energy','')::numeric,
      NULLIF(r->>'loudness_rms_db','')::numeric,
      NULLIF(r->>'lufs_integrated','')::numeric,
      r->>'lufs_method',
      NULLIF(r->>'dynamic_range_db','')::numeric,
      NULLIF(r->>'speechiness','')::numeric,
      NULLIF(r->>'acousticness','')::numeric,
      NULLIF(r->>'instrumentalness','')::numeric,
      NULLIF(r->>'liveness','')::numeric,
      NULLIF(r->>'valence','')::numeric,
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
      COALESCE(r->'beat_times', '[]'::jsonb)
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
      updated_at = now();

    IF v_existing IS NULL THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  SELECT ARRAY(SELECT DISTINCT (r->>'genre') FROM jsonb_array_elements(p_rows) AS r WHERE COALESCE(r->>'genre','') <> '')
    INTO v_genres;

  inserted_count := v_inserted;
  updated_count  := v_updated;
  genres_updated := COALESCE(v_genres, ARRAY[]::text[]);
  RETURN NEXT;
END;
$function$;