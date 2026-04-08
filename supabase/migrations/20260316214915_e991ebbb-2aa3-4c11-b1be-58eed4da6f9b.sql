
CREATE TABLE public.ai_invocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  user_id UUID NULL,
  tokens_input INTEGER NULL,
  tokens_output INTEGER NULL,
  cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read ai_invocations"
  ON public.ai_invocations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_invocations_created_at ON public.ai_invocations (created_at DESC);
CREATE INDEX idx_ai_invocations_function_name ON public.ai_invocations (function_name);
