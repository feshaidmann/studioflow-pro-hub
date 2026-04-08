
-- Add user_id to professionals + replace admin-only RLS with per-user policies
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Admins can insert professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can update professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can delete professionals" ON public.professionals;

CREATE POLICY "Users can insert own professionals" ON public.professionals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own professionals" ON public.professionals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own professionals" ON public.professionals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own professionals" ON public.professionals
  FOR DELETE USING (auth.uid() = user_id);

-- Create project_invitations table
CREATE TABLE public.project_invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_by           uuid NOT NULL,
  professional_name    text NOT NULL DEFAULT '',
  professional_email   text NOT NULL,
  professional_role    text NOT NULL DEFAULT '',
  fee                  numeric NOT NULL DEFAULT 0,
  deadline             text NOT NULL DEFAULT '',
  schedule_notes       text NOT NULL DEFAULT '',
  token                text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status               text NOT NULL DEFAULT 'pending',
  allow_global_listing boolean,
  responded_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined'))
);

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invitations" ON public.project_invitations
  FOR ALL USING (auth.uid() = invited_by);

CREATE POLICY "Public can read invitation by token" ON public.project_invitations
  FOR SELECT USING (true);

CREATE INDEX idx_project_invitations_token ON public.project_invitations(token);
CREATE INDEX idx_project_invitations_project_id ON public.project_invitations(project_id);
