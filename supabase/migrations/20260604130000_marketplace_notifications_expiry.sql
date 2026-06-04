-- ── Marketplace: notificações automáticas + expiração de pedidos ─────────────

-- 1. Notifica o SOLICITANTE quando uma proposta é recebida
CREATE OR REPLACE FUNCTION public.notify_proposal_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request  public.service_requests;
  v_name     text;
BEGIN
  SELECT * INTO v_request FROM public.service_requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Não notificar se o próprio solicitante enviou proposta (edge case)
  IF v_request.requester_user_id = NEW.responder_user_id THEN RETURN NEW; END IF;

  v_name := COALESCE(NULLIF(trim(NEW.provider_name), ''), 'Um profissional');

  INSERT INTO public.notifications (user_id, title, message, link, type, read)
  VALUES (
    v_request.requester_user_id,
    'Nova proposta recebida',
    v_name || ' enviou uma proposta para "' || v_request.title || '".',
    '/professionals?openRequests=1',
    'marketplace_proposal',
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_proposal_received ON public.service_proposals;
CREATE TRIGGER trg_notify_proposal_received
  AFTER INSERT ON public.service_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_proposal_received();

-- 2. Notifica o PROVIDER quando a proposta é aceita
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
    'Sua proposta para "' || v_request.title || '" foi aceita. Entre em contato com o artista para combinar os próximos passos.',
    '/professionals?openInbound=1',
    'marketplace_accepted',
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_proposal_accepted ON public.service_proposals;
CREATE TRIGGER trg_notify_proposal_accepted
  AFTER UPDATE ON public.service_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_proposal_accepted();

-- 3. Expiração automática de pedidos abertos sem atividade por 30 dias
CREATE OR REPLACE FUNCTION public.expire_old_service_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.service_requests
  SET status = 'expired', closed_at = now(), updated_at = now()
  WHERE status = 'open'
    AND created_at < now() - INTERVAL '30 days';
END;
$$;

-- Agenda: todo dia às 03:00 UTC (menor carga no horário)
SELECT cron.schedule(
  'expire-service-requests',
  '0 3 * * *',
  'SELECT public.expire_old_service_requests()'
);
