
-- Release checklist: one row per project, stores checklist items + metadata as JSONB
CREATE TABLE public.release_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

-- Enable RLS
ALTER TABLE public.release_checklists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users manage own release_checklists"
  ON public.release_checklists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_release_checklists_updated_at
  BEFORE UPDATE ON public.release_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
