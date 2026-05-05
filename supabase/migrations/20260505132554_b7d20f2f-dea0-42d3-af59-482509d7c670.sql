ALTER TABLE public.editais
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'fomento'
    CHECK (tipo IN ('fomento', 'palco'));

ALTER TABLE public.edital_applications
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'fomento'
    CHECK (tipo IN ('fomento', 'palco'));

CREATE INDEX IF NOT EXISTS editais_tipo_idx ON public.editais (tipo);
CREATE INDEX IF NOT EXISTS edital_applications_tipo_idx ON public.edital_applications (tipo);

CREATE TABLE IF NOT EXISTS public.palcos_curados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  organizador TEXT NOT NULL,
  tipo_palco TEXT NOT NULL CHECK (tipo_palco IN ('festival','showcase','circuito','residencia','abertura')),
  estado TEXT,
  generos TEXT[] DEFAULT '{}',
  porte TEXT DEFAULT 'medio' CHECK (porte IN ('iniciante','medio','grande')),
  tem_edital BOOLEAN DEFAULT false,
  link TEXT,
  prazo DATE,
  status TEXT DEFAULT 'Previsto' CHECK (status IN ('Aberto','Encerrado','Previsto')),
  periodo_inscricao TEXT,
  cachet_medio TEXT,
  publico_estimado TEXT,
  resumo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.palcos_curados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "palcos_curados_select" ON public.palcos_curados
  FOR SELECT TO authenticated USING (ativo = true);

CREATE POLICY "palcos_curados_admin_write" ON public.palcos_curados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.palcos_curados
  (nome, organizador, tipo_palco, estado, generos, porte, tem_edital, link, periodo_inscricao, cachet_medio, publico_estimado, resumo, status)
VALUES
  ('Lollapalooza Brasil — Palco Side','C3 Presents / T4F','festival','SP',ARRAY['Rock Alternativo BR','Pop Brasileiro','Indie BR'],'grande',true,'https://lollapaloozabr.com','Ago–Set','—','70.000 pessoas/dia','Seleção de bandas para palcos menores via inscrição aberta anual.','Previsto'),
  ('Rec-Beat Festival','Rec-Beat','festival','PE',ARRAY['Indie BR','MPB Contemporânea','Eletrônica / House'],'grande',true,'https://recbeat.com.br','Mai–Jun','R$ 1.500–4.000','3.000–8.000 pessoas','Festival pernambucano com seleção de artistas independentes.','Previsto'),
  ('Festival de Inverno de Garanhuns','Prefeitura de Garanhuns','festival','PE',ARRAY['MPB Contemporânea','Forró / Piseiro','Samba'],'medio',true,'https://festivaldegaranhuns.com.br','Mar–Abr','R$ 500–1.500','10.000+ pessoas','Festival municipal com edital de seleção para artistas pernambucanos e nacionais.','Previsto'),
  ('SESC Apresentações — SP','SESC São Paulo','circuito','SP',ARRAY['MPB Contemporânea','Jazz','Samba','Bossa Nova','Indie BR'],'medio',true,'https://sescsp.org.br/musica','Ano todo','R$ 600–2.500','200–1.500 pessoas','Programação musical contínua com inscrição por e-mail e formulário online.','Aberto'),
  ('SESC Apresentações — RJ','SESC Rio de Janeiro','circuito','RJ',ARRAY['Samba','MPB Contemporânea','Jazz','Indie BR'],'medio',true,'https://sesc.com.br/rj','Ano todo','R$ 600–2.000','200–1.200 pessoas','Programação nos espaços SESC do Rio com seleção por portfólio.','Aberto'),
  ('SESC Apresentações — MG','SESC Minas Gerais','circuito','MG',ARRAY['MPB Contemporânea','Rock Alternativo BR','Indie BR'],'medio',true,'https://sescmg.com.br','Ano todo','R$ 500–1.800','150–800 pessoas','Circuito SESC MG com foco em artistas locais e nacionais.','Aberto'),
  ('Natura Musical — Showcases','Natura / B2W','showcase','Nacional',ARRAY['MPB Contemporânea','Pop Brasileiro','Indie BR'],'medio',true,'https://naturamusical.com.br','Fev–Mar','Cachê + gravação','500–3.000 pessoas','Programa de desenvolvimento com showcases em capitais e registro audiovisual.','Previsto'),
  ('Circuito Cultural Paulista','Governo SP','circuito','SP',ARRAY['MPB Contemporânea','Música popular','Artes Cênicas'],'iniciante',true,'https://cultura.sp.gov.br/circuito','Ano todo','R$ 400–1.200','100–500 pessoas','Circuito estadual SP em cidades do interior com edital anual.','Previsto'),
  ('Programa Palco Giratório','SESC Nacional','circuito','Nacional',ARRAY['Artes Cênicas','Música popular','Circo','Dança'],'medio',true,'https://sesc.com.br/palco-giratorio','Set–Nov','Cachê + logística','300–2.000 pessoas','Turnê nacional SESC com grupos e artistas selecionados anualmente.','Previsto'),
  ('Abertura de Shows — Tim Festival','Tim / Live Nation','abertura','Nacional',ARRAY['Rock Alternativo BR','Pop Brasileiro','Indie BR'],'grande',true,'https://timfestival.com.br','Jun–Jul','—','15.000–20.000','Seleção de bandas de abertura para shows do lineup principal.','Previsto'),
  ('Porão do Rock','GDF','festival','DF',ARRAY['Rock Alternativo BR','Metal','Indie BR'],'medio',true,'https://poraodorock.com.br','Abr–Mai','R$ 500–1.500','5.000–10.000','Festival de rock do DF com seleção de bandas locais e nacionais.','Previsto'),
  ('Festival Universitário de Música','MEC / Funarte','festival','Nacional',ARRAY['MPB Contemporânea','Pop Brasileiro','Indie BR','Rock Alternativo BR'],'iniciante',true,'https://funarte.gov.br','Mar–Mai','R$ 300–800','500–3.000 pessoas','Festival nacional voltado a artistas universitários e independentes.','Previsto'),
  ('Festival de Jazz e Blues de SP','Prefeitura SP','festival','SP',ARRAY['Jazz','Blues','MPB Contemporânea','Bossa Nova'],'medio',true,'https://spcultura.prefeitura.sp.gov.br','Mar–Abr','R$ 800–2.500','2.000–8.000 pessoas','Festival municipal paulistano com edital de seleção.','Previsto'),
  ('Rec-Beat Festival 2026','Rec-Beat','festival','PE',ARRAY['Indie BR','MPB Contemporânea','Eletrônica / House'],'grande',true,'https://recbeat.com.br','Mai–Jun','R$ 1.500–4.000','3.000–8.000 pessoas','Festival pernambucano com seleção de artistas independentes.','Previsto'),
  ('Festival Cultura e Arte — FCA','SESI','festival','Nacional',ARRAY['MPB Contemporânea','Pop Brasileiro','Indie BR'],'medio',true,'https://sesicultura.com.br','Jan–Fev','R$ 800–2.000','1.000–5.000 pessoas','Circuito SESI com edital nacional para artistas independentes.','Previsto')
ON CONFLICT DO NOTHING;