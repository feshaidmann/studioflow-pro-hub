
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS subgenre TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS artist_state TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS audience_size_at_start TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS production_start_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS distributor TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_genre TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS career_start_year INTEGER;

ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS specialty_category TEXT;

DROP TRIGGER IF EXISTS projects_set_updated_at ON public.projects;
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
