
DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE(
  id uuid,
  display_name text,
  username text,
  bio text,
  city text,
  specialties text[],
  accept_invites boolean,
  projects_completed integer,
  public_email text,
  whatsapp text,
  allow_global_listing boolean,
  public_profile_enabled boolean,
  work_links jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id, p.display_name, p.username, p.bio, p.city,
    p.specialties, p.accept_invites, p.projects_completed,
    CASE WHEN p.show_public_email THEN p.public_email ELSE '' END,
    CASE WHEN p.show_public_whatsapp THEN p.whatsapp ELSE '' END,
    p.allow_global_listing,
    p.public_profile_enabled,
    COALESCE(p.work_links, '[]'::jsonb) AS work_links,
    p.created_at
  FROM public.profiles p
  WHERE p.username = p_username
    AND (p.allow_global_listing = true OR p.public_profile_enabled = true)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
