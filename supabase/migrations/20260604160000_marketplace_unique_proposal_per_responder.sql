-- ── Marketplace: enforce one proposal per responder per request ───────────────
-- Prevents duplicate proposals when the client-side alreadySent check is
-- bypassed (e.g. stale state on first mount, or direct API calls).

ALTER TABLE public.service_proposals
  ADD CONSTRAINT service_proposals_unique_responder_per_request
  UNIQUE (request_id, responder_user_id);
