
DROP FUNCTION IF EXISTS public.get_public_captadores();

CREATE FUNCTION public.get_public_captadores()
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
  captador_porte text[],
  captador_taxa text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, username, bio, city, state,
         public_email, whatsapp, avatar_url,
         captador_verificado, captador_palco_tipos,
         captador_generos, captador_regioes, captador_porte,
         captador_taxa
  FROM public.profiles
  WHERE is_captador = true AND allow_global_listing = true
  ORDER BY captador_verificado DESC NULLS LAST, display_name ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_public_captadores() TO anon, authenticated;
