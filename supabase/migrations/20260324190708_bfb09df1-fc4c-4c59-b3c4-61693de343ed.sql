CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  message text NOT NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  page text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.beta_feedback FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.beta_feedback FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));