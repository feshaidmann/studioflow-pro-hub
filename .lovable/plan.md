## Objetivo

Tornar o Dashboard navegável e compreensível por leitores de tela e teclado. Cobre todos os cards (incluindo os lazy-loaded), botões icon-only, áreas clicáveis, anúncios dinâmicos e foco visível. Apenas frontend — sem mudanças em hooks, dados ou negócio.

---

## 1. Estrutura semântica do Dashboard

`src/pages/Dashboard.tsx`:
- Envolver o conteúdo em `<main id="main" aria-labelledby="dashboard-title">`.
- `DashboardHeader` mantém o `<h1>Dashboard</h1>` (já existe) + `id="dashboard-title"`.
- Cada `<Card>` usado como seção do dashboard recebe `role="region"` + `aria-labelledby` apontando para o id do título do card. IDs estáveis: `region-hero`, `region-alerts`, `region-checklist`, `region-ai`, `region-projects`, `region-team`, `region-editais`, `region-releases`, `region-finance`, `region-transactions`, `region-guest-projects`.
- Suspense com `fallback` ganha `role="status" aria-live="polite" aria-label="Carregando…"` em `CardSkeleton`.
- Adicionar `<a href="#main" className="sr-only focus:not-sr-only ...">Pular para o conteúdo</a>` no início.

---

## 2. Componentes lazy-loaded

### `EditalProgressCard.tsx`
- `<Card role="region" aria-labelledby="region-editais-title">` + `<CardTitle id="region-editais-title">`.
- Estado de carregamento atual retorna `null`; trocar por `<Card role="status" aria-live="polite" aria-busy="true">` com skeleton, ou usar fallback no Suspense (já é o caso) — basta garantir `aria-busy` no Suspense fallback.
- Bloco "Nearest deadline" recebe `role="status"` quando `daysLeft <= 3` (urgente).
- Botão "Ver pipeline completo" ganha `aria-label="Ver pipeline completo de editais"`.

### `RecentTransactions.tsx`
- Header com `aria-labelledby`.
- Lista vira `<ul role="list">` e cada linha `<li>`. Linha clicável vira `<button>` semântico (não `<div>` com role) — substitui `role/tabIndex/onKeyDown` por `<button type="button" className="...w-full text-left">` quando `tx.projectId`. Quando não navegável, `<div>` simples sem role.
- Cada linha ganha `aria-label` resumindo: "{descrição}, {valor formatado}, {receita/despesa}, {pago/pendente}, {projeto se houver}, {data}".
- Status "Pago/Pendente" usa `<span role="status">` ou `aria-label` no badge para reforçar.
- Botão "Ver todas" → `aria-label="Ver todas as transações"`.

### `UpcomingReleases.tsx`
- Header com `aria-labelledby`.
- Lista vira `<ul role="list">` e cada item vira `<li>` contendo `<button type="button">` (substitui o `<div onClick>`). Adicionar `aria-label="Abrir {nome} de {artista}, estágio {stageLabel}, {mixPct}% de mix, {prazo}"`.
- Barra de progresso vira `<div role="progressbar" aria-valuenow={mixPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do mix">`.
- Estado vazio: `<p>` ok; CTA já tem texto.
- Botão "Ver projetos" → `aria-label`.

### `GuestProjectsList.tsx`
- Header com `aria-labelledby`.
- Cada cartão de projeto vira `<button>` com `aria-label="Abrir projeto {name} de {artist}, estágio {STAGE_LABEL}, papel {role}"`. Remove cursor-pointer-only div.
- DataSkeleton no loading: wrapper com `role="status" aria-live="polite" aria-label="Carregando projetos como parceiro"`.

---

## 3. Demais cards do Dashboard (a11y completa)

### `ProjectAlertsCard.tsx`
- `Card role="region" aria-labelledby="region-alerts-title"` + `aria-live="polite"` (alertas surgem após cálculo).
- Lista de alertas vira `<ul role="list">`, cada alerta `<li>`.
- Botão "Resolver" recebe `aria-label="Resolver alerta {alert.title} no projeto {alert.projectName}"`.
- Ícone severidade fica `aria-hidden="true"` (informação já está no texto/label).

### `DailyChecklist.tsx`
- `Card role="region" aria-labelledby="region-checklist-title"`.
- `<ul role="list">` para tasks; cada `<li>` com `aria-label` derivado.
- Checkbox shadcn já é acessível; adicionar `aria-label={\`Marcar tarefa como concluída: ${task.description}\`}` quando não há `<label>` visível associado.
- Filtros (chips de fonte) viram `role="group" aria-label="Filtrar por origem"`. Cada chip `<button>` ganha `aria-pressed={active}`.
- Selects de Projeto/Responsável recebem `aria-label` ("Filtrar por projeto", "Filtrar por responsável").
- Inputs: `<Input>` recebe `aria-label="Nova tarefa"`. Botão Plus recebe `aria-label="Adicionar tarefa"`.
- Botões de ação por linha (bot/ban/shield/delete) já têm `title`; adicionar `aria-label` equivalente.
- Botão Refresh já recebeu `aria-label` na fase anterior — reforçar com `aria-busy={refreshing}`.
- Quando `lastRefreshed` muda após refresh manual, anunciar via toast (já é o caso).

### `ProjectHealthList.tsx`
- `Card role="region" aria-labelledby="region-projects-title"`.
- Lista vira `<ul role="list">`. Cada item já é `role="button"`/`tabIndex={0}` — converter para `<button type="button" className="w-full text-left ...">` (semântico real).
- StatusBadge de saúde fica visualmente colorido + texto; ícone vira `aria-hidden`.

### `PendingTeamCard.tsx`
- `Card role="region" aria-labelledby="region-team-title"`.
- Itens já são `<button>` — adicionar `aria-label` com contexto completo: "Convite pendente para {nome} ({papel}) no projeto {projeto}, há {N} dias".
- Aplicar `StatusBadge` (consistência com outros cards).

### `FinancialSummary.tsx`
- Wrapper recebe `role="region" aria-label="Resumo financeiro"`.
- Cada KPI card vira `<article aria-label={...}>` (já adicionado `aria-label` na fase anterior). Ícones `aria-hidden`.

### `HeroFocusCard.tsx`
- Já tem `role="button"` no bloco "Próxima ação". Garantir `aria-pressed` não aplicável; manter `aria-label` descritivo. Ícones `aria-hidden`.
- Botão "Ver contexto do plano" ganha `aria-controls="hero-context"` apontando para o div com id="hero-context".
- CTAs (Button) já têm texto visível — ok.

### `DashboardHeader.tsx`
- `<h1>` já existe; adicionar `id="dashboard-title"`.
- `Select` recebe `aria-label="Filtrar projeto exibido"`.
- Botão "Novo Projeto" já tem texto.

### `FirstRunEmptyState.tsx`
- `<Card role="region" aria-labelledby="empty-state-title">` + `<h2 id="empty-state-title">`.
- Cada step do checklist vira `<li>` dentro de `<ul role="list">`. Container clicável vira `<button>` semântico para evitar duplo `onClick` no div + button interno (refator: o item fica `<li>` com 2 botões: o principal "Abrir ação" e o de toggle, separados por `e.stopPropagation` — ou substituir por `role="group"` mais claro).
- Barra de progresso vira `role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label="Progresso do checklist de início"`.

---

## 4. Foco e teclado

- Adicionar `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` em todos os elementos clicáveis customizados (cards convertidos para `<button>`). Tailwind/shadcn `Button` já tem.
- `Esc` no Collapsible do AI Assistant (já é Radix — ok).
- Skip link no topo (item 1).

---

## 5. ARIA dinâmico

- `Dashboard.tsx`: ao concluir refresh manual do checklist, manter `toast.success` (já anuncia via Sonner que tem `aria-live`).
- `ProjectAlertsCard`: container com `aria-live="polite"` para que novos alertas sejam anunciados.
- Skeleton de loading dos lazy: `role="status" aria-live="polite" aria-busy="true" aria-label="Carregando seção"`.

---

## 6. Out of scope

- Refatoração visual de cards.
- Mudanças no `AITaskAssistant` interno (componente compartilhado, fora do escopo deste passo).
- i18n das strings de aria-label novas (ficam em pt-BR; tarefa de migração futura).
- Testes automatizados de a11y.

---

## Resumo de arquivos editados

- `src/pages/Dashboard.tsx` (skip link + main + region wrappers)
- `src/components/dashboard/CardSkeleton` (inline em Dashboard.tsx — adicionar `role="status"`)
- `src/components/dashboard/HeroFocusCard.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/ProjectAlertsCard.tsx`
- `src/components/dashboard/DailyChecklist.tsx`
- `src/components/dashboard/ProjectHealthList.tsx`
- `src/components/dashboard/PendingTeamCard.tsx`
- `src/components/dashboard/FinancialSummary.tsx`
- `src/components/dashboard/FirstRunEmptyState.tsx`
- `src/components/dashboard/EditalProgressCard.tsx` *(lazy)*
- `src/components/dashboard/RecentTransactions.tsx` *(lazy)*
- `src/components/dashboard/UpcomingReleases.tsx` *(lazy)*
- `src/components/dashboard/GuestProjectsList.tsx` *(lazy)*

Sem mudanças em `index.css`, `tailwind.config.ts` ou hooks.
