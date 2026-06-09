-- 1. Soft-delete columns
ALTER TABLE public.editais ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.palcos_curados ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_editais_active ON public.editais (user_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_palcos_active ON public.palcos_curados (id) WHERE archived_at IS NULL;

-- 2. opportunity_reports table
CREATE TABLE IF NOT EXISTS public.opportunity_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_kind text NOT NULL CHECK (opportunity_kind IN ('edital','palco')),
  opportunity_id uuid NOT NULL,
  reason text NOT NULL,
  comment text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','ignored')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.opportunity_reports TO authenticated;
GRANT ALL ON public.opportunity_reports TO service_role;

ALTER TABLE public.opportunity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own reports"
  ON public.opportunity_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
  ON public.opportunity_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.opportunity_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.opportunity_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_opportunity ON public.opportunity_reports (opportunity_kind, opportunity_id);

CREATE TRIGGER update_opportunity_reports_updated_at
  BEFORE UPDATE ON public.opportunity_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Admin health metrics function
CREATE OR REPLACE FUNCTION public.admin_carreira_health()
RETURNS TABLE (
  total_editais bigint,
  links_ok bigint,
  links_broken bigint,
  links_unchecked bigint,
  sem_resumo bigint,
  sem_prazo_valido bigint,
  novos_7d bigint,
  pendente_revisao bigint,
  reports_abertos bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND link_status = 'ok'),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND link_status IN ('broken','redirect_empty','404')),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND (link_status IS NULL OR link_status = 'pending')),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND (resumo IS NULL OR length(trim(resumo)) < 20)),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND (prazo IS NULL OR prazo < CURRENT_DATE)),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.editais WHERE archived_at IS NULL AND status = 'pendente_revisao'),
    (SELECT count(*) FROM public.opportunity_reports WHERE status = 'open');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_carreira_health() TO authenticated;