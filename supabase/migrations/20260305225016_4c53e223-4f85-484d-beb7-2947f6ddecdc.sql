
CREATE TABLE public.function_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL DEFAULT '',
  level       text NOT NULL DEFAULT 'error',   -- 'error' | 'warn' | 'info'
  message     text NOT NULL DEFAULT '',
  details     jsonb
);

ALTER TABLE public.function_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read all logs (uses the has_role security-definer function)
CREATE POLICY "Admin can read function_logs"
  ON public.function_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role (edge functions) can insert logs — covered by service-role bypass
-- No policy needed for INSERT because service role bypasses RLS
