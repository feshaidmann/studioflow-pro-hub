
-- Create fontes_editais table
CREATE TABLE public.fontes_editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  url_base TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'perplexity' CHECK (tipo IN ('rss', 'api', 'perplexity')),
  parametros JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_busca TIMESTAMPTZ,
  frequencia_horas INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fontes_editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fontes"
  ON public.fontes_editais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fontes"
  ON public.fontes_editais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fontes"
  ON public.fontes_editais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fontes"
  ON public.fontes_editais FOR DELETE
  USING (auth.uid() = user_id);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
