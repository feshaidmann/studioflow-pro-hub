-- Tabela de links de compartilhamento de briefings visuais
CREATE TABLE IF NOT EXISTS public.visual_briefing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id uuid NOT NULL REFERENCES public.visual_briefings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vbs_briefing ON public.visual_briefing_shares(briefing_id);
CREATE INDEX IF NOT EXISTS idx_vbs_token ON public.visual_briefing_shares(token);

ALTER TABLE public.visual_briefing_shares ENABLE ROW LEVEL SECURITY;

-- Validação por trigger (CHECK não pode usar now())
CREATE OR REPLACE FUNCTION public.vbs_validate_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at deve ser no futuro';
  END IF;
  IF NEW.expires_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'expiração máxima é 90 dias';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vbs_validate ON public.visual_briefing_shares;
CREATE TRIGGER trg_vbs_validate
BEFORE INSERT OR UPDATE OF expires_at ON public.visual_briefing_shares
FOR EACH ROW EXECUTE FUNCTION public.vbs_validate_expiry();

-- RLS: só o criador (dono do briefing) gerencia
CREATE POLICY "owner select shares"
ON public.visual_briefing_shares FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "owner insert shares"
ON public.visual_briefing_shares FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.visual_briefings vb
    WHERE vb.id = briefing_id AND vb.user_id = auth.uid()
  )
);

CREATE POLICY "owner update shares"
ON public.visual_briefing_shares FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "owner delete shares"
ON public.visual_briefing_shares FOR DELETE
USING (auth.uid() = created_by);