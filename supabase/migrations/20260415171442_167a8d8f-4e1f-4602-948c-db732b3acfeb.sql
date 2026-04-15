
-- Table for creative assets metadata
CREATE TABLE public.creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  style TEXT,
  format TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own creative_assets"
  ON public.creative_assets FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('creative-assets', 'creative-assets', true);

CREATE POLICY "Public can view creative assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creative-assets');

CREATE POLICY "Users can upload creative assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own creative assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own creative assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
