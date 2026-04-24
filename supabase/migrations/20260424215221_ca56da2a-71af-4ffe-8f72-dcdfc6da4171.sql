
CREATE TABLE public.track_intelligence_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  track_title text NOT NULL,
  genre text NOT NULL,
  target_audience text NOT NULL,
  target_release_date date NOT NULL,
  target_platforms text[] NOT NULL DEFAULT '{}',
  release_goal text NOT NULL,
  master_status text NOT NULL,
  artwork_status text NOT NULL,
  distributor_status text NOT NULL,
  diagnosis jsonb,
  consolidated_score integer,
  score_label text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tia_user ON public.track_intelligence_analyses(user_id, created_at DESC);
CREATE INDEX idx_tia_project ON public.track_intelligence_analyses(project_id);

ALTER TABLE public.track_intelligence_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analyses"
ON public.track_intelligence_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own analyses"
ON public.track_intelligence_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own analyses"
ON public.track_intelligence_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own analyses"
ON public.track_intelligence_analyses FOR DELETE
USING (auth.uid() = user_id);
