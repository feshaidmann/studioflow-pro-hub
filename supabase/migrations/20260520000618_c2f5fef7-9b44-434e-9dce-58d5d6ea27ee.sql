
-- 1) Permitir novos status
ALTER TABLE public.project_invitations DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.project_invitations
  ADD CONSTRAINT valid_status
  CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'revoked'::text, 'expired'::text]));

-- 2) RPC para revogar convite (apenas dono do projeto)
CREATE OR REPLACE FUNCTION public.revoke_project_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.project_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.project_invitations WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.invited_by <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', v_inv.status);
  END IF;

  UPDATE public.project_invitations
  SET status = 'revoked',
      responded_at = now(),
      -- invalida o token (mantém histórico em coluna nova? não há; sobrescreve)
      token = encode(extensions.gen_random_bytes(32), 'hex')
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_project_invitation(uuid) TO authenticated;

-- 3) Função para marcar convites vencidos
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.project_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4) Executa imediatamente para limpar legado
SELECT public.expire_old_invitations();
