-- 1. Drop public-readable SELECT policies on invitation tables.
--    Token-based access for unauthenticated invitees continues via
--    public.get_invitation_by_token() (SECURITY DEFINER RPC).
--    Owners keep access via the existing "manage own" ALL policies.
DROP POLICY IF EXISTS "Public can read invitation by token" ON public.project_invitations;
DROP POLICY IF EXISTS "Public read platform_invitation by token" ON public.platform_invitations;

-- Make sure authenticated invitees (matched by email) can still see invites addressed to them
-- so the in-app invite acceptance flow keeps working after login.
CREATE POLICY "Invitees can read project_invitations addressed to them"
  ON public.project_invitations
  FOR SELECT
  TO authenticated
  USING (
    lower(professional_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

CREATE POLICY "Invitees can read platform_invitations addressed to them"
  ON public.platform_invitations
  FOR SELECT
  TO authenticated
  USING (
    lower(invitee_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- 2. Allow users to read their own AI invocation records (cost / usage audit).
CREATE POLICY "Users can read their own ai_invocations"
  ON public.ai_invocations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
