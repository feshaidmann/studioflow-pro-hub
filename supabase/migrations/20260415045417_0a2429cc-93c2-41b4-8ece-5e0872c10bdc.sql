
-- Pipeline de candidaturas a editais
CREATE TABLE public.edital_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  edital_id uuid NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'interesse',
  notas text NOT NULL DEFAULT '',
  data_inscricao date,
  data_resultado date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own edital_applications"
  ON public.edital_applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_edital_applications_user ON public.edital_applications(user_id);
CREATE INDEX idx_edital_applications_edital ON public.edital_applications(edital_id);
CREATE UNIQUE INDEX idx_edital_applications_unique ON public.edital_applications(user_id, edital_id);

-- Trigger para updated_at
CREATE TRIGGER update_edital_applications_updated_at
  BEFORE UPDATE ON public.edital_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
