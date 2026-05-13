
ALTER TABLE public.edital_applications RENAME COLUMN edital_id TO opportunity_id;

CREATE INDEX IF NOT EXISTS idx_edital_apps_user_tipo
  ON public.edital_applications(user_id, tipo);

UPDATE public.edital_applications a
   SET opportunity_id = p.id, tipo = 'palco'
  FROM public.editais e
  JOIN public.palcos_curados p
    ON p.id::text = REPLACE(e.session_key, 'palco:', '')
 WHERE a.opportunity_id = e.id
   AND e.tipo = 'palco';

DELETE FROM public.editais
 WHERE tipo = 'palco' AND session_key LIKE 'palco:%';

CREATE OR REPLACE FUNCTION public.list_user_applications()
RETURNS TABLE (
  id uuid, user_id uuid, opportunity_id uuid, tipo text, status text,
  notas text, data_inscricao date, data_resultado date, resultado text,
  valor_aprovado numeric, motivo_recusa text, licoes_aprendidas text,
  project_id uuid, created_at timestamptz, updated_at timestamptz,
  titulo text, orgao text, estado text, area text, prazo date, link text, resumo text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
         COALESCE(e.resumo, p.resumo)       AS resumo
    FROM public.edital_applications a
    LEFT JOIN public.editais e        ON a.tipo='fomento' AND e.id = a.opportunity_id
    LEFT JOIN public.palcos_curados p ON a.tipo='palco'   AND p.id = a.opportunity_id
   WHERE a.user_id = auth.uid()
   ORDER BY a.updated_at DESC;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notif_carreira_deadline_per_day
 ON public.notifications (user_id, link, type, ((created_at AT TIME ZONE 'America/Sao_Paulo')::date))
 WHERE type = 'carreira_deadline';
