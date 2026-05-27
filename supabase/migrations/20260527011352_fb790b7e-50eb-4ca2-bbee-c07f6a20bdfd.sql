CREATE TABLE IF NOT EXISTS public._genre_import_2026 (
  band text NOT NULL,
  filename text NOT NULL,
  genre text NOT NULL
);

GRANT SELECT, INSERT, TRUNCATE ON public._genre_import_2026 TO service_role;

CREATE OR REPLACE FUNCTION public.reset_genre_import_staging()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public._genre_import_2026 (
    band text NOT NULL,
    filename text NOT NULL,
    genre text NOT NULL
  );
  EXECUTE 'GRANT SELECT, INSERT, TRUNCATE ON public._genre_import_2026 TO service_role';
  TRUNCATE public._genre_import_2026;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_genre_import_staging() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_genre_import_staging() TO service_role;