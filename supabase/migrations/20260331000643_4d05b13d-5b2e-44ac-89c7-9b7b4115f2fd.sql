
CREATE TABLE public.music_dna_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_id TEXT NOT NULL DEFAULT '',
  original_genre TEXT NOT NULL DEFAULT '',
  corrected_genre TEXT NOT NULL DEFAULT '',
  original_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  corrected_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_dna_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own music_dna_feedback"
  ON public.music_dna_feedback
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
