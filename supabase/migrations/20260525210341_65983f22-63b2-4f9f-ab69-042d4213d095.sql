
CREATE TABLE IF NOT EXISTS public.marketplace_hint_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  specialty text NOT NULL,
  snooze_until timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, specialty)
);

CREATE INDEX IF NOT EXISTS idx_hint_dismissals_lookup
  ON public.marketplace_hint_dismissals (user_id, project_id);

ALTER TABLE public.marketplace_hint_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hint dismissals"
ON public.marketplace_hint_dismissals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
