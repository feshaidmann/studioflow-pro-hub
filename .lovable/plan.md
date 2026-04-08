
## Objetivo
Criar experiência completa para o colaborador convidado com acesso controlado ao projeto.

## Diagnóstico
**Já existe:**
- `project_invitations` com campos básicos (fee, deadline, role, token, status)
- `project_members` com delivery_status, delivery_due_date, expected_deliverable, last_activity_at, stage
- `respond-to-invite` edge function (aceita/recusa mas NÃO cria project_member)
- `InviteResponse.tsx` página pública funcional
- `ProjectDetail.tsx` com detecção owner vs guest (via `get_project_for_member` RPC)
- Guest já vê abas limitadas (overview + chat), mas muito básico
- `useProjectFiles`, `useProjectChat`, `useTasks` hooks prontos
- RLS em project_messages permite membros lerem
- RLS em project_files permite membros lerem e inserir

**Falta:**
- `respond-to-invite` não cria `project_member` ao aceitar
- Guest view no ProjectDetail muito limitado (só overview + chat)
- Sem aba de tarefas/arquivos para colaborador
- Sem campo `permissions_scope` ou `member_type`
- RLS de project_messages não permite UPDATE pelo colaborador
- Falta redirecionamento pós-aceite para área do colaborador
- Falta listagem de projetos do colaborador na navegação

## Estratégia Incremental (5 fases)

### Fase 1 — Migration DB
- Adicionar `permissions_scope` e `member_type` a `project_members`
- Adicionar `accepted_at`, `declined_at` a `project_invitations`
- Adicionar RLS para UPDATE em `project_messages` (autor da mensagem)
- Adicionar RLS para UPDATE em `project_files` (quem fez upload)

### Fase 2 — Edge Function respond-to-invite
- Ao aceitar, criar registro em `project_members` com dados do convite
- Preencher `permissions_scope = 'basic_collaborator'`, `member_type = 'collaborator'`
- Gravar `accepted_at` / `declined_at`

### Fase 3 — Área do Colaborador (ProjectDetail guest view)
- Expandir abas do guest: Resumo, Minhas Tarefas, Meus Arquivos, Conversa
- Resumo: projeto, papel, prazo, status da participação
- Tarefas: filtradas por `assigned_to` do colaborador
- Arquivos: filtrados por `user_id` do colaborador + upload
- Chat: já funciona

### Fase 4 — InviteResponse pós-aceite
- Redirecionar para `/projects/:id` após aceite (se logado)
- Se não logado, redirecionar para `/auth?redirect=/projects/:id`

### Fase 5 — Listagem de projetos do colaborador
- Na página /projects, mostrar projetos onde é membro (já existe `get_member_projects` RPC)
- Garantir que aparece na navegação

## Arquivos alterados
- `supabase/functions/respond-to-invite/index.ts`
- `src/pages/ProjectDetail.tsx`
- `src/pages/InviteResponse.tsx`

## Arquivos criados
- `src/components/project-hub/CollaboratorOverviewTab.tsx`
- `src/components/project-hub/CollaboratorTasksTab.tsx`
- `src/components/project-hub/CollaboratorFilesTab.tsx`

## Migrations
- Adicionar campos em `project_members` e `project_invitations`
- Adicionar RLS UPDATE em `project_messages` e `project_files`

## Impactos em RLS
- `project_messages`: adicionar UPDATE policy para autor
- `project_files`: adicionar UPDATE/DELETE policy para uploader que é membro

## Riscos
- Colaboradores que aceitaram antes da migration não terão `project_member` criado
- Precisará de script de reconciliação futuro se necessário

## Critérios de aceite
1. Convite aceito cria project_member automaticamente
2. Colaborador logado vê projeto com 4 abas limitadas
3. Colaborador não vê financeiro, equipe completa, lançamento
4. Colaborador pode enviar arquivos e mensagens
5. Colaborador vê apenas suas tarefas atribuídas
