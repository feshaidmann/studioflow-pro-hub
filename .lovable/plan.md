## Objetivo

Resolver o atrito **C1** do diagnóstico: hoje quando o usuário clica em "Marcar interesse" num Palco, a aplicação é criada mas não há fluxo de conquista. Esta plano cria um fluxo paralelo ao `/editais/inscricao/:id`, específico para Palco (festival, showcase, residência, abertura, circuito) — onde a conquista não passa por formulário oficial, mas por **pitch direto** com curador/produtor.

## Entregáveis

### 1. Nova rota `/palcos/proposta/:applicationId`

Página `src/pages/PalcoProposta.tsx` em 4 etapas (stepper visual, mesma linguagem do EditalInscricao):

```text
[1 EPK] → [2 Proposta] → [3 Contato] → [4 Acompanhamento]
```

- **1. EPK / Release** — Gera material de apresentação:
  - Mini-bio (puxa de `profile.bio` + completa via IA)
  - Release da obra (puxa do projeto vinculado, se houver; ou texto livre)
  - Links de trabalho (puxa de `profile.work_links` + YouTube)
  - Rider técnico básico (campo livre)
  - Botão "Gerar EPK com IA" usa edge function existente `edital-ai-assistant` (ou nova `palco-pitch-generate`) passando: dados do palco + perfil + projeto.
  - Botão "Copiar EPK" / "Baixar como .md".

- **2. Proposta / Carta** — Texto persuasivo curto:
  - Template de e-mail pré-preenchido: assunto, saudação, gancho específico do palco (puxa `resumo`/`tipo_palco`/`organizador`), pitch (3–5 linhas), CTA, assinatura.
  - 3 variações de tom (formal / cordial / direto) geradas pela IA.
  - Editor inline + "Copiar texto" + "Abrir no Gmail" (`mailto:` quando houver e-mail do organizador, senão só copiar).

- **3. Contato** — Rastreio de canal:
  - Selecionar canal: E-mail / WhatsApp / Instagram DM / Formulário oficial / Outro.
  - Campo de destinatário (e-mail/handle/URL).
  - Checkbox "Enviado em [data]" → marca `contacted_at`.
  - Campo de notas livres ("falei com Fulano", "indicado por…").

- **4. Acompanhamento** — Linha do tempo de follow-up:
  - Lista de interações (data, canal, resumo) — `palco_outreach_log`.
  - Botões de status rápido: "Aguardando resposta" / "Em conversa" / "Confirmado" / "Recusado" — atualiza `edital_applications.status`.
  - Sugestão automática de follow-up após 7 dias sem resposta (badge "Hora de fazer follow-up").
  - Quando status = "Confirmado", CTA "Criar evento na Agenda" e "Registrar cachet em Financeiro".

### 2. Schema (migration)

Nova tabela `palco_outreach_log` (interações de contato por candidatura) e colunas extras em `edital_applications` para palcos:

```sql
ALTER TABLE edital_applications
  ADD COLUMN IF NOT EXISTS epk_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS pitch_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_channel text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_recipient text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz;

CREATE TABLE palco_outreach_log (
  id uuid PK,
  user_id uuid NOT NULL,
  application_id uuid NOT NULL,
  channel text NOT NULL,        -- email|whatsapp|instagram|form|other
  direction text NOT NULL,      -- sent|received|note
  summary text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
-- RLS: user_id = auth.uid() (ALL)
```

Reutilizamos `edital_applications` (já tem `tipo='palco'`) para não fragmentar pipeline; apenas estendemos campos.

### 3. Roteamento & integração com Carreira

- Adicionar rota lazy em `src/App.tsx`:
  - `const PalcoProposta = lazy(() => import("@/pages/PalcoProposta"));`
  - `<Route path="/palcos/proposta/:applicationId" element={<PalcoProposta />} />`

- Em `src/pages/Carreira.tsx`, no `handleInterest`/`handleApplicationClick`:
  - Edital (`tipo === "fomento"`) → continua indo para `/editais/inscricao/:editalId` (já implementado).
  - **Palco** (`tipo === "palco"`) → após criar a `application`, `navigate("/palcos/proposta/" + application.id)`.

- Card no pipeline de palco passa a mostrar:
  - Badge do canal de contato (se preenchido)
  - "Aguardando há 5d" quando `contacted_at` + sem resposta
  - CTA "Continuar proposta" leva direto para a rota.

### 4. Edge function `palco-pitch-generate` (opcional, mas recomendado)

Wrapper sobre Lovable AI Gateway (`google/gemini-2.5-flash`) que recebe `{ palco, profile, project, tone }` e devolve `{ epk, pitch_variations: [formal, cordial, direto], subject_suggestions }`. Reaproveita padrão de `edital-ai-assistant`. Rate-limit por `ai_usage` (mesma cota).

## Fora de escopo (próximas iterações)

- Envio automático de e-mail (manual copy-paste no MVP, alinhado à memória do projeto).
- Integração com Gmail/Outlook API.
- Templates de EPK em PDF com identidade visual.
- CRM completo (kanban de oportunidades de palco).

## Critério de aceitação

- Clicar "Marcar interesse" em um Palco abre `/palcos/proposta/:id` na etapa 1.
- IA gera EPK e 3 variações de pitch usando dados reais do perfil e projeto.
- Usuário consegue copiar conteúdo, marcar "enviei em X canal em Y data" e ver isso refletido no card do pipeline.
- Quando muda status para "Confirmado", aparecem CTAs para Agenda e Financeiro.
- RLS garante que apenas o dono enxerga os logs e campos.

## Estimativa

~1 sprint (3 a 5 dias de trabalho focado): migration + página em 4 steps + edge function + integração no Carreira.
