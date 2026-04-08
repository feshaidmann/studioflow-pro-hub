
-- Add collaborator fields to project_members
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS permissions_scope text NOT NULL DEFAULT 'basic_collaborator',
  ADD COLUMN IF NOT EXISTS member_type text NOT NULL DEFAULT 'collaborator';

-- Add accepted_at and declined_at to project_invitations
ALTER TABLE public.project_invitations
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

-- Allow message authors to UPDATE their own messages (for pending/resolved flags)
CREATE POLICY "Authors can update own messages"
  ON public.project_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow file uploaders who are project members to UPDATE their files
CREATE POLICY "Uploaders can update own files"
  ON public.project_files
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_files.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Allow file uploaders who are project members to DELETE their files
CREATE POLICY "Uploaders can delete own files"
  ON public.project_files
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_files.project_id
        AND project_members.user_id = auth.uid()
    )
  );
