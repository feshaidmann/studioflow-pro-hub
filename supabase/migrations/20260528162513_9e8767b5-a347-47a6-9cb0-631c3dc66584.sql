
-- Helper: check if current auth user can access a given project (owner, member, or accepted invitee)
CREATE OR REPLACE FUNCTION public.can_access_project_realtime(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
     WHERE p.id = p_project_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members m
     WHERE m.project_id = p_project_id AND m.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_invitations pi
     WHERE pi.project_id = p_project_id
       AND pi.status = 'accepted'
       AND lower(pi.professional_email) = lower((
         SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
       ))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_project_realtime(uuid) TO authenticated;

-- Realtime authorization policies on realtime.messages
-- Topic format used by the client: 'project-chat-{uuid}'
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_chat_realtime_read" ON realtime.messages;
CREATE POLICY "project_chat_realtime_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic LIKE 'project-chat-%'
  AND public.can_access_project_realtime(
    substring(topic from 'project-chat-(.*)')::uuid
  )
);

DROP POLICY IF EXISTS "project_chat_realtime_write" ON realtime.messages;
CREATE POLICY "project_chat_realtime_write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic LIKE 'project-chat-%'
  AND public.can_access_project_realtime(
    substring(topic from 'project-chat-(.*)')::uuid
  )
);
