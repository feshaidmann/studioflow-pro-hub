
CREATE TABLE public.music_dna_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_name text NOT NULL DEFAULT '',
  genre text NOT NULL DEFAULT '',
  input_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.music_dna_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own analyses"
  ON public.music_dna_analyses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
