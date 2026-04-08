
-- Add source_key for idempotent deduplication in auto-generated tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_key text NOT NULL DEFAULT '';

-- Index for fast deduplication lookups
CREATE INDEX IF NOT EXISTS tasks_source_key_idx ON public.tasks (user_id, source_key) WHERE source_key <> '';
