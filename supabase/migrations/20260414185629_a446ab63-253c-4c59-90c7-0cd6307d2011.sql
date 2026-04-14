
-- Add perfil_cultural to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS perfil_cultural JSONB NOT NULL DEFAULT '{}';

-- Create alertas_editais table
CREATE TABLE public.alertas_editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, edital_id)
);

ALTER TABLE public.alertas_editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alertas"
  ON public.alertas_editais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alertas"
  ON public.alertas_editais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alertas"
  ON public.alertas_editais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alertas"
  ON public.alertas_editais FOR DELETE
  USING (auth.uid() = user_id);
