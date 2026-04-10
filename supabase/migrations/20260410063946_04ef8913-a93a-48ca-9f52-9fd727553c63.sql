-- Drop all existing project-files policies
DROP POLICY IF EXISTS "Project owner can read files" ON storage.objects;
DROP POLICY IF EXISTS "Project owner can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project owner can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can read files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Collaborators can read storage files via invitation" ON storage.objects;
DROP POLICY IF EXISTS "Collaborators can upload storage files via invitation" ON storage.objects;

-- SELECT: Project owner
CREATE POLICY "pf_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- INSERT: Project owner
CREATE POLICY "pf_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- UPDATE: Project owner
CREATE POLICY "pf_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- DELETE: Project owner
CREATE POLICY "pf_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- SELECT: Project member
CREATE POLICY "pf_member_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = (storage.foldername(objects.name))[1]::uuid
      AND project_members.user_id = auth.uid()
  )
);

-- INSERT: Project member
CREATE POLICY "pf_member_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = (storage.foldername(objects.name))[1]::uuid
      AND project_members.user_id = auth.uid()
  )
);

-- SELECT: Collaborator via accepted invitation
CREATE POLICY "pf_collab_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = (storage.foldername(objects.name))[1]::uuid
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

-- INSERT: Collaborator via accepted invitation
CREATE POLICY "pf_collab_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = (storage.foldername(objects.name))[1]::uuid
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);