ALTER TABLE public.edital_applications
  ADD COLUMN IF NOT EXISTS resultado text,
  ADD COLUMN IF NOT EXISTS valor_aprovado numeric(12,2),
  ADD COLUMN IF NOT EXISTS motivo_recusa text DEFAULT '',
  ADD COLUMN IF NOT EXISTS licoes_aprendidas text DEFAULT '';