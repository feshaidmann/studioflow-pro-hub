
-- Tabela de proposta comercial por aplicação
CREATE TABLE public.palco_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  cache_bruto NUMERIC NOT NULL DEFAULT 0,
  condicoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  forma_pagamento TEXT NOT NULL DEFAULT '',
  validade_dias INTEGER NOT NULL DEFAULT 15,
  proposta_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.palco_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own palco_proposals"
  ON public.palco_proposals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_palco_proposals_updated_at
  BEFORE UPDATE ON public.palco_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de pacote técnico (rider + mapa de palco + orçamento) por aplicação
CREATE TABLE public.palco_tech_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  rider JSONB NOT NULL DEFAULT '{"channels":[],"monitors":"","pa_min":"","obs":""}'::jsonb,
  stage_map JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb,
  orcamento JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.palco_tech_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own palco_tech_packages"
  ON public.palco_tech_packages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_palco_tech_packages_updated_at
  BEFORE UPDATE ON public.palco_tech_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
