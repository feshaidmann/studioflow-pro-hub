
CREATE OR REPLACE FUNCTION public.notify_proposal_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.notify_proposal_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.expire_old_service_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.service_requests
  SET status = 'expired', closed_at = now(), updated_at = now()
  WHERE status = 'open'
    AND created_at < now() - INTERVAL '30 days';
END;
$$;
