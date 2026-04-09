
-- 1. Add favorite column to professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;

-- 2. Add comments column to project_files
ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS comments text NOT NULL DEFAULT '';

-- 3. Add work_links column to profiles (array of JSON objects with project name + URL)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_links jsonb NOT NULL DEFAULT '[]'::jsonb;
