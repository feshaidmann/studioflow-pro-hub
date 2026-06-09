-- Add genres column to professionals and fix marketplace_providers view

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS genres text[] NOT NULL DEFAULT '{}';

-- Recreate view so contacts surface their genres in marketplace filters
CREATE OR REPLACE VIEW public.marketplace_providers
WITH (security_invoker = true)
AS
  -- Usuários StudioFlow opt-in
  SELECT
    p.id AS provider_ref,
    'user'::text AS source,
    p.display_name AS name,
    p.username AS handle,
    COALESCE(p.avatar_url, '') AS avatar_url,
    p.bio,
    p.city,
    COALESCE(p.state, '') AS state,
    p.specialties,
    ARRAY[COALESCE(p.primary_genre, '')]::text[] AS genres,
    p.projects_completed,
    p.accept_invites,
    true AS is_user
  FROM public.profiles p
  WHERE p.allow_global_listing = true
    AND COALESCE(array_length(p.specialties, 1), 0) > 0

  UNION ALL

  -- Contatos opt-in
  SELECT
    pr.id AS provider_ref,
    'contact'::text AS source,
    pr.name,
    NULL::text AS handle,
    ''::text AS avatar_url,
    pr.bio,
    ''::text AS city,
    ''::text AS state,
    ARRAY[pr.specialty]::text[] AS specialties,
    pr.genres,
    0 AS projects_completed,
    true AS accept_invites,
    false AS is_user
  FROM public.professionals pr
  WHERE pr.allow_global_listing = true
    AND pr.active = true

  UNION ALL

  -- Curados pela admin
  SELECT
    c.id AS provider_ref,
    'curated'::text AS source,
    c.name,
    NULL::text AS handle,
    c.avatar_url,
    c.bio,
    c.city,
    c.state,
    ARRAY[c.specialty]::text[] AS specialties,
    c.genres,
    0 AS projects_completed,
    true AS accept_invites,
    false AS is_user
  FROM public.marketplace_curated_providers c
  WHERE c.status = 'approved';

GRANT SELECT ON public.marketplace_providers TO authenticated;
