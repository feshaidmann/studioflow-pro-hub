-- ============================================================
-- Tabela: music_reference_tracks
-- ============================================================
CREATE TABLE public.music_reference_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  band text NOT NULL,
  filename text NOT NULL,
  genre text NOT NULL DEFAULT '',
  source_batch text NOT NULL DEFAULT '',
  analysis_date timestamptz,

  duration_sec numeric,
  tempo_bpm numeric,
  tempo_confidence numeric,
  key_index integer,
  key_name text,
  mode text,

  danceability numeric,
  energy numeric,
  loudness_rms_db numeric,
  lufs_integrated numeric,
  lufs_method text,
  dynamic_range_db numeric,
  speechiness numeric,
  acousticness numeric,
  instrumentalness numeric,
  liveness numeric,
  valence numeric,

  spectral_centroid numeric,
  spectral_bandwidth numeric,
  spectral_rolloff numeric,
  spectral_flatness numeric,
  zero_crossing_rate numeric,

  spectral_contrast numeric[],
  mfcc numeric[],
  chroma_cens numeric[],

  segments_count integer,
  beat_times jsonb DEFAULT '[]'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT music_reference_tracks_band_filename_unique UNIQUE (band, filename)
);

CREATE INDEX idx_music_reference_tracks_genre ON public.music_reference_tracks (genre);
CREATE INDEX idx_music_reference_tracks_band ON public.music_reference_tracks (band);
CREATE INDEX idx_music_reference_tracks_batch ON public.music_reference_tracks (source_batch);

ALTER TABLE public.music_reference_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reference tracks"
  ON public.music_reference_tracks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert reference tracks"
  ON public.music_reference_tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reference tracks"
  ON public.music_reference_tracks
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reference tracks"
  ON public.music_reference_tracks
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_music_reference_tracks_updated_at
  BEFORE UPDATE ON public.music_reference_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Atualiza recalcular_benchmark_genero (combina análises de usuário + referência)
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_benchmark_genero(p_genero text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_keys jsonb;
BEGIN
  WITH all_tracks AS (
    SELECT danceability, energy, loudness_db AS loud, speechiness, acousticness,
           instrumentalness, liveness, valence, tempo_bpm, lufs_integrated,
           key_name, mode_name AS mode_label
      FROM public.music_dna_analyses
     WHERE genre = p_genero AND danceability IS NOT NULL
    UNION ALL
    SELECT danceability, energy, loudness_rms_db AS loud, speechiness, acousticness,
           instrumentalness, liveness, valence, tempo_bpm, lufs_integrated,
           key_name, mode AS mode_label
      FROM public.music_reference_tracks
     WHERE genre = p_genero AND danceability IS NOT NULL
  )
  SELECT COUNT(*), AVG(danceability), AVG(energy), AVG(loud),
         AVG(speechiness), AVG(acousticness), AVG(instrumentalness),
         AVG(liveness), AVG(valence), AVG(tempo_bpm), AVG(lufs_integrated)
    INTO v_total, v_dance, v_energy, v_loud, v_speech, v_acous, v_instr,
         v_live, v_val, v_tempo, v_lufs
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
    avg_valence, avg_tempo_bpm, avg_lufs, top_keys, atualizado_em
  ) VALUES (
    p_genero, v_total, v_dance, v_energy, v_loud, v_speech, v_acous, v_instr,
    v_live, v_val, v_tempo, v_lufs, COALESCE(v_keys, '{}'::jsonb), now()
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
    top_keys = EXCLUDED.top_keys,
    atualizado_em = now();
END;
$function$;

-- ============================================================
-- get_genre_reference_examples: retorna faixas próximas da mediana
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_genre_reference_examples(
  p_genero text,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  band text,
  filename text,
  tempo_bpm numeric,
  key_name text,
  mode text,
  lufs_integrated numeric,
  dynamic_range_db numeric,
  danceability numeric,
  energy numeric,
  valence numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH medians AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY tempo_bpm)        AS m_tempo,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY lufs_integrated)  AS m_lufs,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY danceability)     AS m_dance,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY energy)           AS m_energy,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY valence)          AS m_valence
    FROM public.music_reference_tracks
    WHERE genre = p_genero AND tempo_bpm IS NOT NULL
  )
  SELECT t.band, t.filename, t.tempo_bpm, t.key_name, t.mode,
         t.lufs_integrated, t.dynamic_range_db,
         t.danceability, t.energy, t.valence
    FROM public.music_reference_tracks t, medians m
   WHERE t.genre = p_genero
     AND t.tempo_bpm IS NOT NULL
   ORDER BY (
       ABS(COALESCE(t.tempo_bpm,0)        - COALESCE(m.m_tempo,0))   / NULLIF(GREATEST(m.m_tempo,1),0)
     + ABS(COALESCE(t.lufs_integrated,0)  - COALESCE(m.m_lufs,0))    / NULLIF(GREATEST(ABS(m.m_lufs),1),0)
     + ABS(COALESCE(t.danceability,0)     - COALESCE(m.m_dance,0))
     + ABS(COALESCE(t.energy,0)           - COALESCE(m.m_energy,0))
     + ABS(COALESCE(t.valence,0)          - COALESCE(m.m_valence,0))
   ) ASC
   LIMIT GREATEST(p_limit, 1);
$$;

-- ============================================================
-- upsert_reference_tracks: usado pela edge function de importação
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_reference_tracks(p_rows jsonb)
RETURNS TABLE (inserted_count integer, updated_count integer, genres_updated text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inserted integer := 0;
  v_updated  integer := 0;
  v_genres   text[];
  r jsonb;
  v_existing uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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
$$;