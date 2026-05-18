ALTER TABLE public.editais
  ADD COLUMN IF NOT EXISTS tipo_palco text,
  ADD COLUMN IF NOT EXISTS generos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS tem_edital boolean,
  ADD COLUMN IF NOT EXISTS periodo_inscricao text;