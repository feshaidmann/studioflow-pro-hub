## Análise — Módulo Projetos & Integrações

Esta é uma **análise diagnóstica** (não um plano de implementação). Mapeei `Projects.tsx`, `ProjectDetail.tsx`, `ProjectContext`, todos os componentes em `src/components/project-hub/` e os pontos de integração com Dashboard, Agenda, Carreira, Finanças, Chat, Tarefas e notificações push.

Cada achado tem **severidade** (🔴 crítico · 🟡 importante · 🟢 polimento) e **arquivo:linha** quando aplicável. Ao final há uma sugestão de ondas de execução.

---

### 1. Arquitetura — duplicação de telas para o mesmo projeto

🔴 **Duas UIs paralelas para o mesmo projeto** coexistem:
- `Projects.tsx` (1.363 linhas) renderiza um *card grande* "selectedProject" quando há `?id=` na URL — com timeline, master analysis, financeiro, observações e team wizard inline.
- `ProjectDetail.tsx` (`/projects/:id`) renderiza o hub moderno com 6 abas (Visão Geral, Tarefas, Equipe, Arquivos, Financeiro, Lançamento).

Ambas editam o mesmo projeto, com fluxos divergentes:
- Cards na lista (`Projects.tsx:1080`) → navegam para `/projects/:id`.
- "Editar" no `ProjectDetail.tsx:190` → volta para `/projects?id=` (legado).
- `ProjectTeamTab.tsx:207,223` → também volta para `/projects?id=&addMember=1`.
- `addMember=1` **nem sequer é lido** em `Projects.tsx` (só `id` e `new`) — parâmetro morto.

Resultado: o usuário entra no hub, clica em "Adicionar membro" e é jogado de volta na tela antiga. Quebra a expectativa de fluxo unificado.

🔴 **`Projects.tsx` é um god-component** — 1.363 linhas concentram: lista, filtros, wizard de criação, dialog de edição, dialog de exclusão, modal de pagamento, card "selected project", wizard de equipe (200 linhas), TransactionForm, MasterAnalyzerModal e RatePartnersModal. Precisa virar 5–6 arquivos.

🟡 **Hook `useGuestProjects` existe e Projects.tsx duplica a RPC inline** (`Projects.tsx:138-143` repete `supabase.rpc("get_member_projects")` que o hook já encapsula com error handler).

---

### 2. Bugs reais

🔴 **Push notifications com URL quebrada (rota inexistente):**
- `src/contexts/ProjectContext.tsx:368` → `url: '/projetos/${id}'`
- `src/hooks/useProjectChat.ts:165` → `url: '/projetos/${projectId}'`

A rota real é `/projects/:id` (App.tsx:76). Toda notificação push de chat e mudança de estágio leva a 404.

🔴 **Race condition em `ProjectDetail` para o dono do projeto:**
`ProjectDetail.tsx:50-67` decide `ownerProject = projects.find(...)`. Se o `ProjectProvider` ainda está carregando (`loading: true`), `projects` é `[]`, então o componente assume "não sou dono" e dispara `get_project_for_member`. Para o dono real (sem linha em `project_members`), a RPC retorna vazio e mostra **"Projeto não encontrado"** em hard refresh. Falta esperar o `loading` do `useProjects()`.

🔴 **`Projects.tsx` ignora `loading` do contexto** — exibe "Nenhum projeto encontrado com esses filtros." instantaneamente em refresh, antes do fetch terminar.

🟡 **Textarea de Observações sem debounce** (`Projects.tsx:796-800`) — uma chamada `updateProject` (que faz `supabase.update`) por tecla digitada. Pode disparar dezenas de writes em segundos.

🟡 **`updateProject` não é aguardado em `handleEditProject`** (`Projects.tsx:479`). Combina com `handleLancadoCompletion(...)` na linha 483, que abre o RatePartners antes do update terminar — possível inconsistência se a UI piscar durante a transição.

🟡 **`subgenre` é lido mas nunca persistido**: `dbRowToProject` mapeia `subgenre` (ProjectContext.tsx:146), mas `addProject` e o branch de mapeamento em `updateProject` não enviam essa coluna ao Supabase. Campo silenciosamente read-only.

🟡 **Default tracks ainda criados em todo `addProject`** (`ProjectContext.tsx:317`) e em todo bootstrap para projetos sem tracks (`:217-222`) — o módulo `/studio` foi descontinuado (memória `studio-module-deprecated`); essas inserções em `mix_tracks` viraram lixo write-only.

🟢 **`if (file.size > 50 * 1024 * 1024) return;`** em `ProjectFilesTab.tsx:64` — falha silenciosa, sem toast.

🟢 **Type assertion `as any` repetida** em `Projects.tsx:430,452,476`: `(profile as any).state`, `(project as any).genre`. Sintoma de tipos `Project`/`Profile` desatualizados.

---

### 3. Violações do design system (memória core)

A memória diz: **light mode only, macOS minimalista, tokens semânticos, sem neon**. Achados:

🔴 **Cores cruas (não-semânticas) em vários componentes** — vão renderizar errado no tema claro neutro (220 14% 96%) porque `-400` é tunado para fundos escuros:
- `ProjectTeamTab.tsx:38-43,286,412,418,424,445` — `text-yellow-400`, `blue-400`, `orange-400`, `red-400`, `emerald-400`, `green-400`.
- `ProjectChat.tsx:355,360,416,422` — `text-yellow-500`, `text-green-500`.
- `ProjectOverviewTab.tsx:36-38,101,107,183` — `text-amber-400`, `border-amber-400/40`.
- `ProjectTasksTab.tsx:32,43,44` — `text-amber-400`.

Devem virar `text-warning`, `text-destructive`, `text-success`, `text-primary`, `text-muted-foreground`.

🔴 **`neon-glow` e `animate-pulse-neon` ainda presentes** em `Projects.tsx:729,737,769,963,1329` — viola explicitamente "NO neon/gamer effects".

🟡 **Cores inline em `getProjectStatus`** (`Projects.tsx:124-134`) — strings de className concatenando hsl tokens com classes brutas; deveria virar uma config tipada com tokens.

---

### 4. UX / CX da jornada do projeto

🔴 **Dois pontos de entrada concorrentes**: lista de projetos abre `ProjectDetail` (rota dedicada), mas o Dashboard (`ActiveProjectsList`, `UpcomingReleases`, `MusicDNAAnalyzer`) e o `ProjectTeamTab` navegam para `/projects?id=` (legado). Padronizar em **uma rota só** (`/projects/:id`) elimina metade da Projects.tsx.

🟡 **Card "Continue de onde parou"** (`Projects.tsx:1158-1181`) sugere ações fixas por estágio (ex: "Agendar sessão" para `gravacao`) sem checar se o usuário já fez isso. Pode ficar repetitivo.

🟡 **`stageFilter` é estado morto** — definido em `Projects.tsx:121` mas só `statusFilter` aparece nos chips (linha 1037-1056). Removeu UI mas esqueceu o state.

🟡 **Header duplicado**: `MobileStickyHeader` (sempre visível) + header desktop (`md:flex`) renderizam o mesmo conteúdo com formatos diferentes ("X ativos" vs "X ativos · Y quase pronto · Z concluídos"). Inconsistência de copy.

🟡 **Wizard "Adicionar à equipe"** (Projects.tsx:822+) — 8 tipos em grid 3-col fica apertado no mobile, e a separação "Instrumentista" vs "Produtor/Mix/Master/Compositor/…" não é óbvia. Memória `team-and-contacts` define que Producer/Mix/Master são *automatic roles*; a UI deveria refletir isso.

🟡 **Convites — fonte de verdade dupla**: tokens/status de invite carregados em `Projects.tsx:174-190` (state local) **e** em `ProjectTeamTab.tsx:72-89` (state local). Duas fetches, dois caches divergentes para a mesma tabela. Deveria virar um hook `useProjectInvites(projectId)`.

🟡 **Após criar projeto** o toast diz "Adicione sua equipe para começar" mas o wizard não abre. Quebra do call-to-action.

🟡 **Realtime parcial**: `ProjectChat` usa Supabase Realtime; `useTasks` e `useProjects` não. Tarefa marcada por colaborador não atualiza para o dono sem refresh manual.

🟢 **Botão WhatsApp share** (`ProjectOverviewTab.tsx:206`) não inclui link para o projeto — só texto. Perde o canal de tracking/visita.

🟢 **Card timeline** (Projects.tsx:692-747) e timeline em ProjectOverviewTab (linha 70-94) são duas implementações distintas do mesmo conceito.

🟢 **"Detalhes opcionais"** no wizard sempre fechado por padrão, mesmo quando o usuário já preencheu campos numa interação anterior — perde contexto.

---

### 5. Performance

🟡 **Bootstrap pesado**: `ProjectContext` faz `Promise.all([projects, transactions, mix_tracks, project_members])` e ainda roda `for (p of missingProjects) insert mix_tracks` síncrono por projeto sem tracks. Para usuário com 30 projetos antigos vira 30 INSERTs sequenciais.

🟡 **`mix_tracks` carregado integralmente** mesmo após depreciar `/studio`. É puro overhead — pode virar fetch lazy por projeto se um dia a feature voltar, ou ser removido.

🟡 **Três fontes de progresso** divergentes:
- `getMixPercent` (ProjectContext.tsx:255) — só lookup em `stagePercent`.
- `STAGE_PERCENT` (ProjectDetail.tsx:29) — outro mapeamento (com `rough: 0`).
- `progressPct` (Projects.tsx:1072) — calcula por índice no array `stageOrder`.

Cada um dá um número diferente para o mesmo estágio. Centralizar em `lib/projectProgress.ts`.

🟢 **`buildProjectContext` e `aiChips`** recriados a cada render em `ProjectDetail`. Memoizar.

---

### 6. Acessibilidade

🟡 Cards de projeto reagem a `Enter` mas **não a `Space`** (Projects.tsx:1081).
🟡 Stage timeline em ProjectOverviewTab são pontos coloridos sem `role="list"` nem `aria-current`.
🟡 Botões da timeline em Projects.tsx mantêm `cursor-pointer` mesmo `disabled` (lógica ternária linha 721).
🟢 Vários botões icon-only sem `aria-label` no wizard.

---

### 7. Integrações (estado atual)

| Integração | Status | Observação |
|---|---|---|
| Dashboard ↔ Projects | 🟡 funciona | usa `/projects?id=` legado em vários pontos |
| Agenda ↔ Projects | 🟢 ok | deep-link `?new=1&project=` consistente |
| Carreira ↔ Projects | 🟢 ok | link `/carreira?project=` em Overview |
| Financeiro ↔ Projects | 🟡 ok | duas fontes de cálculo (ProjectFinanceCard inline + ProjectFinanceTab) |
| Chat ↔ Tasks | 🟡 parcial | linka tarefa, mas push notif com URL quebrada |
| Push notifications | 🔴 quebrada | rota `/projetos/...` inexistente |
| Master Analyzer | 🟢 ok | fluxo intact |
| Rate Partners | 🟡 dispara via `handleLancadoCompletion` sem await |
| Guest flow (RPC `get_project_for_member`) | 🟡 colide com loading do owner | corrigir guard |

---

### Priorização sugerida (ondas)

**Onda 1 — Bugs de produção (1 sessão):**
1. Corrigir URLs de push (`/projetos/` → `/projects/`) em `ProjectContext.tsx:368` e `useProjectChat.ts:165`.
2. Guard de `loading` em `ProjectDetail.tsx` antes de classificar como guest.
3. Debounce na textarea de Observações.
4. `await updateProject` em `handleEditProject`.

**Onda 2 — Design system (1 sessão):**
5. Substituir cores cruas (`-400/500`) por tokens semânticos em ProjectTeamTab, ProjectChat, ProjectOverviewTab, ProjectTasksTab.
6. Remover `neon-glow` e `animate-pulse-neon` de Projects.tsx (5 ocorrências).

**Onda 3 — Unificação arquitetural (2–3 sessões):**
7. Eliminar a tela "selectedProject" do `Projects.tsx`. Toda navegação vai para `/projects/:id`. Mover edit/delete dialogs e payment modal para componentes separados em `src/components/projects/`.
8. Extrair `TeamWizardDialog` (200 linhas atualmente inline) para componente próprio reutilizável pelo hub.
9. Criar hook `useProjectInvites(projectId)` substituindo as duas cópias de fetch.
10. Centralizar progresso em `lib/projectProgress.ts`.

**Onda 4 — UX (1–2 sessões):**
11. Auto-abrir wizard de equipe após criar projeto (cumprir o CTA do toast).
12. Realtime nas tabelas `tasks` e `projects` (já existe pra `chat_messages`).
13. Mobile sticky header + desktop header alinhados em uma única fonte de copy.
14. Remover `stageFilter` morto.

**Onda 5 — Limpeza (avaliar):**
15. Decidir o destino de `mix_tracks` (deletar tabela ou tornar lazy). Se deletar, simplifica `addProject` e bootstrap.
16. Persistir `subgenre` ou remover do tipo.

---

Posso destrinchar qualquer onda em plano de implementação concreto. Indique qual quer atacar primeiro (recomendo **Onda 1 + Onda 2** juntas, são localizadas e baixo risco).
