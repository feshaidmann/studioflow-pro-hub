-- 1. Snapshot dos gêneros atuais antes de sobrescrever (rollback fácil)
CREATE TABLE IF NOT EXISTS public.music_reference_tracks_genre_backup (
  track_id uuid PRIMARY KEY,
  band text NOT NULL,
  filename text NOT NULL,
  genre_prev text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.music_reference_tracks_genre_backup TO authenticated;
GRANT ALL ON public.music_reference_tracks_genre_backup TO service_role;

ALTER TABLE public.music_reference_tracks_genre_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read genre backup" ON public.music_reference_tracks_genre_backup;
CREATE POLICY "Admins read genre backup"
ON public.music_reference_tracks_genre_backup
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Snapshot apenas das faixas que serão tocadas (bandas presentes no CSV staging)
INSERT INTO public.music_reference_tracks_genre_backup (track_id, band, filename, genre_prev)
SELECT t.id, t.band, t.filename, t.genre
  FROM public.music_reference_tracks t
  JOIN public._genre_import_staging s ON lower(btrim(t.band)) = s.band_norm
ON CONFLICT (track_id) DO NOTHING;

-- 2. UPDATE em massa: sobrescreve o gênero usando o CSV, canonizando antes
UPDATE public.music_reference_tracks t
   SET genre = COALESCE(public.genre_canonical(s.genre_raw), s.genre_raw),
       updated_at = now()
  FROM public._genre_import_staging s
 WHERE lower(btrim(t.band)) = s.band_norm
   AND COALESCE(public.genre_canonical(s.genre_raw), s.genre_raw)
       IS DISTINCT FROM t.genre;

-- 3. Drop staging
DROP TABLE public._genre_import_staging;