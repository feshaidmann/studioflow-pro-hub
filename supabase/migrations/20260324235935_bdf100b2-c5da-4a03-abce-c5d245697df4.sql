-- Drop existing SELECT policy and replace with broader access
DROP POLICY IF EXISTS "Members can read project messages" ON public.project_messages;

CREATE POLICY "Members can read project messages"
  ON public.project_messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_messages.project_id
        AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_messages.project_id
        AND project_members.user_id = auth.uid()
    )
  );
