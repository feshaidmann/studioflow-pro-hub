
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_public_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_public_whatsapp boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Public can view listed profiles" ON public.profiles;
CREATE POLICY "Public can view listed profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (allow_global_listing = true OR public_profile_enabled = true);

DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(p_username text)
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
  created_at timestamp with time zone
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
    p.created_at
  FROM public.profiles p
  WHERE p.username = p_username
    AND (p.allow_global_listing = true OR p.public_profile_enabled = true)
  LIMIT 1;
$$;
