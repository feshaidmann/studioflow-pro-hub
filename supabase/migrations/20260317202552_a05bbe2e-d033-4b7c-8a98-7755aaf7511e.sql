
-- Tabela de convites para a agenda da plataforma (separada de project_invitations)
CREATE TABLE public.platform_invitations (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by    uuid NOT NULL,
  invitee_email text NOT NULL,
  invitee_name  text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'pending',
  token         text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  allow_global_listing boolean NOT NULL DEFAULT false,
  responded_at  timestamp with time zone,
  expires_at    timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own platform_invitations"
  ON public.platform_invitations FOR ALL TO public
  USING (auth.uid() = invited_by) WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Public read platform_invitation by token"
  ON public.platform_invitations FOR SELECT TO public
  USING (true);

CREATE UNIQUE INDEX platform_invitations_token_idx ON public.platform_invitations(token);
