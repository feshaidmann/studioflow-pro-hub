
CREATE TABLE IF NOT EXISTS public.professional_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  professional_name text NOT NULL DEFAULT '',
  professional_email text NOT NULL DEFAULT '',
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ratings"
  ON public.professional_ratings
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
