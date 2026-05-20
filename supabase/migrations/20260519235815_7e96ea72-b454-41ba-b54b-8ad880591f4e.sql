
-- 1) Dedupe convites pendentes duplicados (mantém o mais recente)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY project_id, lower(professional_email)
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.project_invitations
  WHERE status = 'pending'
    AND professional_email IS NOT NULL
)
UPDATE public.project_invitations pi
SET status = 'cancelled',
    responded_at = now()
FROM ranked r
WHERE pi.id = r.id AND r.rn > 1;

-- 2) Índice único parcial
CREATE UNIQUE INDEX IF NOT EXISTS project_invitations_unique_pending
  ON public.project_invitations (project_id, lower(professional_email))
  WHERE status = 'pending';

-- 3) Função de reconciliação pós-signup
CREATE OR REPLACE FUNCTION public.reconcile_invitations_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(NEW.email);
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  -- Atualiza project_members criados com user_id do dono do projeto
  -- para apontar para o novo user_id do convidado, baseado no email.
  UPDATE public.project_members pm
  SET user_id = NEW.id,
      delivery_status = COALESCE(NULLIF(pm.delivery_status, ''), 'ativo'),
      last_activity_at = now(),
      invitation_id = COALESCE(pm.invitation_id, (
        SELECT pi.id FROM public.project_invitations pi
         WHERE pi.project_id = pm.project_id
           AND lower(pi.professional_email) = v_email
           AND pi.status = 'accepted'
         ORDER BY pi.responded_at DESC NULLS LAST, pi.created_at DESC
         LIMIT 1
      ))
  WHERE lower(pm.email) = v_email
    AND (pm.user_id IS NULL OR pm.user_id <> NEW.id);

  RETURN NEW;
END;
$$;

-- 4) Trigger AFTER INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_reconcile_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_reconcile_invites
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.reconcile_invitations_for_new_user();

-- 5) Backfill para usuários já existentes
UPDATE public.project_members pm
SET user_id = u.id,
    last_activity_at = COALESCE(pm.last_activity_at, now()),
    invitation_id = COALESCE(pm.invitation_id, (
      SELECT pi.id FROM public.project_invitations pi
       WHERE pi.project_id = pm.project_id
         AND lower(pi.professional_email) = lower(u.email)
         AND pi.status = 'accepted'
       ORDER BY pi.responded_at DESC NULLS LAST, pi.created_at DESC
       LIMIT 1
    ))
FROM auth.users u
WHERE lower(pm.email) = lower(u.email)
  AND pm.email IS NOT NULL
  AND (pm.user_id IS NULL OR pm.user_id <> u.id)
  -- Apenas reconciliar quando há convite aceito correspondente
  AND EXISTS (
    SELECT 1 FROM public.project_invitations pi
     WHERE pi.project_id = pm.project_id
       AND lower(pi.professional_email) = lower(u.email)
       AND pi.status = 'accepted'
  );
