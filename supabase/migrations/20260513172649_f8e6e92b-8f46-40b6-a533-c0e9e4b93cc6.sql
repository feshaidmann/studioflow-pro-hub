ALTER TABLE public.editais
  ADD COLUMN IF NOT EXISTS link_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS link_checked_at timestamptz;

ALTER TABLE public.palcos_curados
  ADD COLUMN IF NOT EXISTS link_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS link_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_editais_link_status_broken
  ON public.editais (link_checked_at)
  WHERE link_status = 'broken';

CREATE INDEX IF NOT EXISTS idx_palcos_link_status_broken
  ON public.palcos_curados (link_checked_at)
  WHERE link_status = 'broken';

DROP FUNCTION IF EXISTS public.list_user_applications();

CREATE OR REPLACE FUNCTION public.list_user_applications()
 RETURNS TABLE(id uuid, user_id uuid, opportunity_id uuid, tipo text, status text, notas text, data_inscricao date, data_resultado date, resultado text, valor_aprovado numeric, motivo_recusa text, licoes_aprendidas text, project_id uuid, created_at timestamptz, updated_at timestamptz, titulo text, orgao text, estado text, area text, prazo date, link text, resumo text, link_status text, link_checked_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.user_id, a.opportunity_id, a.tipo, a.status,
         a.notas, a.data_inscricao, a.data_resultado, a.resultado,
         a.valor_aprovado, a.motivo_recusa, a.licoes_aprendidas,
         a.project_id, a.created_at, a.updated_at,
         COALESCE(e.titulo, p.nome)         AS titulo,
         COALESCE(e.orgao, p.organizador)   AS orgao,
         COALESCE(e.estado, p.estado)       AS estado,
         COALESCE(e.area, 'Música')         AS area,
         COALESCE(e.prazo, p.prazo)         AS prazo,
         COALESCE(e.link, p.link)           AS link,
         COALESCE(e.resumo, p.resumo)       AS resumo,
         COALESCE(e.link_status, p.link_status, 'unknown') AS link_status,
         COALESCE(e.link_checked_at, p.link_checked_at)    AS link_checked_at
    FROM public.edital_applications a
    LEFT JOIN public.editais e        ON a.tipo='fomento' AND e.id = a.opportunity_id
    LEFT JOIN public.palcos_curados p ON a.tipo='palco'   AND p.id = a.opportunity_id
   WHERE a.user_id = auth.uid()
   ORDER BY a.updated_at DESC;
$function$;