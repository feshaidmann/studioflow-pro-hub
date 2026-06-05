-- ============================================================
-- Recreate profiles table with id = auth.users.id
-- The previous live schema used id = gen_random_uuid() +
-- user_id = auth.users.id which broke ProfileContext and all
-- auth.uid() = id RLS policies. Drop and recreate cleanly.
-- ============================================================

DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id                          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                text        NOT NULL DEFAULT '',
  full_name                   text        NOT NULL DEFAULT '',
  username                    text        UNIQUE,
  bio                         text        NOT NULL DEFAULT '',
  user_type                   text        NOT NULL DEFAULT 'artist',
  track_view_mode             text        NOT NULL DEFAULT 'basic',
  plan                        text        NOT NULL DEFAULT 'free',
  origin                      text        NOT NULL DEFAULT '',
  whatsapp                    text        NOT NULL DEFAULT '',
  city                        text        NOT NULL DEFAULT '',
  state                       text,
  specialties                 text[]      NOT NULL DEFAULT '{}',
  accept_invites              boolean     NOT NULL DEFAULT true,
  projects_completed          int         NOT NULL DEFAULT 0,
  public_email                text        NOT NULL DEFAULT '',
  allow_global_listing        boolean     NOT NULL DEFAULT false,
  onboarding_completed        boolean     NOT NULL DEFAULT false,
  current_moment              text        NOT NULL DEFAULT '',
  main_pain                   text        NOT NULL DEFAULT '',
  onboarding_version          int         NOT NULL DEFAULT 0,
  last_onboarding_project_id  uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  primary_genre               text,
  career_start_year           int,
  is_captador                 boolean     NOT NULL DEFAULT false,
  captador_verificado         boolean     NOT NULL DEFAULT false,
  captador_palco_tipos        text[]      NOT NULL DEFAULT '{}',
  captador_generos            text[]      NOT NULL DEFAULT '{}',
  captador_regioes            text[]      NOT NULL DEFAULT '{}',
  captador_porte              text[]      NOT NULL DEFAULT '{}',
  captador_taxa               text        NOT NULL DEFAULT '',
  avatar_url                  text,
  youtube_url                 text,
  work_links                  jsonb       NOT NULL DEFAULT '[]',
  public_profile_enabled      boolean     NOT NULL DEFAULT false,
  show_public_email           boolean     NOT NULL DEFAULT false,
  show_public_whatsapp        boolean     NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Public profiles visible to everyone (for /u/:username)
CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT
  USING (public_profile_enabled = true);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Fix handle_new_user trigger to insert with id = auth.users.id
-- and include origin from user metadata
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, origin)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'origin', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger in case it was dropped with the table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Rebuild marketplace_providers VIEW as 3-source UNION
-- Source 3: registered users who opt in (allow_global_listing)
-- ============================================================

CREATE OR REPLACE VIEW public.marketplace_providers
WITH (security_invoker = true)
AS
  -- Source 1: contacts from professionals table
  SELECT
    pr.id              AS provider_ref,
    'contact'::text    AS source,
    pr.name,
    NULL::text         AS handle,
    ''::text           AS avatar_url,
    COALESCE(pr.bio, '') AS bio,
    ''::text           AS city,
    ''::text           AS state,
    ARRAY[pr.specialty]::text[] AS specialties,
    ARRAY[]::text[]    AS genres,
    0                  AS projects_completed,
    true               AS accept_invites,
    false              AS is_user,
    false::boolean     AS verified_by_jsp,
    NULL::numeric      AS base_rate_brl,
    NULL::text         AS rate_unit,
    '[]'::jsonb        AS portfolio_links
  FROM public.professionals pr
  WHERE pr.allow_global_listing = true
    AND pr.active = true

  UNION ALL

  -- Source 2: curated providers (admin-managed)
  SELECT
    c.id               AS provider_ref,
    'curated'::text    AS source,
    c.name,
    NULL::text         AS handle,
    c.avatar_url,
    c.bio,
    c.city,
    c.state,
    ARRAY[c.specialty]::text[] AS specialties,
    c.genres,
    0                  AS projects_completed,
    true               AS accept_invites,
    false              AS is_user,
    c.verified_by_jsp,
    c.base_rate_brl,
    c.rate_unit,
    c.portfolio_links
  FROM public.marketplace_curated_providers c
  WHERE c.status = 'approved'

  UNION ALL

  -- Source 3: registered artists who opt into global listing
  SELECT
    p.id               AS provider_ref,
    'user'::text       AS source,
    p.display_name     AS name,
    p.username         AS handle,
    COALESCE(p.avatar_url, '') AS avatar_url,
    p.bio,
    p.city,
    COALESCE(p.state, '') AS state,
    p.specialties,
    ARRAY[]::text[]    AS genres,
    p.projects_completed,
    p.accept_invites,
    true               AS is_user,
    false::boolean     AS verified_by_jsp,
    NULL::numeric      AS base_rate_brl,
    NULL::text         AS rate_unit,
    COALESCE(p.work_links, '[]'::jsonb) AS portfolio_links
  FROM public.profiles p
  WHERE p.allow_global_listing = true
    AND p.onboarding_completed = true;

GRANT SELECT ON public.marketplace_providers TO authenticated;
