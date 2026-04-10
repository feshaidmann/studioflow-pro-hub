
-- 1. Create SECURITY DEFINER function to get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop and recreate the broken RLS policies on project_members
DROP POLICY IF EXISTS "Collaborators can view their membership" ON public.project_members;
DROP POLICY IF EXISTS "Collaborators can update their membership" ON public.project_members;

CREATE POLICY "Collaborators can view their membership"
ON public.project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_members.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

CREATE POLICY "Collaborators can update their membership"
ON public.project_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_members.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

-- 3. Drop and recreate broken RLS policies on project_files
DROP POLICY IF EXISTS "Collaborators can view files via invitation" ON public.project_files;
DROP POLICY IF EXISTS "Collaborators can insert files via invitation" ON public.project_files;
DROP POLICY IF EXISTS "Collaborators can delete own files via invitation" ON public.project_files;

CREATE POLICY "Collaborators can view files via invitation"
ON public.project_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_files.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

CREATE POLICY "Collaborators can insert files via invitation"
ON public.project_files FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_files.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

CREATE POLICY "Collaborators can delete own files via invitation"
ON public.project_files FOR DELETE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_files.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

-- 4. Drop and recreate broken RLS policies on project_messages
DROP POLICY IF EXISTS "Collaborators can read messages via invitation" ON public.project_messages;

CREATE POLICY "Collaborators can read messages via invitation"
ON public.project_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_messages.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

-- 5. Drop and recreate broken RLS policies on tasks
DROP POLICY IF EXISTS "Collaborators can read tasks via invitation" ON public.tasks;
DROP POLICY IF EXISTS "Collaborators can update tasks via invitation" ON public.tasks;

CREATE POLICY "Collaborators can read tasks via invitation"
ON public.tasks FOR SELECT
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = tasks.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

CREATE POLICY "Collaborators can update tasks via invitation"
ON public.tasks FOR UPDATE
USING (
  project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = tasks.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

-- 6. Fix storage policies for project-files bucket
-- The existing policies incorrectly reference project_members.name / projects.name 
-- instead of the storage object's name column

DROP POLICY IF EXISTS "Project members can read files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project owner can read files" ON storage.objects;
DROP POLICY IF EXISTS "Project owner can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project owner can delete files" ON storage.objects;

-- Owner can read files
CREATE POLICY "Project owner can read files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- Owner can upload files
CREATE POLICY "Project owner can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- Owner can delete files
CREATE POLICY "Project owner can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = (storage.foldername(objects.name))[1]::uuid
      AND projects.user_id = auth.uid()
  )
);

-- Members can read files
CREATE POLICY "Project members can read files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = (storage.foldername(objects.name))[1]::uuid
      AND project_members.user_id = auth.uid()
  )
);

-- Members can upload files
CREATE POLICY "Project members can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = (storage.foldername(objects.name))[1]::uuid
      AND project_members.user_id = auth.uid()
  )
);

-- Collaborators can read files via invitation (fallback)
CREATE POLICY "Collaborators can read storage files via invitation"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = (storage.foldername(objects.name))[1]::uuid
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);

-- Collaborators can upload files via invitation (fallback)
CREATE POLICY "Collaborators can upload storage files via invitation"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = (storage.foldername(objects.name))[1]::uuid
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower(public.get_auth_email())
  )
);
