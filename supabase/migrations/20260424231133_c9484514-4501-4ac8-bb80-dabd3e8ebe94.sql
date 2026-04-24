ALTER TABLE public.music_dna_analyses
ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS idx_music_dna_analyses_project_id
  ON public.music_dna_analyses(project_id);