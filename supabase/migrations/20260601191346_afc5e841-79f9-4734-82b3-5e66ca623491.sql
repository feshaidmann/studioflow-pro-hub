
-- 1. Drop overly-permissive public SELECT on profiles
DROP POLICY IF EXISTS "Public can view listed profiles" ON public.profiles;

-- 2. Safe RPC: list captadores (public, no sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_captadores()
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  bio text,
  city text,
  state text,
  public_email text,
  whatsapp text,
  avatar_url text,
  captador_verificado boolean,
  captador_palco_tipos text[],
  captador_generos text[],
  captador_regioes text[],
  captador_porte text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, username, bio, city, state,
         public_email, whatsapp, avatar_url,
         captador_verificado, captador_palco_tipos,
         captador_generos, captador_regioes, captador_porte
  FROM public.profiles
  WHERE is_captador = true AND allow_global_listing = true
  ORDER BY captador_verificado DESC NULLS LAST, display_name ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_public_captadores() TO anon, authenticated;

-- 3. Safe RPC: find a public profile by email (used by professional metrics)
CREATE OR REPLACE FUNCTION public.find_public_profile_by_email(p_email text)
RETURNS TABLE (username text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username, display_name
  FROM public.profiles
  WHERE public_email = lower(p_email)
    AND allow_global_listing = true
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.find_public_profile_by_email(text) TO authenticated;

-- 4. Restrict marketplace_curated_providers direct SELECT to admins only.
-- Non-admin reads must go through the existing get_marketplace_providers RPC
-- (which omits contact_email / contact_phone).
DROP POLICY IF EXISTS "Authenticated read approved curated providers"
  ON public.marketplace_curated_providers;

CREATE POLICY "Admins read curated providers"
  ON public.marketplace_curated_providers
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
