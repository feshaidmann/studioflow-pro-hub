
-- Add username and bio columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';

-- Auto-populate existing rows with a slug from display_name
UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(TRIM(display_name), '[^a-z0-9]+', '-', 'gi'))
WHERE username IS NULL AND display_name != '' AND display_name IS NOT NULL;

-- Remove leading/trailing hyphens from generated usernames
UPDATE public.profiles
SET username = TRIM(BOTH '-' FROM username)
WHERE username IS NOT NULL AND (username LIKE '-%' OR username LIKE '%-');

-- For rows still without username or empty username, use id prefix
UPDATE public.profiles
SET username = 'user-' || SUBSTR(id::text, 1, 8)
WHERE username IS NULL OR username = '';

-- Add unique constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- RLS: Allow public SELECT on profiles with allow_global_listing = true
CREATE POLICY "Public can view listed profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (allow_global_listing = true);

-- SECURITY DEFINER RPC: get_public_profile by username
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (
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
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    id, display_name, username, bio, city,
    specialties, accept_invites, projects_completed,
    public_email, whatsapp, allow_global_listing, created_at
  FROM public.profiles
  WHERE username = p_username
    AND allow_global_listing = true
  LIMIT 1;
$$;

-- SECURITY DEFINER RPC: get ratings for a profile by public_email
CREATE OR REPLACE FUNCTION public.get_public_profile_ratings(p_profile_id uuid)
RETURNS TABLE (avg_stars numeric, rating_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROUND(AVG(stars)::numeric, 1),
    COUNT(*)::bigint
  FROM public.professional_ratings
  WHERE professional_email = (
    SELECT public_email FROM public.profiles WHERE id = p_profile_id LIMIT 1
  )
  AND professional_email != '';
$$;
