

# Plano: Remover convites de plataforma da tela de Contatos

## Resumo
Eliminar a redundância de convites mantendo convites apenas no fluxo de projetos. A tela de Contatos (`/professionals`) passa a ser exclusivamente gestão de agenda, sem gerar `platform_invitations`.

## Alterações em `src/pages/Professionals.tsx`

### Remover
1. **Estado e lógica de convite de plataforma**: `sendingInvite`, `inviteLink`, `inviteLinkName`, `copiedLink`, `invitesMap`
2. **Função `sendInviteToExisting`** (linhas 354-388)
3. **Função `copyInviteLink`** (linhas 391-397)
4. **Criação de `platform_invitations` no `onSubmit`** (linhas 305-334) — manter apenas o `toast.success("Contato salvo!")` simples
5. **Fetch de `platform_invitations`** no `fetchProfessionals` (linhas 174-190)
6. **Coluna "Na plataforma"** na tabela (header linha 566, célula linhas 618-652)
7. **Modal "Link de convite gerado"** (linhas 917-950)
8. **Imports não utilizados**: `Link2`, `Copy`, `Check`, `Clock` (se ficarem órfãos)

### Manter
- Todo o resto: filtros, favoritos, modal de detalhes, métricas, CRUD de contatos
- Os convites de projeto continuam funcionando normalmente em `ProjectTeamTab`

## Nenhuma alteração de banco
As tabelas `platform_invitations` e edge functions permanecem — podem ser usadas por outros fluxos futuros. Apenas a UI de convite sai da tela de Contatos.

## Arquivo editado

| Arquivo | Ação |
|---------|------|
| `src/pages/Professionals.tsx` | Remoção de lógica/UI de convites de plataforma |

