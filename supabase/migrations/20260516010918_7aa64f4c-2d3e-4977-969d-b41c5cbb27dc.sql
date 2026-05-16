ALTER TABLE public.music_dna_analyses
  ADD COLUMN IF NOT EXISTS full_analysis_jsonb jsonb,
  ADD COLUMN IF NOT EXISTS full_analysis_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_confidence text
    CHECK (analysis_confidence IS NULL OR analysis_confidence IN ('preview','full','external'));