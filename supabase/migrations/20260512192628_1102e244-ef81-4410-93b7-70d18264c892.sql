CREATE TABLE public.genre_mismatch_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  declared_genre text NOT NULL DEFAULT '',
  detected_genre text NOT NULL DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  gap numeric NOT NULL DEFAULT 0,
  verdict text NOT NULL CHECK (verdict IN ('falso_alerta','correto')),
  analysis_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.genre_mismatch_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own genre_mismatch_feedback"
ON public.genre_mismatch_feedback
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_genre_mismatch_feedback_user_genre
ON public.genre_mismatch_feedback (user_id, declared_genre, created_at DESC);