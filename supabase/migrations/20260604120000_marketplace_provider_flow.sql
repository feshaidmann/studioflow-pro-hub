-- ── Marketplace: provider targeting + proposal provider name ──────────────────
-- Permite que o solicitante direcione o pedido a um profissional específico e
-- que o profissional veja pedidos direcionados a ele e responda com proposta.

-- 1. Adiciona campos de direcionamento em service_requests
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS target_provider_ref  text,
  ADD COLUMN IF NOT EXISTS target_provider_name text;

CREATE INDEX IF NOT EXISTS service_requests_target_provider_ref_idx
  ON public.service_requests (target_provider_ref);

-- 2. Adiciona nome do provider em service_proposals (desnormalizado para exibição)
ALTER TABLE public.service_proposals
  ADD COLUMN IF NOT EXISTS provider_name   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_avatar text NOT NULL DEFAULT '';

-- 3. RLS: provider (usuário) vê pedidos direcionados ao seu auth.uid()
--    A policy de SELECT existente cobre requester_user_id = auth.uid().
--    Esta policy adicional cobre o lado do provider.
DROP POLICY IF EXISTS "Providers see requests targeting them" ON public.service_requests;
CREATE POLICY "Providers see requests targeting them"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (target_provider_ref = auth.uid()::text);

-- 4. Índice auxiliar em service_proposals para consultas do provider
CREATE INDEX IF NOT EXISTS service_proposals_responder_user_id_idx
  ON public.service_proposals (responder_user_id);
