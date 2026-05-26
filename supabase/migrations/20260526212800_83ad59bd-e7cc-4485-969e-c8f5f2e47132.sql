
-- ════════════════════════════════════════════════════════════════════════════
-- Unificar benchmarks DNA Musical: substituir tabela por VIEW derivada de
-- music_reference_tracks, com gênero canônico e fallback por família.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Função canônica de normalização de gênero ────────────────────────────────
CREATE OR REPLACE FUNCTION public.genre_canonical(p_genre text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
AS $$
DECLARE
  s text;
BEGIN
  IF p_genre IS NULL THEN RETURN NULL; END IF;
  -- lower + trim + remover acentos
  s := lower(trim(p_genre));
  s := translate(s,
    'áàâãäåéèêëíìîïóòôõöúùûüýÿñç',
    'aaaaaaeeeeiiiiooooouuuuyync');
  s := regexp_replace(s, '\s+', ' ', 'g');

  RETURN CASE
    -- Hip-Hop / Rap family
    WHEN s IN ('hip hop','hip-hop','hiphop','rap','rap br','rap brasileiro','hip hop br') THEN 'Hip-Hop'
    WHEN s IN ('trap','trap br','trap brasileiro')                                         THEN 'Trap BR'
    WHEN s IN ('lo-fi hip hop','lofi hip hop','lo-fi','lofi','lofi hiphop')                THEN 'Lo-Fi Hip Hop'
    -- Funk
    WHEN s IN ('funk carioca','funk br','funk brasileiro','brazilian funk','baile funk')   THEN 'Funk Carioca'
    WHEN s IN ('funk','funk us','funk soul')                                                THEN 'Funk'
    -- R&B / Soul
    WHEN s IN ('r&b','rnb','r and b','soul','r&b / soul','rnb/soul','r&b soul')             THEN 'R&B / Soul'
    -- MPB / Pop BR
    WHEN s IN ('mpb','mpb contemporanea','musica popular brasileira')                       THEN 'MPB Contemporânea'
    WHEN s IN ('pop','pop br','pop brasileiro')                                             THEN 'Pop Brasileiro'
    WHEN s IN ('pop internacional','pop intl','international pop')                          THEN 'Pop Internacional'
    -- Sertanejo
    WHEN s IN ('sertanejo','sertanejo universitario','sertanejo universitário')             THEN 'Sertanejo Universitário'
    WHEN s IN ('sertanejo raiz','sertanejo de raiz','musica caipira')                       THEN 'Sertanejo Raiz'
    -- Forró / Piseiro
    WHEN s IN ('forro','forró','forro / piseiro','piseiro','forro pe de serra')             THEN 'Forró / Piseiro'
    -- Samba / Pagode
    WHEN s IN ('samba','samba de raiz')                                                     THEN 'Samba'
    WHEN s IN ('pagode','pagode romantico')                                                 THEN 'Pagode'
    WHEN s IN ('bossa nova','bossa')                                                        THEN 'Bossa Nova'
    -- Axé / Reggae
    WHEN s IN ('axe','axé','axe / pop bahia','pop bahia')                                   THEN 'Axé / Pop Bahia'
    WHEN s IN ('reggae','reggae br','reggae brasileiro')                                    THEN 'Reggae BR'
    -- Rock / Indie
    WHEN s IN ('rock','rock alternativo','rock alternativo br','alternative rock')          THEN 'Rock Alternativo BR'
    WHEN s IN ('indie','indie br','indie brasileiro')                                       THEN 'Indie BR'
    WHEN s IN ('indie folk','folk indie')                                                   THEN 'Indie Folk'
    WHEN s IN ('folk','folk rock')                                                          THEN 'Folk Rock'
    -- Eletrônica
    WHEN s IN ('eletronica','eletronica / house','house','electronic','electronica','edm')  THEN 'Eletrônica / House'
    WHEN s IN ('synth pop','synth-pop','synthpop')                                          THEN 'Synth-Pop'
    -- Demais
    WHEN s IN ('jazz')                                                                      THEN 'Jazz'
    WHEN s IN ('country')                                                                   THEN 'Country'
    WHEN s = '' OR s = 'unknown' OR s = '(sem)' OR s = '(sem genero)'                       THEN NULL
    ELSE initcap(s)
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.genre_canonical(text) TO authenticated, anon, service_role;

-- 2. Mapa de gênero → gênero-pai para fallback ────────────────────────────────
CREATE OR REPLACE FUNCTION public.genre_parent(p_genero text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE p_genero
    WHEN 'Trap BR'              THEN 'Hip-Hop'
    WHEN 'Lo-Fi Hip Hop'        THEN 'Hip-Hop'
    WHEN 'Rap BR'               THEN 'Hip-Hop'
    WHEN 'Pagode'               THEN 'Samba'
    WHEN 'Sertanejo Universitário' THEN 'Sertanejo Raiz'
    WHEN 'Forró / Piseiro'      THEN 'Forró / Piseiro'
    WHEN 'Pop Brasileiro'       THEN 'Pop Internacional'
    WHEN 'Indie BR'             THEN 'Indie Folk'
    WHEN 'Rock Alternativo BR'  THEN 'Indie Folk'
    WHEN 'Axé / Pop Bahia'      THEN 'Pop Brasileiro'
    WHEN 'Synth-Pop'            THEN 'Eletrônica / House'
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.genre_parent(text) TO authenticated, anon, service_role;

-- 3. Backup da tabela antiga (segurança) e DROP ───────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='music_dna_benchmarks'
             AND table_type='BASE TABLE') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.music_dna_benchmarks_legacy_backup AS
             SELECT * FROM public.music_dna_benchmarks';
    EXECUTE 'DROP TABLE public.music_dna_benchmarks CASCADE';
  END IF;
END$$;

-- 4. Índice funcional para acelerar GROUP BY por gênero canônico ──────────────
CREATE INDEX IF NOT EXISTS music_reference_tracks_genre_canonical_idx
  ON public.music_reference_tracks (public.genre_canonical(genre))
  WHERE quarantined = false;

-- 5. VIEW pública (mesmo nome que a tabela antiga, para compatibilidade) ──────
CREATE OR REPLACE VIEW public.music_dna_benchmarks
WITH (security_invoker = true) AS
SELECT
  public.genre_canonical(genre)              AS genero,
  COUNT(*)::int                              AS total_faixas,
  COUNT(DISTINCT band)::int                  AS total_artistas,
  AVG(danceability)                          AS avg_danceability,
  AVG(energy)                                AS avg_energy,
  AVG(loudness_rms_db)                       AS avg_loudness_db,
  AVG(speechiness)                           AS avg_speechiness,
  AVG(acousticness)                          AS avg_acousticness,
  AVG(instrumentalness)                      AS avg_instrumentalness,
  AVG(liveness)                              AS avg_liveness,
  AVG(valence)                               AS avg_valence,
  AVG(tempo_bpm)                             AS avg_tempo_bpm,
  AVG(lufs_integrated)                       AS avg_lufs,
  AVG(dynamic_range_db)                      AS avg_dynamic_range_db,
  AVG(spectral_centroid)                     AS avg_spectral_centroid,
  AVG(spectral_flatness)                     AS avg_spectral_flatness,
  AVG(zero_crossing_rate)                    AS avg_zero_crossing_rate,
  NULL::jsonb                                AS top_keys,
  gen_random_uuid()                          AS id,
  now()                                      AS atualizado_em
FROM public.music_reference_tracks
WHERE quarantined = false
  AND public.genre_canonical(genre) IS NOT NULL
GROUP BY public.genre_canonical(genre)
HAVING COUNT(*) >= 5;

GRANT SELECT ON public.music_dna_benchmarks TO authenticated, service_role;

-- 6. RPC para buscar benchmark com fallback por família ───────────────────────
CREATE OR REPLACE FUNCTION public.get_benchmark_for_genre(p_genero text)
RETURNS SETOF public.music_dna_benchmarks
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_canonical text := public.genre_canonical(p_genero);
  v_parent text;
  v_found boolean := false;
BEGIN
  IF v_canonical IS NULL THEN RETURN; END IF;

  RETURN QUERY SELECT * FROM public.music_dna_benchmarks WHERE genero = v_canonical;
  GET DIAGNOSTICS v_found = ROW_COUNT;
  IF v_found THEN RETURN; END IF;

  v_parent := public.genre_parent(v_canonical);
  IF v_parent IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.music_dna_benchmarks WHERE genero = v_parent;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_benchmark_for_genre(text) TO authenticated, service_role;

-- 7. Converter recalcular_benchmark_genero em no-op (compatibilidade) ─────────
CREATE OR REPLACE FUNCTION public.recalcular_benchmark_genero(p_genero text)
RETURNS void
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT;  -- VIEW agrega em tempo real; recalc tornou-se desnecessário.
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_benchmark_genero(text) TO authenticated, service_role;
