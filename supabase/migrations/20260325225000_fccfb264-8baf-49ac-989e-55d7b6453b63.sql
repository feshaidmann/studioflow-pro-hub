CREATE OR REPLACE FUNCTION public.get_member_projects()
RETURNS TABLE(id uuid, name text, artist text, stage text, completed boolean, project_type text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id, p.name, p.artist, p.stage, p.completed, p.project_type,
    pi.professional_role AS role
  FROM public.project_invitations pi
  JOIN public.projects p ON p.id = pi.project_id
  WHERE pi.status = 'accepted'
    AND lower(pi.professional_email) = lower((
      SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
    ));
$$;