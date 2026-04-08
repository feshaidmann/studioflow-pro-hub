
-- Create project_files table
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  folder TEXT NOT NULL DEFAULT 'documentos',
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_revisao',
  uploaded_by_name TEXT NOT NULL DEFAULT '',
  version_number INTEGER NOT NULL DEFAULT 1,
  parent_file_id UUID REFERENCES public.project_files(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_project_files_project_folder ON public.project_files(project_id, folder);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Project owner can manage files"
ON public.project_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
  )
);

-- Project members can view files
CREATE POLICY "Project members can view files"
ON public.project_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = project_files.project_id
      AND project_members.user_id = auth.uid()
  )
);

-- Project members can insert files
CREATE POLICY "Project members can insert files"
ON public.project_files
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = project_files.project_id
      AND project_members.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_project_files_updated_at
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Storage policies: owner upload/download
CREATE POLICY "Project owner can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Project owner can read files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Project owner can delete files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- Storage: members can upload and read
CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = (storage.foldername(name))[1]::uuid
      AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Project members can read files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = (storage.foldername(name))[1]::uuid
      AND project_members.user_id = auth.uid()
  )
);
