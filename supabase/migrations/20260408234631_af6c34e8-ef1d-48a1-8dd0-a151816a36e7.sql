CREATE OR REPLACE FUNCTION public.get_public_profile_history(p_email text)
RETURNS TABLE(
  project_name text,
  role text,
  delivery_status text,
  delivery_due_date date,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.name AS project_name,
    pm.role,
    pm.delivery_status,
    pm.delivery_due_date,
    pm.created_at AS joined_at
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pm.email = p_email
    AND p_email != ''
  ORDER BY pm.created_at DESC
  LIMIT 20;
$$;