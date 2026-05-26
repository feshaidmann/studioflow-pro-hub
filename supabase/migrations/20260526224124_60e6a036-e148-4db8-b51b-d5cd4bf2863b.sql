
CREATE OR REPLACE FUNCTION public.apply_genre_import_2026(p_drop_staging boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staging_count int;
  v_staging_unique int;
  v_updated int;
  v_unchanged int;
  v_unmatched int;
  v_top jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem aplicar import de gêneros';
  END IF;

  SELECT COUNT(*) INTO v_staging_count FROM public._genre_import_2026;

  -- Deduplica por (band, filename) na própria staging antes de tudo
  WITH d AS (
    SELECT DISTINCT ON (band, filename) band, filename, genre
      FROM public._genre_import_2026
     ORDER BY band, filename, genre DESC
  )
  DELETE FROM public._genre_import_2026 s
   WHERE NOT EXISTS (
     SELECT 1 FROM d
      WHERE d.band = s.band AND d.filename = s.filename AND d.genre = s.genre
   );

  -- Remove duplicatas remanescentes mantendo ctid mínimo
  DELETE FROM public._genre_import_2026 a
   USING public._genre_import_2026 b
   WHERE a.band = b.band
     AND a.filename = b.filename
     AND a.ctid > b.ctid;

  SELECT COUNT(*) INTO v_staging_unique FROM public._genre_import_2026;

  INSERT INTO public.music_reference_tracks_genre_backup (track_id, band, filename, genre_prev, backed_up_at)
  SELECT t.id, t.band, t.filename, t.genre, now()
    FROM public.music_reference_tracks t
    JOIN public._genre_import_2026 s
      ON s.band = t.band AND s.filename = t.filename
   WHERE COALESCE(t.genre,'') <> COALESCE(s.genre,'')
  ON CONFLICT (track_id) DO UPDATE
    SET genre_prev = EXCLUDED.genre_prev,
        backed_up_at = EXCLUDED.backed_up_at;

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
    'staging_unique', v_staging_unique,
    'updated', v_updated,
    'unchanged', v_unchanged,
    'unmatched', v_unmatched,
    'top_genres_after', COALESCE(v_top, '[]'::jsonb)
  );
END;
$$;
