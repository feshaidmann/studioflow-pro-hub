

# Plano: Melhorias de UX centradas no usuário (5 etapas)

## Visão geral

Implementar as 5 melhorias de polish identificadas no diagnóstico, em ordem de impacto para o usuário.

---

## Etapa 1 — Empty States humanizados

**Onde**: Agenda, Financeiro, Profissionais (telas vazias quando não há dados)

**O que fazer**:
- Agenda: já tem empty state razoável. Melhorar com ilustração (ícone maior + subtítulo motivacional).
- Financeiro: adicionar empty state com ícone e CTA "Registrar primeira transação" quando não há transações.
- Profissionais: adicionar empty state com ícone e CTA "Adicionar primeiro contato" quando a lista está vazia.

**Arquivos**: `Agenda.tsx`, `FinancialTracker.tsx`, `Professionals.tsx`

---

## Etapa 2 — Confirmações de ações destrutivas

**Status atual**: Projects, Finance, Agenda e Professionals **já possuem** `AlertDialog` de confirmação para exclusão. 

**O que falta**:
- Remoção de membro da equipe em `ProjectTeamTab.tsx` — verificar se tem confirmação antes de remover.
- Padronizar o texto dos dialogs para incluir o nome do item sendo excluído (ex: "Excluir o projeto **Nome do Projeto**?").

**Arquivos**: `ProjectTeamTab.tsx`, `Projects.tsx`, `Professionals.tsx`

---

## Etapa 3 — Feedback de loading em ações

**O que fazer**:
- Adicionar estado `saving`/`loading` com spinner nos botões de: criar projeto, salvar profissional, enviar mensagem no chat.
- Desabilitar botão durante a operação para evitar duplo-clique.

**Arquivos**: `Projects.tsx` (botão criar/editar projeto), `Professionals.tsx` (botão salvar), `ProjectChat.tsx` (botão enviar)

---

## Etapa 4 — Tooltips no sidebar colapsado

**O que fazer**:
- Quando `sidebarOpen === false`, envolver cada item de navegação com `<Tooltip>` exibindo o nome da seção ao passar o mouse.
- Usar o componente `Tooltip` já existente no projeto.

**Arquivo**: `AppLayout.tsx`

---

## Etapa 5 — Microcopy de sucesso nos toasts

**O que fazer**:
- Revisar todos os `toast.success()` nas páginas principais e tornar as mensagens mais orientadoras.
- Exemplos:
  - "Projeto criado!" → "Projeto criado! Adicione sua equipe para começar."
  - "Transação excluída" → "Transação removida do seu histórico."
  - "Contato salvo" → "Contato salvo! Você pode convidá-lo para projetos."

**Arquivos**: `Projects.tsx`, `FinancialTracker.tsx`, `Professionals.tsx`, `Agenda.tsx`

---

## Resumo técnico

| Etapa | Arquivos principais | Complexidade |
|-------|---------------------|-------------|
| 1. Empty States | 3 páginas | Baixa |
| 2. Confirmações | ProjectTeamTab + padronização | Baixa |
| 3. Loading | 3 componentes | Média |
| 4. Tooltips sidebar | AppLayout | Baixa |
| 5. Microcopy | 4 páginas (strings) | Baixa |

Nenhuma mudança de banco de dados ou backend é necessária.

