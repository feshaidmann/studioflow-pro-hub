REVOKE INSERT, UPDATE, DELETE ON public.function_logs FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.function_logs TO service_role;

DROP POLICY IF EXISTS "No client writes on function_logs" ON public.function_logs;
CREATE POLICY "No client writes on function_logs"
  ON public.function_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);