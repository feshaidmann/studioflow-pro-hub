
CREATE TABLE public.edital_analyses_corpus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edital_id uuid REFERENCES public.editais(id) ON DELETE SET NULL,
  edital_title text,
  source text NOT NULL CHECK (source IN ('file','text')),
  content_hash text NOT NULL,
  input_text text,
  input_excerpt text,
  resumo text,
  prazos jsonb DEFAULT '[]'::jsonb,
  documentos jsonb DEFAULT '[]'::jsonb,
  valor text,
  publico_alvo text,
  model text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX edital_analyses_corpus_hash_user_uk
  ON public.edital_analyses_corpus(content_hash, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX edital_analyses_corpus_edital_idx ON public.edital_analyses_corpus(edital_id);
CREATE INDEX edital_analyses_corpus_created_idx ON public.edital_analyses_corpus(created_at DESC);

GRANT SELECT ON public.edital_analyses_corpus TO authenticated;
GRANT ALL ON public.edital_analyses_corpus TO service_role;

ALTER TABLE public.edital_analyses_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all corpus entries"
  ON public.edital_analyses_corpus
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
