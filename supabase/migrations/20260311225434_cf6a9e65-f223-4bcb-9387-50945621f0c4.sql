
CREATE OR REPLACE FUNCTION public.get_professional_project_count(p_email text, p_name text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT project_id)::integer
  FROM public.project_members
  WHERE
    CASE
      WHEN p_email IS NOT NULL AND p_email != ''
        THEN email = p_email
      ELSE name ILIKE p_name
    END;
$$;
