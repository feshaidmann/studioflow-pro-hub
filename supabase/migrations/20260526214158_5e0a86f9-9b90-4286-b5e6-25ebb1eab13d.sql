CREATE TABLE IF NOT EXISTS public._genre_import_staging (
  band_norm text PRIMARY KEY,
  genre_raw text NOT NULL
);

GRANT ALL ON public._genre_import_staging TO service_role;

ALTER TABLE public._genre_import_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage genre staging"
ON public._genre_import_staging
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

TRUNCATE public._genre_import_staging;