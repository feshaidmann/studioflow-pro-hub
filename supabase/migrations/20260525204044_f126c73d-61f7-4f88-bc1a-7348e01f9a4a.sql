-- =============================================
-- 1. CURATED PROVIDERS (outsiders admin-managed)
-- =============================================
CREATE TABLE public.marketplace_curated_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  portfolio_url text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  genres text[] NOT NULL DEFAULT '{}',
  avatar_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending_review',
  curated_by uuid,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_curated_status_chk CHECK (status IN ('pending_review','approved','rejected'))
);

CREATE INDEX idx_curated_providers_status ON public.marketplace_curated_providers(status);
CREATE INDEX idx_curated_providers_specialty ON public.marketplace_curated_providers(specialty);

ALTER TABLE public.marketplace_curated_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read approved curated providers"
  ON public.marketplace_curated_providers FOR SELECT
  TO authenticated
  USING (status = 'approved' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage curated providers"
  ON public.marketplace_curated_providers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_curated_providers_updated_at
  BEFORE UPDATE ON public.marketplace_curated_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. SERVICE REQUESTS (briefings)
-- =============================================
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL,
  project_id uuid,
  specialty_needed text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  briefing text NOT NULL DEFAULT '',
  desired_deadline date,
  budget_hint text NOT NULL DEFAULT '',
  reference_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT service_requests_status_chk CHECK (status IN ('open','fulfilled','cancelled','expired'))
);

CREATE INDEX idx_service_requests_user ON public.service_requests(requester_user_id);
CREATE INDEX idx_service_requests_project ON public.service_requests(project_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own service_requests"
  ON public.service_requests FOR ALL
  TO authenticated
  USING (auth.uid() = requester_user_id)
  WITH CHECK (auth.uid() = requester_user_id);

CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anti-spam: até 10 requests abertos por semana por usuário
CREATE OR REPLACE FUNCTION public.enforce_service_request_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_count int;
BEGIN
  IF NEW.status = 'open' THEN
    SELECT COUNT(*) INTO v_open_count
      FROM public.service_requests
     WHERE requester_user_id = NEW.requester_user_id
       AND status = 'open'
       AND created_at > now() - interval '7 days';
    IF v_open_count >= 10 THEN
      RAISE EXCEPTION 'quota_exceeded' USING ERRCODE = '42501',
        HINT = 'Você atingiu o limite de 10 pedidos abertos nos últimos 7 dias.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_request_quota
  BEFORE INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_request_quota();

-- =============================================
-- 3. SERVICE PROPOSALS (provider responses)
-- =============================================
CREATE TABLE public.service_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_user_id uuid,             -- StudioFlow user (option A)
  provider_professional_id uuid,     -- contato em professionals (option B)
  provider_curated_id uuid REFERENCES public.marketplace_curated_providers(id) ON DELETE CASCADE, -- (option C)
  responder_user_id uuid NOT NULL,   -- quem efetivamente escreveu (sempre um auth.uid)
  price numeric(12,2) NOT NULL DEFAULT 0,
  delivery_days int NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_proposals_status_chk CHECK (status IN ('sent','accepted','rejected','withdrawn')),
  CONSTRAINT service_proposals_provider_chk CHECK (
    (provider_user_id IS NOT NULL)::int +
    (provider_professional_id IS NOT NULL)::int +
    (provider_curated_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX idx_service_proposals_request ON public.service_proposals(request_id);
CREATE INDEX idx_service_proposals_responder ON public.service_proposals(responder_user_id);

ALTER TABLE public.service_proposals ENABLE ROW LEVEL SECURITY;

-- O artista (dono do request) vê todas propostas do seu request
CREATE POLICY "Requesters view proposals on own requests"
  ON public.service_proposals FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = service_proposals.request_id
      AND sr.requester_user_id = auth.uid()
  ));

-- Prestador vê suas próprias propostas
CREATE POLICY "Providers view own proposals"
  ON public.service_proposals FOR SELECT
  TO authenticated
  USING (responder_user_id = auth.uid());

CREATE POLICY "Providers insert own proposals"
  ON public.service_proposals FOR INSERT
  TO authenticated
  WITH CHECK (responder_user_id = auth.uid());

CREATE POLICY "Providers update own proposals"
  ON public.service_proposals FOR UPDATE
  TO authenticated
  USING (responder_user_id = auth.uid())
  WITH CHECK (responder_user_id = auth.uid());

CREATE TRIGGER trg_service_proposals_updated_at
  BEFORE UPDATE ON public.service_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. UNIFIED VIEW (sem expor email/telefone)
-- =============================================
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
    ARRAY[]::text[] AS genres,
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

-- =============================================
-- 5. RPCs
-- =============================================

-- Rating público agregado (sem expor avaliações individuais)
CREATE OR REPLACE FUNCTION public.get_provider_public_rating(p_provider_name text, p_provider_email text DEFAULT '')
RETURNS TABLE(avg_stars numeric, rating_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(ROUND(AVG(stars)::numeric, 1), 0::numeric),
    COUNT(*)::bigint
  FROM public.professional_ratings
  WHERE (p_provider_email <> '' AND lower(professional_email) = lower(p_provider_email))
     OR (p_provider_name <> '' AND lower(professional_name) = lower(p_provider_name));
$$;

REVOKE EXECUTE ON FUNCTION public.get_provider_public_rating(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_provider_public_rating(text, text) TO authenticated;

-- Listagem do marketplace com filtros
CREATE OR REPLACE FUNCTION public.get_marketplace_providers(
  p_specialty text DEFAULT NULL,
  p_genre text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  provider_ref uuid,
  source text,
  name text,
  handle text,
  avatar_url text,
  bio text,
  city text,
  state text,
  specialties text[],
  genres text[],
  projects_completed int,
  accept_invites boolean,
  is_user boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.*
  FROM public.marketplace_providers mp
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
         mp.bio ILIKE '%' || p_search || '%')
  ORDER BY mp.is_user DESC, mp.projects_completed DESC NULLS LAST, mp.name ASC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE EXECUTE ON FUNCTION public.get_marketplace_providers(text, text, text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_providers(text, text, text, text, int, int) TO authenticated;

-- Aceitar proposta: fecha request, marca outras como rejeitadas, opcionalmente cria project_member
CREATE OR REPLACE FUNCTION public.accept_service_proposal(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.service_proposals%ROWTYPE;
  v_request public.service_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposal FROM public.service_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_request FROM public.service_requests WHERE id = v_proposal.request_id;
  IF v_request.requester_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  UPDATE public.service_proposals
     SET status = 'accepted', updated_at = now()
   WHERE id = p_proposal_id;

  UPDATE public.service_proposals
     SET status = 'rejected', updated_at = now()
   WHERE request_id = v_proposal.request_id
     AND id <> p_proposal_id
     AND status = 'sent';

  UPDATE public.service_requests
     SET status = 'fulfilled', closed_at = now(), updated_at = now()
   WHERE id = v_proposal.request_id;

  RETURN jsonb_build_object('ok', true, 'proposal_id', p_proposal_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_service_proposal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_service_proposal(uuid) TO authenticated;