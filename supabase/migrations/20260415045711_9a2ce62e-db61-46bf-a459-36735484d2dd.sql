
-- Banco de documentos reutilizáveis do artista
CREATE TABLE public.edital_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  doc_type text NOT NULL DEFAULT 'outro',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own edital_documents"
  ON public.edital_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_edital_documents_user_type ON public.edital_documents(user_id, doc_type);

CREATE TRIGGER update_edital_documents_updated_at
  BEFORE UPDATE ON public.edital_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Checklist de documentos por candidatura
CREATE TABLE public.edital_application_docs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.edital_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doc_label text NOT NULL,
  doc_type text,
  is_required boolean NOT NULL DEFAULT true,
  is_completed boolean NOT NULL DEFAULT false,
  edital_document_id uuid REFERENCES public.edital_documents(id) ON DELETE SET NULL,
  custom_content text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_application_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own edital_application_docs"
  ON public.edital_application_docs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_edital_application_docs_app ON public.edital_application_docs(application_id);
