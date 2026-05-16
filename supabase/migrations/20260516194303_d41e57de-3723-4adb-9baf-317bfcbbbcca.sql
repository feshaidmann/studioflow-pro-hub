ALTER TABLE public.editais ADD COLUMN IF NOT EXISTS match_reason text NOT NULL DEFAULT '';
ALTER TABLE public.palcos_curados ADD COLUMN IF NOT EXISTS match_reason text NOT NULL DEFAULT '';