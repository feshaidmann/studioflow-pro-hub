-- Tabela visual_briefings
CREATE TABLE public.visual_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  artistic_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_palette jsonb NOT NULL DEFAULT '{}'::jsonb,
  copy_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_copy text NOT NULL DEFAULT '',
  designer_notes text NOT NULL DEFAULT '',
  regeneration_count integer NOT NULL DEFAULT 0,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visual_briefings_regen_max CHECK (regeneration_count >= 0 AND regeneration_count <= 5)
);

CREATE INDEX idx_visual_briefings_project ON public.visual_briefings(project_id);
CREATE INDEX idx_visual_briefings_user ON public.visual_briefings(user_id);

ALTER TABLE public.visual_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own briefings"
  ON public.visual_briefings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_visual_briefings_updated_at
  BEFORE UPDATE ON public.visual_briefings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para PDFs do briefing
INSERT INTO storage.buckets (id, name, public)
VALUES ('briefings', 'briefings', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage: cada usuário só acessa briefings/{auth.uid()}/...
CREATE POLICY "Users read own briefing PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'briefings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own briefing PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'briefings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own briefing PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'briefings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own briefing PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'briefings' AND (storage.foldername(name))[1] = auth.uid()::text);