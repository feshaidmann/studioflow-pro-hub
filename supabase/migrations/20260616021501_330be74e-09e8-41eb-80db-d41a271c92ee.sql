-- 1) edital_analyses_corpus: explicit deny of writes from authenticated users.
-- Service role (edge functions) bypasses RLS and remains the only writer.
DROP POLICY IF EXISTS "Deny inserts from authenticated users" ON public.edital_analyses_corpus;
CREATE POLICY "Deny inserts from authenticated users"
  ON public.edital_analyses_corpus
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.edital_analyses_corpus FROM authenticated;

-- 2) marketplace_curated_providers: drop redundant SELECT policy; the FOR ALL admin policy already covers SELECT.
DROP POLICY IF EXISTS "Admins read curated providers" ON public.marketplace_curated_providers;