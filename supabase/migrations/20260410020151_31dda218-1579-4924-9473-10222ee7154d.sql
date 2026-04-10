CREATE OR REPLACE FUNCTION public.get_project_for_member(p_project_id uuid)
RETURNS TABLE(id uuid, name text, artist text, stage text, completed boolean, project_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.artist, p.stage, p.completed, p.project_type
  FROM public.projects p
  WHERE p.id = p_project_id
    AND (
      EXISTS (
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
      )
    );
$$;