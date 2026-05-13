# Refatoração do Dashboard — 8 melhorias por prioridade técnica

Ordenado de **maior risco/impacto técnico → polimento visual**, para que cada fase deixe o código mais sólido antes da próxima.

---

## Fase 1 — Estabilidade e correção de bugs (risco alto)

**Objetivo:** eliminar bugs silenciosos e dependências stale.

1. **Corrigir `useMemo` de `financials`**
   - Remover o `eslint-disable exhaustive-deps`.
   - Incluir `getProjectFinancials` nas deps (envolvê-lo em `useCallback` no `ProjectContext` se necessário).
2. **Corrigir race do `autoGenRef`**
   - Mover `autoGenRef.current = true` para **depois** do `await`, dentro de bloco try/finally, para que reload rápido não compute delta com dado stale.
3. **`recentOnboardingProject` reativo**
   - Substituir leitura direta de `localStorage` no render por `useState` + listener `storage` / evento custom disparado quando a chave for limpa.
4. **Memoizar `buildAIChips()` e `context`** passados ao `AITaskAssistant` com `useMemo`, restaurando o `React.memo` do componente filho.

**Validação:** abrir Dashboard, recarregar com cache quente, conferir console sem warnings, verificar que toast de delta aparece apenas quando há diferença real.

---

## Fase 2 — Arquitetura (extração de hooks)

**Objetivo:** reduzir `Dashboard.tsx` de ~440 → ~200 linhas, isolar domínio.

5. **Criar hooks dedicados em `src/hooks/`:**
   - `useGuestProjects()` → encapsula `get_member_projects` + loading/error.
   - `useGuestTasks(projects)` → filtra `tasks` por projetos de convidado com `user_id` correto.
   - `usePendingInvites()` → invitations pendentes do usuário.
   - `useDailyTaskAutoGen(projects)` → encapsula a lógica de auto-geração + ref + delta.
6. **`Dashboard.tsx`** passa a apenas compor seções; remover os 3 loading states não usados.

**Validação:** comportamento idêntico, testar como owner e como convidado.

---

## Fase 3 — Performance

**Objetivo:** reduzir bundle inicial e re-renders em cascata.

7. **Lazy-load** via `React.lazy` + `Suspense` (com skeleton):
   - `AITaskAssistant`, `EditalProgressCard`, `UpcomingReleases`, `GuestProjectsList`, `RecentTransactions`.
8. **Mover `AITaskAssistant`** para baixo da fold (fechado por padrão no desktop também, abrir sob demanda).

**Validação:** verificar redução do chunk inicial e que cada seção renderiza ao entrar no viewport.

---

## Fase 4 — Design System, UX, A11y e i18n

**Objetivo:** alinhar ao design system macOS minimalista e WCAG AA.

9. **Tokens semânticos** em `index.css` substituindo cores raw:
   - Adicionar `--info`, `--info-foreground` (sky), `--accent-warm` (amber), `--accent-rose`, `--accent-violet` em HSL.
   - Substituir `text-amber-400`, `text-rose-400`, `text-violet-400`, `text-sky-400` por tokens.
   - Remover/substituir `font-mono-nums` inválido por classe utility já existente.
10. **Hierarquia da fold** (UI apenas, sem mudar lógica):
    - Unificar "Próxima ação" + `JourneyFocusCard` em um único hero card.
    - Promover `DailyChecklist` para acima de `AITaskAssistant`.
    - Corrigir margin bleeding (`-mx-4 md:-mx-6`) do header.
    - Aumentar contraste do "98%" sobre a barra em "Próximos Lançamentos".
    - Diferenciar visualmente badges "Pronto" vs "Organizado".
11. **Acessibilidade:**
    - `aria-label` em botões icon-only (`Bot`, `RefreshCw`, `Trash2`).
    - `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) em cards clicáveis.
    - Tooltip no botão de refresh; toast também no refresh manual.
12. **i18n:** mover strings hardcoded de Dashboard, DailyChecklist e JourneyFocusCard para `LanguageContext` (chaves pt/en).

**Validação:** Lighthouse a11y ≥ 95, navegação por teclado funcional, alternar idioma EN sem strings em pt-BR no Dashboard.

---

## Fora de escopo
- Mudanças de schema/RLS.
- Reescrita do `AITaskAssistant`, `JourneyFocusCard` ou `DailyChecklist` internamente (apenas props/posicionamento).
- Novas features (somente refatoração + polimento).

## Entrega
Cada fase será um conjunto coeso de edits, com mensagem indicando qual fase foi concluída para você validar antes da próxima.