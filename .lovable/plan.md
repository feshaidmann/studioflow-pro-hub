# Track Intelligence — Plano de melhorias de CX

Implementação dos 5 pontos prioritários da análise crítica, em ordem de impacto.

---

## 1. Pré-preencher form a partir do projeto + verificar Master Analyzer

**Objetivo**: eliminar trabalho duplicado e tornar o diagnóstico confiável cruzando declaração com dados reais.

### Frontend (`TrackIntelligenceNew.tsx`)
- Quando `project_id` está selecionado, buscar dados do projeto via `useProjects()` e preencher automaticamente:
  - `trackTitle` ← `project.name`
  - `genre` ← `project.perfil_cultural.genero` (se existir)
  - `date` ← derivado da etapa "Lançamento" ou data padrão (+30 dias)
  - `masterStatus` ← derivado de `project.master_done` E presença de análise em `music_dna_analyses` do mesmo projeto
  - `artworkStatus` / `distStatus` ← derivado do `release_checklists` do projeto (itens "artwork_pronto", "distribuidora_configurada")
- Mostrar badge "Pré-preenchido do projeto" ao lado de cada campo auto-preenchido (cor sutil, removível ao editar).
- Banner no topo: "Dados carregados de **{nome do projeto}** — revise antes de gerar."

### Backend (`generate-track-intelligence/index.ts`)
- Em `collectProjectContext`:
  - Buscar `music_dna_analyses` filtrado por `user_id` e (idealmente) por título da faixa similar — para popular `master_analyzer_run` com `"sim" | "não"` real.
  - Buscar `release_checklists` do projeto e contar itens completos vs total.
  - **Corrigir bug semântico**: renomear `tracks_total/approved` para `tasks_total/completed` e adicionar `release_checklist_progress` separado.
- No `buildUserPrompt`, adicionar instrução à IA:
  > Se `master_status` declarado for "sim" mas `master_analyzer_run` for "não", crie automaticamente um gap de severidade `warning` indicando divergência.

---

## 2. CTA contextual no projeto e dashboard

**Objetivo**: descoberta no momento certo da jornada.

### `ProjectReleaseTab.tsx`
- Adicionar card **"Diagnóstico de prontidão"** acima do checklist:
  - Se nunca analisou: botão "Verificar prontidão deste release" → `/track-intelligence/new?project={id}`
  - Se já analisou: mostrar score atual + label + botão "Ver diagnóstico" e "Atualizar"
- Buscar última análise via novo hook `useLatestTrackIntelligence(projectId)`.

### `Dashboard.tsx` (via novo componente `ReleaseReadinessCard`)
- Mostrar card quando: usuário tem ≥1 projeto na etapa "lancamento" OU com release em < 30 dias E sem análise nos últimos 14 dias.
- Card compacto: "Você tem **X release(s)** se aproximando. Verifique a prontidão." + CTA.

### Reposicionamento textual
- Atualizar `drawerSubLabels` em `AppLayout.tsx`:
  - Track Intelligence: "Está pronto para lançar?"
  - DNA Musical: "Análise técnica de mix/master"
- Adicionar tooltip no card de resultado explicando: "DNA Musical analisa o áudio. Track Intelligence analisa o release como um todo."

---

## 3. Criar tarefa a partir de recomendação

**Objetivo**: fechar o loop diagnóstico → ação.

### `TrackIntelligenceResult.tsx`
- Botão "Criar tarefa" em cada item de `recommendations` E em cada gap `critical`/`warning`.
- Ao clicar: insere em `tasks` com:
  - `description`: título da recomendação/gap
  - `project_id`: projeto vinculado (se houver)
  - `source`: `"track_intelligence"`
  - `source_module`: `"track_intelligence"`
  - `source_key`: `analysisId:itemId` (para evitar duplicatas)
  - `severity`: mapeado da severidade do gap
- Estado visual: botão muda para "✓ Tarefa criada" quando `source_key` já existe.
- Toast com link "Ver no Dashboard".

---

## 4. Comparação com análise anterior + agrupamento por projeto

**Objetivo**: dar sentido ao histórico, mostrar evolução.

### `TrackIntelligenceResult.tsx`
- Buscar análise anterior do mesmo `project_id` (ou mesmo `track_title` se sem projeto).
- Card pequeno acima do score: "Última análise: **{data}** — score era **{X}** ({+/- delta})"
- Setinha colorida: verde se melhorou, vermelha se piorou.

### `TrackIntelligence.tsx` (lista)
- Agrupar análises por projeto (collapsible). Análises avulsas em grupo "Sem projeto".
- Mostrar mini-trendline (sparkline) com últimos 5 scores por projeto.

---

## 5. Polimento visual + rate-limit + acessibilidade mobile

### Visual (alinhar com identidade macOS-minimalist)
- `TrackIntelligenceResult.tsx`: substituir emojis 🔴🟡🟢 por dots `<span className="h-2 w-2 rounded-full bg-destructive" />` etc., usando tokens do design system.
- `TrackIntelligence.tsx`: botão de excluir sempre visível em mobile (remover `opacity-0 group-hover:opacity-100`); manter padrão atual em desktop via `md:opacity-0 md:group-hover:opacity-100`.

### Loading mais informativo
- `TrackIntelligenceNew.tsx`: substituir tela cheia de spinner por **skeleton do resultado** (ScoreDial em pulse + 3 cards skeleton), mantendo mensagens rotativas no topo.

### Rate-limit
- Em `generateTrackIntelligence` (hook): envolver o invoke com `extractRateLimitInfo` e abrir o `RateLimitDialog` quando aplicável (padrão já usado em outros módulos de IA).
- No backend: adicionar verificação de quota antes da chamada Gemini (consultar `ai_invocations` últimas 24h por `user_id` + `function_name`).

---

## Arquivos afetados

**Editar:**
- `src/pages/TrackIntelligenceNew.tsx` (pré-preenchimento, skeleton)
- `src/pages/TrackIntelligenceResult.tsx` (criar tarefa, comparação, dots)
- `src/pages/TrackIntelligence.tsx` (agrupamento, sparkline, delete mobile)
- `src/hooks/useTrackIntelligence.ts` (rate-limit, hook latest, hook compare)
- `src/components/project-hub/ProjectReleaseTab.tsx` (card de prontidão)
- `src/pages/Dashboard.tsx` (ReleaseReadinessCard)
- `src/components/AppLayout.tsx` (sublabels)
- `supabase/functions/generate-track-intelligence/index.ts` (contexto rico, rate-limit, fix semântico)

**Criar:**
- `src/components/dashboard/ReleaseReadinessCard.tsx`
- `src/components/track-intelligence/ScoreDelta.tsx` (sparkline + delta)

---

## Não-objetivos (fora deste escopo)
- Exportar PDF/compartilhar diagnóstico (sugerir como próximo passo).
- Análise acústica do áudio dentro do TI (continua delegado ao Master Analyzer).
- Migração de schema (todas as colunas necessárias já existem nas tabelas atuais).