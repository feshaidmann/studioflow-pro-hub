
-- Staging para receber band/filename/genre via COPY
CREATE TABLE IF NOT EXISTS public._genre_import_2026 (
  band text NOT NULL,
  filename text NOT NULL,
  genre text NOT NULL DEFAULT ''
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public._genre_import_2026 TO authenticated;
GRANT ALL ON public._genre_import_2026 TO service_role;

ALTER TABLE public._genre_import_2026 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage genre import staging" ON public._genre_import_2026;
CREATE POLICY "Admins manage genre import staging"
  ON public._genre_import_2026
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Função aplicadora: backup -> update -> stats
CREATE OR REPLACE FUNCTION public.apply_genre_import_2026(p_drop_staging boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staging_count int;
  v_updated int;
  v_unchanged int;
  v_unmatched int;
  v_top jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem aplicar import de gêneros';
  END IF;

  SELECT COUNT(*) INTO v_staging_count FROM public._genre_import_2026;

  -- Backup defensivo
  INSERT INTO public.music_reference_tracks_genre_backup (track_id, band, filename, genre_prev, backed_up_at)
  SELECT t.id, t.band, t.filename, t.genre, now()
    FROM public.music_reference_tracks t
    JOIN public._genre_import_2026 s
      ON s.band = t.band AND s.filename = t.filename
   WHERE COALESCE(t.genre,'') <> COALESCE(s.genre,'');

  -- Aplica novos gêneros (sobrescreve canonização indevida)
  WITH upd AS (
    UPDATE public.music_reference_tracks t
       SET genre = s.genre,
           updated_at = now()
      FROM public._genre_import_2026 s
     WHERE t.band = s.band
       AND t.filename = s.filename
       AND COALESCE(t.genre,'') <> COALESCE(s.genre,'')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  SELECT COUNT(*) INTO v_unchanged
    FROM public._genre_import_2026 s
    JOIN public.music_reference_tracks t
      ON t.band = s.band AND t.filename = s.filename
   WHERE COALESCE(t.genre,'') = COALESCE(s.genre,'');

  SELECT COUNT(*) INTO v_unmatched
    FROM public._genre_import_2026 s
   WHERE NOT EXISTS (
     SELECT 1 FROM public.music_reference_tracks t
      WHERE t.band = s.band AND t.filename = s.filename
   );

  SELECT jsonb_agg(jsonb_build_object('genre', g, 'n', n) ORDER BY n DESC)
    INTO v_top
    FROM (
      SELECT COALESCE(NULLIF(genre,''),'(vazio)') AS g, COUNT(*) AS n
        FROM public.music_reference_tracks
       GROUP BY 1
       ORDER BY n DESC
       LIMIT 30
    ) x;

  IF p_drop_staging THEN
    DROP TABLE IF EXISTS public._genre_import_2026;
  END IF;

  RETURN jsonb_build_object(
    'staging_rows', v_staging_count,
    'updated', v_updated,
    'unchanged', v_unchanged,
    'unmatched', v_unmatched,
    'top_genres_after', COALESCE(v_top, '[]'::jsonb)
  );
END;
$$;
