CREATE UNIQUE INDEX IF NOT EXISTS music_dna_benchmarks_genero_unique_idx
ON public.music_dna_benchmarks (genero);

CREATE OR REPLACE FUNCTION public.recalcular_benchmark_genero(p_genero text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_keys jsonb;
BEGIN
  SELECT
    COUNT(*),
    AVG(danceability),
    AVG(energy),
    AVG(loudness_db),
    AVG(speechiness),
    AVG(acousticness),
    AVG(instrumentalness),
    AVG(liveness),
    AVG(valence),
    AVG(tempo_bpm),
    AVG(lufs_integrated)
  INTO
    v_total,
    v_dance,
    v_energy,
    v_loud,
    v_speech,
    v_acous,
    v_instr,
    v_live,
    v_val,
    v_tempo,
    v_lufs
  FROM public.music_dna_analyses
  WHERE genre = p_genero
    AND danceability IS NOT NULL;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(jsonb_object_agg(tom, contagem), '{}'::jsonb)
  INTO v_keys
  FROM (
    SELECT
      COALESCE(key_name, 'C') || ' ' || COALESCE(mode_name, 'major') AS tom,
      COUNT(*) AS contagem
    FROM public.music_dna_analyses
    WHERE genre = p_genero
      AND key_name IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 5
  ) sub;

  INSERT INTO public.music_dna_benchmarks (
    genero,
    total_faixas,
    avg_danceability,
    avg_energy,
    avg_loudness_db,
    avg_speechiness,
    avg_acousticness,
    avg_instrumentalness,
    avg_liveness,
    avg_valence,
    avg_tempo_bpm,
    avg_lufs,
    top_keys,
    atualizado_em
  ) VALUES (
    p_genero,
    v_total,
    v_dance,
    v_energy,
    v_loud,
    v_speech,
    v_acous,
    v_instr,
    v_live,
    v_val,
    v_tempo,
    v_lufs,
    COALESCE(v_keys, '{}'::jsonb),
    now()
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
$$;