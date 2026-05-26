
-- 1. Securizar tabela de backup
ALTER TABLE IF EXISTS public.music_dna_benchmarks_legacy_backup ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='music_dna_benchmarks_legacy_backup'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Admins read legacy benchmarks backup"
      ON public.music_dna_benchmarks_legacy_backup
      FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
    $p$;
  END IF;
END$$;

GRANT SELECT ON public.music_dna_benchmarks_legacy_backup TO authenticated;
GRANT ALL ON public.music_dna_benchmarks_legacy_backup TO service_role;

-- 2. Search path explícito nas funções novas
CREATE OR REPLACE FUNCTION public.genre_canonical(p_genre text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF p_genre IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(p_genre));
  s := translate(s,
    'áàâãäåéèêëíìîïóòôõöúùûüýÿñç',
    'aaaaaaeeeeiiiiooooouuuuyync');
  s := regexp_replace(s, '\s+', ' ', 'g');

  RETURN CASE
    WHEN s IN ('hip hop','hip-hop','hiphop','rap','rap br','rap brasileiro','hip hop br') THEN 'Hip-Hop'
    WHEN s IN ('trap','trap br','trap brasileiro')                                         THEN 'Trap BR'
    WHEN s IN ('lo-fi hip hop','lofi hip hop','lo-fi','lofi','lofi hiphop')                THEN 'Lo-Fi Hip Hop'
    WHEN s IN ('funk carioca','funk br','funk brasileiro','brazilian funk','baile funk')   THEN 'Funk Carioca'
    WHEN s IN ('funk','funk us','funk soul')                                                THEN 'Funk'
    WHEN s IN ('r&b','rnb','r and b','soul','r&b / soul','rnb/soul','r&b soul')             THEN 'R&B / Soul'
    WHEN s IN ('mpb','mpb contemporanea','musica popular brasileira')                       THEN 'MPB Contemporânea'
    WHEN s IN ('pop','pop br','pop brasileiro')                                             THEN 'Pop Brasileiro'
    WHEN s IN ('pop internacional','pop intl','international pop')                          THEN 'Pop Internacional'
    WHEN s IN ('sertanejo','sertanejo universitario','sertanejo universitário')             THEN 'Sertanejo Universitário'
    WHEN s IN ('sertanejo raiz','sertanejo de raiz','musica caipira')                       THEN 'Sertanejo Raiz'
    WHEN s IN ('forro','forró','forro / piseiro','piseiro','forro pe de serra')             THEN 'Forró / Piseiro'
    WHEN s IN ('samba','samba de raiz')                                                     THEN 'Samba'
    WHEN s IN ('pagode','pagode romantico')                                                 THEN 'Pagode'
    WHEN s IN ('bossa nova','bossa')                                                        THEN 'Bossa Nova'
    WHEN s IN ('axe','axé','axe / pop bahia','pop bahia')                                   THEN 'Axé / Pop Bahia'
    WHEN s IN ('reggae','reggae br','reggae brasileiro')                                    THEN 'Reggae BR'
    WHEN s IN ('rock','rock alternativo','rock alternativo br','alternative rock')          THEN 'Rock Alternativo BR'
    WHEN s IN ('indie','indie br','indie brasileiro')                                       THEN 'Indie BR'
    WHEN s IN ('indie folk','folk indie')                                                   THEN 'Indie Folk'
    WHEN s IN ('folk','folk rock')                                                          THEN 'Folk Rock'
    WHEN s IN ('eletronica','eletronica / house','house','electronic','electronica','edm')  THEN 'Eletrônica / House'
    WHEN s IN ('synth pop','synth-pop','synthpop')                                          THEN 'Synth-Pop'
    WHEN s IN ('jazz')                                                                      THEN 'Jazz'
    WHEN s IN ('country')                                                                   THEN 'Country'
    WHEN s = '' OR s = 'unknown' OR s = '(sem)' OR s = '(sem genero)'                       THEN NULL
    ELSE initcap(s)
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.genre_parent(p_genero text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE p_genero
    WHEN 'Trap BR'                 THEN 'Hip-Hop'
    WHEN 'Lo-Fi Hip Hop'           THEN 'Hip-Hop'
    WHEN 'Rap BR'                  THEN 'Hip-Hop'
    WHEN 'Pagode'                  THEN 'Samba'
    WHEN 'Sertanejo Universitário' THEN 'Sertanejo Raiz'
    WHEN 'Pop Brasileiro'          THEN 'Pop Internacional'
    WHEN 'Indie BR'                THEN 'Indie Folk'
    WHEN 'Rock Alternativo BR'     THEN 'Indie Folk'
    WHEN 'Axé / Pop Bahia'         THEN 'Pop Brasileiro'
    WHEN 'Synth-Pop'               THEN 'Eletrônica / House'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_benchmark_genero(p_genero text)
RETURNS void
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT;
$$;
