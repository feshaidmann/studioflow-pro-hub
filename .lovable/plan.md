

# Diagnóstico Tecnico e Plano da Fase 1 — StudioFlow Pro

---

## 1. Diagnostico da Base Atual

### Arquitetura
- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS v3
- **Backend**: Lovable Cloud (Supabase) com 22 tabelas, RLS configurado, 8 Edge Functions
- **Contextos**: AuthContext, ProfileContext, ProjectContext, LanguageContext
- **Rotas**: 18 rotas (8 protegidas dentro de AppLayout)

### Pontos Fortes (preservar)
- RLS bem implementado em todas as tabelas
- Sistema de tarefas automáticas com regras configuráveis
- Onboarding com flag server-side (`onboarding_completed`)
- Assistente IA integrado ao Dashboard com contexto dos projetos
- Chat de projeto em tempo real
- Workflow de 6 etapas com progressão visual

### Problemas Identificados
| Area | Problema |
|------|----------|
| **Onboarding** | 3 passos genéricos (nome, especialidades, visibilidade). Não orienta o uso real da plataforma. |
| **Dashboard** | Arquivo monolítico (911 linhas). Mistura KPIs, checklist, projetos, transações e IA em um unico componente. |
| **Projects.tsx** | 1097 linhas. Combina listagem, criação, edição, equipe, convites, finanças e master analyzer em uma unica pagina. |
| **ProjectDetail.tsx** | Muito simples — mostra apenas timeline + chat. Sem abas, sem tarefas, sem finanças do projeto. |
| **Modo simples/avançado** | `track_view_mode` existe no perfil mas so afeta a visão de tracks, não a complexidade geral da interface. |
| **ProjectContext** | 563 linhas, acumula projetos, tracks, profissionais e transações. |

---

## 2. Arquitetura Proposta — Fase 1

### 2.1 Novo Onboarding Orientado ao Uso

**Objetivo**: Guiar o artista a criar seu primeiro projeto real durante o onboarding.

**Fluxo proposto** (4 passos):
1. **Identidade** — nome, cidade (manter atual)
2. **Primeiro Projeto** — nome do projeto, tipo (single/EP/album), etapa atual
3. **Modo de uso** — escolher entre "Simples" (oculta tracks avançadas, financeiro resumido) ou "Completo" (tudo visível)
4. **Pronto** — resumo + entrar

**Alterações**:
- `src/pages/Onboarding.tsx` — adicionar steps 2 (projeto) e 3 (modo), remover step de especialidades (mover para Settings)
- `profiles` table — reutilizar `track_view_mode` renomeando conceitualmente para representar o "modo" (basic = simples, advanced = completo). Sem migration necessária.

### 2.2 Dashboard Mais Acionável

**Objetivo**: Reduzir ruído, priorizar ações. Componentizar.

**Estrutura proposta**:
```text
Dashboard
├── DashboardHeader (saudação + filtro + CTA)
├── QuickActions (cards clicáveis: novo projeto, nova transação, agenda)
├── ActiveProjectsList (projetos ativos com progresso)
├── DailyChecklist (tarefas, já existe mas extraído)
├── FinancialSummary (KPIs financeiros, extraído)
└── AIAssistantCard (já existe, extraído)
```

**Alterações**:
- Criar `src/components/dashboard/` com 5-6 componentes extraídos do Dashboard.tsx
- `src/pages/Dashboard.tsx` — reduzir para ~150 linhas, orquestrar sub-componentes
- Modo simples: ocultar KPIs de margem e transações recentes
- Modo completo: tudo visível (comportamento atual)

### 2.3 Project Hub com Abas (preparação)

**Objetivo**: Transformar ProjectDetail em hub central do projeto, com abas.

**Abas propostas**:
1. **Visão Geral** — timeline de progresso + resumo (atual)
2. **Equipe** — membros, convites (extrair de Projects.tsx)
3. **Chat** — chat em tempo real (atual, já existe)
4. **Tarefas** — checklist filtrado por projeto (reutilizar useTasks)
5. **Finanças** — receitas/despesas do projeto (extrair de Projects.tsx)

**Alterações**:
- `src/pages/ProjectDetail.tsx` — adicionar sistema de Tabs, mover conteúdo existente para aba "Visão Geral"
- Criar `src/components/project-hub/` com:
  - `ProjectOverviewTab.tsx`
  - `ProjectTeamTab.tsx`
  - `ProjectTasksTab.tsx`
  - `ProjectFinanceTab.tsx`
- `src/pages/Projects.tsx` — simplificar, remover blocos de equipe/finanças que migram para o hub

---

## 3. Arquivos a Alterar/Criar

### Alterar
| Arquivo | Escopo da Alteração |
|---------|-------------------|
| `src/pages/Onboarding.tsx` | Adicionar steps de projeto e modo |
| `src/pages/Dashboard.tsx` | Extrair sub-componentes, respeitar modo |
| `src/pages/ProjectDetail.tsx` | Adicionar Tabs, integrar sub-componentes |
| `src/pages/Projects.tsx` | Remover blocos que migram para hub |
| `src/contexts/ProfileContext.tsx` | Expor helper `isSimpleMode` baseado em `track_view_mode` |
| `src/components/AppLayout.tsx` | Nenhuma alteração na Fase 1 |

### Criar
| Arquivo | Proposito |
|---------|-----------|
| `src/components/dashboard/DashboardHeader.tsx` | Header com saudação e filtro |
| `src/components/dashboard/QuickActions.tsx` | Cards de ação rapida |
| `src/components/dashboard/ActiveProjectsList.tsx` | Lista de projetos ativos |
| `src/components/dashboard/DailyChecklist.tsx` | Checklist extraído |
| `src/components/dashboard/FinancialSummary.tsx` | KPIs financeiros |
| `src/components/dashboard/AIAssistantCard.tsx` | Card do assistente IA |
| `src/components/project-hub/ProjectOverviewTab.tsx` | Aba visão geral |
| `src/components/project-hub/ProjectTeamTab.tsx` | Aba equipe |
| `src/components/project-hub/ProjectTasksTab.tsx` | Aba tarefas do projeto |
| `src/components/project-hub/ProjectFinanceTab.tsx` | Aba finanças do projeto |

---

## 4. Tabelas/Campos — Alterações

**Nenhuma migration necessária na Fase 1.** Justificativa:
- `track_view_mode` ('basic'/'advanced') já existe em `profiles` e será reutilizado para o conceito de modo simples/completo
- O onboarding já cria o projeto via `ProjectContext.addProject()` existente
- Tarefas por projeto já filtram por `project_id` na tabela `tasks`

---

## 5. Ordem de Implementação

| Etapa | Entrega | Risco |
|-------|---------|-------|
| **1** | `ProfileContext` — adicionar `isSimpleMode` | Nenhum, é aditivo |
| **2** | Extrair componentes do Dashboard para `src/components/dashboard/` | Baixo — refactor puro, sem mudança funcional |
| **3** | Recompor `Dashboard.tsx` usando sub-componentes + modo simples/completo | Medio — testar que nada quebrou |
| **4** | Atualizar `Onboarding.tsx` com novos steps | Baixo — pagina isolada |
| **5** | Criar componentes em `src/components/project-hub/` | Baixo — novos arquivos |
| **6** | Atualizar `ProjectDetail.tsx` com Tabs | Medio — muda UX existente |
| **7** | Simplificar `Projects.tsx` (remover blocos migrados) | Alto — pagina complexa, testar regressão |

---

## 6. Riscos e Cuidados

| Risco | Mitigação |
|-------|-----------|
| Quebrar Dashboard ao extrair componentes | Fazer extração 1 componente por vez, testar entre cada um |
| Perder estado do checklist de first-run (localStorage) | Manter mesma key `sfp_onboarding_done` |
| Onboarding criar projeto sem dados suficientes | Validar nome do projeto como obrigatório; tipo default "single" |
| ProjectDetail com tabs pode confundir guests (membros convidados) | Guests veem apenas abas "Visão Geral" e "Chat" |
| Projects.tsx muito grande para refatorar de uma vez | Na Fase 1, apenas extrair equipe/finanças para hub; manter listagem e criação em Projects.tsx |
| `track_view_mode` sendo usado em outros lugares | Verificar que nenhum componente depende do valor para lógica critica além de exibição de tracks |

