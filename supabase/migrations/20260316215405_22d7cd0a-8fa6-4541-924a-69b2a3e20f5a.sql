
-- Add notes field to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

-- Make project_id truly optional with null default (already nullable by type)
-- project_id was already nullable in the schema, just ensure the default is null
ALTER TABLE public.transactions ALTER COLUMN project_id SET DEFAULT NULL;
