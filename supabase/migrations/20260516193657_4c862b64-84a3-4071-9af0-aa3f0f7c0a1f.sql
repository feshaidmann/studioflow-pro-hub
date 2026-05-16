ALTER TABLE public.edital_applications
  ADD COLUMN IF NOT EXISTS epk_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pitch_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pitch_subject text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_channel text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_recipient text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.palco_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid NOT NULL REFERENCES public.edital_applications(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'note',
  direction text NOT NULL DEFAULT 'sent',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_palco_outreach_app ON public.palco_outreach_log(application_id, created_at DESC);

ALTER TABLE public.palco_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own palco_outreach_log"
ON public.palco_outreach_log
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);