-- ============================================================
-- PART 1: service_requests — alinhar nomes de colunas
-- ============================================================

ALTER TABLE public.service_requests
  RENAME COLUMN requester_id TO requester_user_id;

ALTER TABLE public.service_requests
  RENAME COLUMN specialty TO specialty_needed;

ALTER TABLE public.service_requests
  RENAME COLUMN description TO briefing;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS budget_hint          text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS desired_deadline     text,
  ADD COLUMN IF NOT EXISTS reference_url        text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_provider_ref  text,
  ADD COLUMN IF NOT EXISTS target_provider_name text,
  ADD COLUMN IF NOT EXISTS closed_at            timestamptz;

UPDATE public.service_requests
SET budget_hint = 'R$ ' || budget_brl::text
WHERE budget_brl IS NOT NULL AND budget_hint = '';

UPDATE public.service_requests
SET desired_deadline = deadline_date::text
WHERE deadline_date IS NOT NULL AND desired_deadline IS NULL;

DROP POLICY IF EXISTS "Artista gerencia seus pedidos"   ON public.service_requests;
DROP POLICY IF EXISTS "Profissional vê pedidos abertos" ON public.service_requests;

CREATE POLICY "Artista gerencia seus pedidos"
  ON public.service_requests FOR ALL
  USING (auth.uid() = requester_user_id);

CREATE POLICY "Profissional vê pedidos relevantes"
  ON public.service_requests FOR SELECT
  USING (
    status = 'open'
    OR target_provider_ref = auth.uid()::text
  );

-- ============================================================
-- PART 2: service_proposals — alinhar nomes de colunas
-- ============================================================

ALTER TABLE public.service_proposals
  RENAME COLUMN provider_id TO responder_user_id;

ALTER TABLE public.service_proposals
  RENAME COLUMN value_brl TO price;

ALTER TABLE public.service_proposals
  ADD COLUMN IF NOT EXISTS provider_user_id         uuid,
  ADD COLUMN IF NOT EXISTS provider_professional_id uuid,
  ADD COLUMN IF NOT EXISTS provider_curated_id      uuid,
  ADD COLUMN IF NOT EXISTS provider_name            text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_avatar          text NOT NULL DEFAULT '';

UPDATE public.service_proposals sp
SET provider_user_id = pp.user_id
FROM public.professional_profiles pp
WHERE pp.id = sp.responder_user_id
  AND sp.provider_user_id IS NULL;

ALTER TABLE public.service_proposals
  DROP CONSTRAINT IF EXISTS service_proposals_request_id_responder_unique;
ALTER TABLE public.service_proposals
  ADD CONSTRAINT service_proposals_request_id_responder_unique
  UNIQUE (request_id, responder_user_id);

DROP POLICY IF EXISTS "Artista vê propostas do seu pedido"   ON public.service_proposals;
DROP POLICY IF EXISTS "Profissional gerencia suas propostas" ON public.service_proposals;

CREATE POLICY "Artista vê propostas do seu pedido"
  ON public.service_proposals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.service_requests r
    WHERE r.id = service_proposals.request_id
      AND r.requester_user_id = auth.uid()
  ));

CREATE POLICY "Profissional gerencia suas propostas"
  ON public.service_proposals FOR ALL
  USING (
    provider_user_id = auth.uid()
    OR responder_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = service_proposals.responder_user_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 3: marketplace_curated_providers — criar tabela
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_curated_providers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  specialty       text        NOT NULL DEFAULT '',
  bio             text        NOT NULL DEFAULT '',
  portfolio_url   text        NOT NULL DEFAULT '',
  contact_email   text        NOT NULL DEFAULT '',
  contact_phone   text        NOT NULL DEFAULT '',
  city            text        NOT NULL DEFAULT '',
  state           text        NOT NULL DEFAULT '',
  genres          text[]      NOT NULL DEFAULT '{}',
  avatar_url      text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'pending_review',
  notes           text        NOT NULL DEFAULT '',
  verified_by_jsp boolean     NOT NULL DEFAULT false,
  base_rate_brl   numeric,
  rate_unit       text        NOT NULL DEFAULT 'hora',
  portfolio_links jsonb       NOT NULL DEFAULT '[]',
  curated_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_curated_status_chk
    CHECK (status IN ('pending_review', 'approved', 'rejected'))
);

ALTER TABLE public.marketplace_curated_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage curated providers"
  ON public.marketplace_curated_providers FOR ALL
  TO authenticated
  USING    (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_curated_providers_status
  ON public.marketplace_curated_providers(status);
CREATE INDEX IF NOT EXISTS idx_curated_providers_specialty
  ON public.marketplace_curated_providers(specialty);

-- Migrar dados de professional_profiles
INSERT INTO public.marketplace_curated_providers (
  name, specialty, bio, city, state, genres, avatar_url,
  status, verified_by_jsp, base_rate_brl, rate_unit, portfolio_links,
  created_at, updated_at
)
SELECT
  pp.display_name,
  COALESCE(pp.specialties[1], ''),
  COALESCE(pp.bio, ''),
  COALESCE(pp.city, ''),
  COALESCE(pp.state, ''),
  pp.genres,
  '',
  'approved',
  pp.verified_by_jsp,
  pp.base_rate_brl,
  pp.rate_unit,
  pp.portfolio_links,
  pp.created_at,
  pp.updated_at
FROM public.professional_profiles pp
WHERE pp.active = true
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 4: marketplace_providers VIEW (curated + contacts)
-- ============================================================

CREATE OR REPLACE VIEW public.marketplace_providers
WITH (security_invoker = true)
AS
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
  WHERE c.status = 'approved';

GRANT SELECT ON public.marketplace_providers TO authenticated;

-- ============================================================
-- PART 5: get_marketplace_providers RPC
-- ============================================================

DROP FUNCTION IF EXISTS public.get_marketplace_providers(text, text, text, text, int, int);

CREATE OR REPLACE FUNCTION public.get_marketplace_providers(
  p_specialty text DEFAULT NULL,
  p_genre     text DEFAULT NULL,
  p_state     text DEFAULT NULL,
  p_search    text DEFAULT NULL,
  p_limit     int  DEFAULT 50,
  p_offset    int  DEFAULT 0
)
RETURNS TABLE(
  provider_ref       uuid,
  source             text,
  name               text,
  handle             text,
  avatar_url         text,
  bio                text,
  city               text,
  state              text,
  specialties        text[],
  genres             text[],
  projects_completed int,
  accept_invites     boolean,
  is_user            boolean,
  verified_by_jsp    boolean,
  base_rate_brl      numeric,
  rate_unit          text,
  portfolio_links    jsonb,
  avg_rating         numeric,
  review_count       int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mp.provider_ref,
    mp.source,
    mp.name,
    mp.handle,
    mp.avatar_url,
    mp.bio,
    mp.city,
    mp.state,
    mp.specialties,
    mp.genres,
    mp.projects_completed,
    mp.accept_invites,
    mp.is_user,
    mp.verified_by_jsp,
    mp.base_rate_brl,
    mp.rate_unit,
    mp.portfolio_links,
    r.avg_rating,
    COALESCE(r.review_count, 0)::int AS review_count
  FROM public.marketplace_providers mp
  LEFT JOIN LATERAL (
    SELECT
      ROUND(AVG(rat.stars)::numeric, 1) AS avg_rating,
      COUNT(*)::int                     AS review_count
    FROM public.professional_ratings rat
    WHERE rat.professional_name = mp.name
  ) r ON true
  WHERE (p_specialty IS NULL OR p_specialty = '' OR EXISTS (
           SELECT 1 FROM unnest(mp.specialties) s
           WHERE s ILIKE '%' || p_specialty || '%'
         ))
    AND (p_genre IS NULL OR p_genre = '' OR EXISTS (
           SELECT 1 FROM unnest(mp.genres) g
           WHERE g ILIKE '%' || p_genre || '%'
         ))
    AND (p_state IS NULL OR p_state = '' OR mp.state ILIKE p_state)
    AND (p_search IS NULL OR p_search = '' OR
         mp.name ILIKE '%' || p_search || '%' OR
         mp.bio  ILIKE '%' || p_search || '%')
  ORDER BY mp.verified_by_jsp DESC, mp.is_user DESC,
           mp.projects_completed DESC NULLS LAST, mp.name ASC
  LIMIT  GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE EXECUTE ON FUNCTION public.get_marketplace_providers(text, text, text, text, int, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_marketplace_providers(text, text, text, text, int, int) TO authenticated;

-- ============================================================
-- PART 6: service_requests_inbound VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.service_requests_inbound
WITH (security_invoker = true)
AS
  SELECT
    id,
    project_id,
    specialty_needed,
    title,
    briefing,
    desired_deadline,
    budget_hint,
    reference_url,
    status,
    created_at,
    updated_at,
    closed_at,
    target_provider_ref,
    target_provider_name
  FROM public.service_requests
  WHERE target_provider_ref = auth.uid()::text;

GRANT SELECT ON public.service_requests_inbound TO authenticated;

-- ============================================================
-- PART 7: accept_service_proposal — recriar com novos nomes
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_service_proposal(p_proposal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id       uuid;
  v_project_id       uuid;
  v_provider_user_id uuid;
BEGIN
  SELECT sp.request_id, sr.project_id,
         COALESCE(sp.provider_user_id, pp.user_id)
    INTO v_request_id, v_project_id, v_provider_user_id
  FROM  public.service_proposals     sp
  JOIN  public.service_requests      sr ON sr.id = sp.request_id
  LEFT JOIN public.professional_profiles pp ON pp.id = sp.responder_user_id
  WHERE sp.id = p_proposal_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada';
  END IF;

  UPDATE public.service_proposals
    SET status = 'accepted', updated_at = now()
  WHERE id = p_proposal_id;

  UPDATE public.service_proposals
    SET status = 'rejected', updated_at = now()
  WHERE request_id = v_request_id
    AND id <> p_proposal_id
    AND status IN ('sent', 'pending');

  UPDATE public.service_requests
    SET status     = 'fulfilled',
        closed_at  = now(),
        updated_at = now()
  WHERE id = v_request_id;

  IF v_project_id IS NOT NULL AND v_provider_user_id IS NOT NULL THEN
    INSERT INTO public.project_collaborators (project_id, user_id, role)
    VALUES (v_project_id, v_provider_user_id, 'collaborator')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_service_proposal(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.accept_service_proposal(uuid) TO authenticated;
