
-- Stage 4: Add inscrito field to editais
ALTER TABLE public.editais ADD COLUMN IF NOT EXISTS inscrito boolean NOT NULL DEFAULT false;

-- Stage 3: Create rascunhos_editais table
CREATE TABLE public.rascunhos_editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edital_id UUID REFERENCES public.editais(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  campos JSONB NOT NULL DEFAULT '{}',
  progresso INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rascunhos_editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rascunhos" ON public.rascunhos_editais FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rascunhos" ON public.rascunhos_editais FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rascunhos" ON public.rascunhos_editais FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rascunhos" ON public.rascunhos_editais FOR DELETE USING (auth.uid() = user_id);
