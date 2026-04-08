
## Plano Simplificado — Experiência do Colaborador

### O que muda vs. plano original

| Antes | Agora |
|-------|-------|
| 3 componentes de aba separados para colaborador | Reusar `ProjectTasksTab` e `ProjectFilesTab` com prop de filtro |
| `permissions_scope` com lógica granular futura | Apenas `isOwner` boolean — simples e suficiente |
| Fallback duplo no upsert (edge function) | Upsert único, sem try/catch redundante |
| 4 abas para colaborador | Manter 4 abas, mas simplificar componentes |
| Onboarding obrigatório pós-convite | Pular onboarding para usuários com `origin = 'invite'` |

### Fase única — Implementação

**1. Refatorar abas do colaborador**
- Deletar `CollaboratorTasksTab.tsx` e `CollaboratorFilesTab.tsx`
- Adicionar prop `collaboratorMode` a `ProjectTasksTab` e `ProjectFilesTab` para filtrar por `user_id` atual
- Manter `CollaboratorOverviewTab.tsx` (tem layout diferente o suficiente)
- Atualizar `ProjectDetail.tsx` para usar os componentes reusados

**2. Limpar edge function**
- Remover bloco try/catch com fallback insert redundante (linhas 118-134)
- Manter apenas o upsert principal

**3. Reduzir fricção no onboarding**
- No `ProfileContext`, pular onboarding para perfis com `origin = 'invite'`
- Colaborador convidado vai direto para o projeto

### Adiado para fase posterior
- Listagem de projetos do colaborador na sidebar
- Notificações ao owner quando colaborador aceita
- Edição de status de entrega pelo colaborador
- Script de reconciliação de convites antigos
