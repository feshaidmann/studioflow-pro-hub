-- Carreira simplification: remove rascunhos per-field + store IA analysis on application
DROP TABLE IF EXISTS public.rascunhos_editais CASCADE;

ALTER TABLE public.edital_applications
  ADD COLUMN IF NOT EXISTS analise_ia jsonb;

COMMENT ON COLUMN public.edital_applications.analise_ia IS
  'Análise gerada pela IA (resumo, prazos, documentos exigidos, carta sugerida). Substitui o antigo fluxo de preenchimento por campos.';