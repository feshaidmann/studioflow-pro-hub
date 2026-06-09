
-- 1) Limpeza pontual: editais broken + unknown sem link
DELETE FROM public.editais
 WHERE link_status = 'broken'
    OR (link_status = 'unknown' AND (link IS NULL OR btrim(link) = ''));

-- 2) Limpeza pontual: palcos broken ou sem link
DELETE FROM public.palcos_curados
 WHERE link_status = 'broken'
    OR (link IS NULL OR btrim(link) = '');

-- 3) Admin pode gerenciar todos os editais (per-user hoje, mas admin precisa ver/curar globalmente)
CREATE POLICY "Admins can view all editais"
  ON public.editais
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all editais"
  ON public.editais
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all editais"
  ON public.editais
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Corpus: admin pode marcar revisados/descartados
ALTER TABLE public.edital_analyses_corpus
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text;

CREATE POLICY "Admins can update corpus entries"
  ON public.edital_analyses_corpus
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete corpus entries"
  ON public.edital_analyses_corpus
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
