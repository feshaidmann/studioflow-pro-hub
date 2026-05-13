## Objetivo

Tornar a "above-the-fold" do Dashboard imediatamente legível: 1 herói com a próxima ação, checklist como segundo bloco e IA logo abaixo no desktop. Padronizar **badges de status** (crítico / atenção / ok / info) e **estados visuais** (vazio, carregando, sucesso, alerta) em todos os cards.

Apenas frontend/presentation — nenhuma mudança em schema, RLS, hooks de dados ou regras de negócio.

---

## 1. Nova hierarquia da fold (Dashboard.tsx)

Ordem atual (desktop): `Header → JourneyFocusCard → NextAction → AIAssistant → seções dinâmicas → GuestProjects`.

Ordem proposta (desktop):

```text
1. DashboardHeader (saudação + filtro de projeto)         [unchanged]
2. HeroFocusCard  ← NOVO: funde JourneyFocusCard + "Próxima ação"
   ├─ Linha 1: saudação + plano personalizado
   ├─ Linha 2: chip de "Próxima ação" (clicável → IA) com ícone severity
   └─ Linha 3: 3 CTAs (primary path, secondary path, "Perguntar IA")
3. ProjectAlertsCard (somente se houver crítico/warning)
4. DailyChecklist  ← promovido acima da IA
5. AIAssistant collapsible (default aberto desktop, fechado mobile)
6. Demais seções via journeyPlan.sections (projects, editais, releases, finance…)
7. GuestProjectsList
```

Mobile: o `AIAssistant` continua após o checklist (já é o comportamento). O `HeroFocusCard` colapsa o bloco de chips de momento/foco em um botão "ver detalhes" para reduzir scroll.

Arquivos:
- Criar `src/components/dashboard/HeroFocusCard.tsx` (funde `JourneyFocusCard` + bloco "Próxima ação" inline atual em `Dashboard.tsx`).
- Remover o uso de `JourneyFocusCard` e o bloco `nextAction` de `Dashboard.tsx`; manter `JourneyFocusCard.tsx` no repo (sem uso) ou deletar — proponho deletar para evitar dead code.
- Reordenar JSX em `Dashboard.tsx` conforme acima. Promover `DailyChecklist` para fora do loop `journeyPlan.sections.map(...)` e renderizar antes do `AIAssistant`. O loop continua para os demais (`alerts`, `team`, `projects`, `editais`, `releases`, `finance`, `transactions`), filtrando `checklist` e `alerts` quando já renderizados acima.

---

## 2. Sistema de badges de status (novo componente)

Criar `src/components/dashboard/StatusBadge.tsx` com 4 variantes mapeadas a tokens semânticos:

| Variante     | Token             | Uso                                |
|--------------|-------------------|------------------------------------|
| `critical`   | destructive       | Vencido, bloqueio crítico          |
| `warning`    | warning           | Hoje/em 1-3d, orçamento estourando |
| `info`       | primary / info    | Próximo passo, lembrete            |
| `success`    | success           | Tudo em dia, KPI positivo          |
| `neutral`    | muted             | Contagens, tags genéricas          |

API: `<StatusBadge variant="critical" icon={AlertTriangle}>3 críticos</StatusBadge>`. Usa `cva` com classes `bg-{token}/10 text-{token} border-{token}/30`. Substitui os `Badge variant="outline" className="...bg-destructive/10..."` espalhados em `DailyChecklist`, `ProjectAlertsCard`, `ProjectHealthList`, `FinancialSummary`, `HeroFocusCard`.

---

## 3. Estados visuais por card

Padronizar 4 estados em todos os cards do Dashboard:

| Estado     | Tratamento visual                                                                 |
|------------|-----------------------------------------------------------------------------------|
| Loading    | `<CardSkeleton />` já existente; cards não-lazy ganham `Skeleton` interno         |
| Vazio      | Ícone + microcopy + CTA pequeno (ex.: checklist "Nenhuma tarefa. 🎉" já existe)   |
| Saudável   | Borda neutra, badge `success` no header quando aplicável                          |
| Alerta     | Borda lateral 4px no token (`border-l-4 border-l-destructive/warning/primary`)    |

Ajustes específicos:
- **HeroFocusCard:** borda esquerda colorida conforme severity da próxima ação (destructive / warning / primary / success quando não há ação pendente).
- **ProjectAlertsCard:** já usa `border-warning/20`; trocar para `border-l-4 border-l-warning` e remover bordas internas redundantes nos itens (manter apenas `bg-{sev}/5`).
- **DailyChecklist:** header ganha `StatusBadge` com a contagem + variante derivada (overdue → critical, today → warning, else neutral). Atual `<Badge variant="secondary">` é trocado.
- **FinancialSummary:** KPI "Resultado" ganha pequena seta ↑/↓ ao lado do valor; "Margem" ganha cor variando por faixa (`<10%` warning, `<0%` destructive, senão success). Adicionar `aria-label` por card.
- **ProjectHealthList:** badge de % de saúde já existe — mapear para `StatusBadge` (≥80 success, 50-79 warning, <50 critical).
- **UpcomingReleases / EditalProgressCard / RecentTransactions / GuestProjectsList:** header padronizado com `StatusBadge` neutra de contagem, e estado vazio com ícone+microcopy alinhado ao restante.

---

## 4. Acessibilidade e i18n (escopo desta fase)

- `aria-label` em todos os botões icon-only do Hero, Checklist e Alerts.
- `role="button"`, `tabIndex={0}` e `onKeyDown` (Enter/Space) no card "Próxima ação" agora dentro do Hero.
- Tooltip no botão de refresh do Checklist ("Atualizar checklist").
- Strings novas adicionadas ao `LanguageContext` (pt/en) — somente strings introduzidas pelos novos componentes; não migrar strings legadas neste passo.

---

## Out of scope

- Mudanças em hooks (`useTasks`, `useProjectAlerts`, etc.) e qualquer query/RLS.
- Migração completa de i18n das strings legadas do Dashboard.
- Redesign de `AITaskAssistant` interno ou de seções fora do Dashboard.

---

## Detalhes técnicos (resumo de arquivos)

- **Novo:** `src/components/dashboard/HeroFocusCard.tsx`, `src/components/dashboard/StatusBadge.tsx`.
- **Editado:** `src/pages/Dashboard.tsx` (reordenar JSX + remover bloco nextAction inline + usar HeroFocusCard), `src/components/dashboard/DailyChecklist.tsx`, `src/components/dashboard/ProjectAlertsCard.tsx`, `src/components/dashboard/FinancialSummary.tsx`, `src/components/dashboard/ProjectHealthList.tsx`, `src/components/dashboard/UpcomingReleases.tsx`, `src/components/dashboard/EditalProgressCard.tsx`, `src/components/dashboard/RecentTransactions.tsx`, `src/components/dashboard/GuestProjectsList.tsx`, `src/contexts/LanguageContext.tsx` (apenas chaves novas).
- **Removido:** `src/components/dashboard/JourneyFocusCard.tsx` (substituído pelo Hero).

Sem alterações em `index.css`/`tailwind.config.ts` — os tokens `destructive`, `warning`, `success`, `info`, `primary` já existem.
