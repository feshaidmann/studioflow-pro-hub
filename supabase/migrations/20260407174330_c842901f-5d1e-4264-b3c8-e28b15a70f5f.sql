
-- Step 1: Delete duplicate tasks, keeping only the oldest per (user_id, source_key)
DELETE FROM public.tasks
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, source_key) id
  FROM public.tasks
  WHERE source_key != ''
  ORDER BY user_id, source_key, created_at ASC
)
AND source_key != '';

-- Step 2: Add a partial unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_user_source_key
  ON public.tasks (user_id, source_key)
  WHERE source_key != '';
