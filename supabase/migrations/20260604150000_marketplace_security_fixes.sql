-- ── Marketplace: security hardening ──────────────────────────────────────────

-- Fix 3: BEFORE INSERT trigger normalizes provider identity from real profiles.
-- Prevents impersonation by overwriting user-supplied provider_name/provider_avatar
-- with the authenticated user's actual display_name and avatar_url.

CREATE OR REPLACE FUNCTION public.normalize_proposal_provider()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name   text;
  v_avatar text;
BEGIN
  SELECT display_name, COALESCE(avatar_url, '')
  INTO v_name, v_avatar
  FROM public.profiles
  WHERE id = NEW.responder_user_id;

  IF FOUND THEN
    NEW.provider_name   := COALESCE(NULLIF(trim(v_name), ''), NEW.provider_name);
    NEW.provider_avatar := COALESCE(NULLIF(v_avatar, ''), NEW.provider_avatar);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_proposal_provider ON public.service_proposals;
CREATE TRIGGER trg_normalize_proposal_provider
  BEFORE INSERT ON public.service_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_proposal_provider();

-- Fix 1: Resolve provider name from profiles, not from user-supplied field.
-- Fix 4: Truncate request.title to 200 chars to limit injection surface.

CREATE OR REPLACE FUNCTION public.notify_proposal_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request  public.service_requests;
  v_name     text;
BEGIN
  SELECT * INTO v_request FROM public.service_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_request.requester_user_id = NEW.responder_user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(trim(display_name), ''), 'Um profissional')
  INTO v_name
  FROM public.profiles
  WHERE id = NEW.responder_user_id;

  IF NOT FOUND THEN v_name := 'Um profissional'; END IF;

  INSERT INTO public.notifications (user_id, title, message, link, type, read)
  VALUES (
    v_request.requester_user_id,
    'Nova proposta recebida',
    v_name || ' enviou uma proposta para "' || LEFT(v_request.title, 200) || '".',
    '/professionals?openRequests=1',
    'marketplace_proposal',
    false
  );

  RETURN NEW;
END;
$$;

-- Fix 4: Truncate title in accepted notification.

CREATE OR REPLACE FUNCTION public.notify_proposal_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request public.service_requests;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_request FROM public.service_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, link, type, read)
  VALUES (
    NEW.responder_user_id,
    'Proposta aceita!',
    'Sua proposta para "' || LEFT(v_request.title, 200) || '" foi aceita. Entre em contato com o artista para combinar os próximos passos.',
    '/professionals?openInbound=1',
    'marketplace_accepted',
    false
  );

  RETURN NEW;
END;
$$;

-- Fix 2: Column-restricted view for providers querying inbound requests.
-- Excludes requester_user_id (and any future sensitive columns) that providers
-- have no legitimate reason to read. RLS on the underlying table still applies
-- (security_invoker = true), so providers only see rows where
-- target_provider_ref = auth.uid().

CREATE OR REPLACE VIEW public.service_requests_inbound
WITH (security_invoker = true)
AS
SELECT
  id,
  title,
  specialty_needed,
  briefing,
  budget_hint,
  desired_deadline,
  reference_url,
  status,
  created_at,
  updated_at,
  target_provider_ref,
  target_provider_name
FROM public.service_requests
WHERE status = 'open';

GRANT SELECT ON public.service_requests_inbound TO authenticated;
