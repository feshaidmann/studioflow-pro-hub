
-- Drop the old restrictive stage check constraint and replace with the full set
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_stage_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_stage_check
  CHECK (stage = ANY (ARRAY['inicio'::text, 'gravacao'::text, 'rough'::text, 'mix'::text, 'master'::text, 'upload'::text, 'lancado'::text]));
