
-- 1. Collaborators can SELECT their membership via accepted invitation email
CREATE POLICY "Collaborators can view their membership"
ON public.project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_members.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 2. Collaborators can UPDATE their membership via accepted invitation
CREATE POLICY "Collaborators can update their membership"
ON public.project_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_members.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 3. Fallback: collaborators can view project_files via accepted invitation
CREATE POLICY "Collaborators can view files via invitation"
ON public.project_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_files.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 4. Fallback: collaborators can insert project_files via accepted invitation
CREATE POLICY "Collaborators can insert files via invitation"
ON public.project_files FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_files.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 5. Fallback: collaborators can delete own files via invitation
CREATE POLICY "Collaborators can delete own files via invitation"
ON public.project_files FOR DELETE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_files.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 6. Fallback: collaborators can read project_messages via invitation
CREATE POLICY "Collaborators can read messages via invitation"
ON public.project_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_messages.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 7. Collaborators can read tasks assigned to them in partner projects
CREATE POLICY "Collaborators can read tasks via invitation"
ON public.tasks FOR SELECT
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = tasks.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 8. Collaborators can update tasks assigned to them in partner projects
CREATE POLICY "Collaborators can update tasks via invitation"
ON public.tasks FOR UPDATE
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = tasks.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);

-- 9. Fix existing project_members: set correct user_id from auth.users by email match
UPDATE public.project_members pm
SET user_id = u.id
FROM auth.users u
WHERE lower(pm.email) = lower(u.email)
  AND pm.user_id != u.id;
