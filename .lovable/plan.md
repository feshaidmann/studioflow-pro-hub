# Plano: Admin Carreira — Curadoria de Alto Impacto

Foco exclusivo no admin (`/admin/carreira`), expandindo a tela atual com 5 frentes integradas. Mantém light mode macOS, pt-BR, sem auditoria detalhada.

---

## 1. Painel de saúde + fila priorizada

No topo de `/admin/carreira`, 4 KPIs clicáveis que viram filtros:

- **Links OK** — % de editais com `link_status = 'ok'` nos últimos 7 dias
- **Sem resumo IA** — count de editais com `resumo` vazio
- **Sem prazo válido** — count com `prazo IS NULL` ou `prazo < hoje`
- **Novos 7d** — entradas recentes aguardando revisão

Adicionar **score de urgência** calculado client-side (ou em view) combinando:
link quebrado (peso 4) → prazo vencido (3) → sem resumo (2) → sem valor (1) → sem público (1).
Nova ordenação padrão: "Precisa de atenção" (score desc). Mantém ordenações atuais como opção.

Badge visual por linha indicando o motivo principal (ex: "🔗 link 404", "📝 sem resumo", "⏰ vencido").

## 2. Dedup + merge inteligente

- Botão "Detectar duplicados" no toolbar.
- Heurística: normaliza `titulo` (lowercase, sem acentos, sem pontuação) + `orgao` → agrupa.
- Lista clusters de 2+ editais suspeitos em modal.
- Por cluster: escolher um "principal", marcar campos a manter de cada irmão, mesclar e arquivar os outros (soft delete via novo campo `archived_at`).
- Aplica também a `palcos_curados` (chave: nome + organizador).

## 3. Diff IA antes de sobrescrever

No fluxo "Analisar com IA" do sheet de edição existente, quando o edital **já existe**:

- Após resposta da IA, em vez de aplicar direto, abrir modal de diff: 3 colunas por campo (Atual | IA sugere | Final editável).
- Checkbox por campo para aceitar/rejeitar individualmente.
- Botão "Aplicar selecionados" persiste só o que foi marcado.
- Campos cobertos: `resumo`, `valor`, `publico_alvo`, `prazo`, `documentos_resumo`.

## 4. Crawler agendado de fontes

Aproveita tabela `fontes_editais` já existente (`url_base`, `tipo`, `parametros`, `ativo`, `frequencia_horas`).

**Nova aba "Fontes"** dentro de `/admin/carreira`:
- CRUD de fontes (nome, URL base, tipo: portal/RSS/HTML, frequência em horas, ativo).
- Última execução + contagem de editais importados na última rodada.
- Botão "Rodar agora" por fonte.

**Edge function `crawl-fontes-editais`** (nova):
- Lê fontes com `ativo = true` e `ultima_busca` mais antiga que `frequencia_horas`.
- Usa **Firecrawl** (connector — vamos linkar) para `scrape` ou `crawl` da URL base e extrair markdown.
- Para cada página candidata, chama `analyze-edital` (já existe) → cria entrada em `editais` com `inferido = true` e novo `status = 'pendente_revisao'`.
- Cron diário via `pg_cron` chamando essa função.

**Filtro novo na fila**: "Pendente de revisão" para o admin validar antes de virar visível ao usuário (RLS continua aberta para admin; lado usuário esconde `status = 'pendente_revisao'`).

## 5. Fila de reports do usuário

**Lado usuário (alteração mínima)**: botão "ℹ️ Reportar info errada" em cada card de edital → abre modal compacto (motivo: link quebrado / prazo errado / valor errado / outro + comentário opcional).

**Lado admin**: nova aba **"Reports"** em `/admin/carreira` com a fila, contador por edital, link direto pro sheet de edição, botões "Resolver" e "Ignorar".

---

## Detalhes técnicos

**Migrations:**
- `editais`: adicionar `archived_at TIMESTAMPTZ`, alterar enum-like `status` para aceitar `pendente_revisao` (é text, só ajustar comentário). Index parcial `WHERE archived_at IS NULL`.
- `palcos_curados`: adicionar `archived_at TIMESTAMPTZ`.
- Nova tabela `opportunity_reports` (`id`, `user_id`, `opportunity_kind` enum 'edital'|'palco', `opportunity_id`, `reason` text, `comment` text, `status` 'open'|'resolved'|'ignored', `resolved_at`, timestamps). RLS: insert auth.uid()=user_id; select/update apenas admin via `has_role`.
- View `admin_carreira_health` agregando os 4 KPIs (security definer, restrita a admin).
- GRANT padrão em ambas (sem anon).

**Edge functions:**
- Nova: `crawl-fontes-editais` (Firecrawl + reuso de `analyze-edital`).
- Ajuste em `analyze-edital`: aceitar modo `dry_run` que retorna análise sem persistir (para o diff).

**Cron:**
- `pg_cron` daily → `crawl-fontes-editais`.

**Frontend (`src/pages/admin/Carreira.tsx` + novos componentes):**
- Refatorar em sub-abas: **Editais | Palcos | Fontes | Reports**.
- Componentes novos: `HealthBar`, `DedupDialog`, `AiDiffDialog`, `FontesTab`, `ReportsTab`.
- Componente do usuário: `ReportInfoDialog` em `src/components/carreira/`.

**Connector:**
- Linkar Firecrawl via `standard_connectors--connect` antes de implementar o crawler.

**Escopo deliberadamente fora:**
- Auditoria de edições (descartado).
- Bulk actions (não foi priorizado).
- Score de aderência do usuário (MVP user já suficiente).

---

## Ordem de implementação sugerida

1. Migrations (archived_at, opportunity_reports, view health)
2. Painel de saúde + fila priorizada + filtros (entrega valor imediato)
3. Dedup/merge
4. Diff IA (requer ajuste em `analyze-edital`)
5. Conectar Firecrawl + edge function crawler + aba Fontes + cron
6. Reports (botão usuário + aba admin)
