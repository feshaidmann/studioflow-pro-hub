## Refatoração do módulo Contatos (`/professionals`)

Quatro frentes em um único plano. Sem mudanças no schema do banco — apenas frontend (a tabela `professionals` já tem `allow_global_listing`, `favorite`, `phone`, `bio`).

### 1. Split de código (reduzir monolito de 818 linhas)

Novos arquivos:

- `src/hooks/useProfessionalsList.ts` — fetch da lista + ratingsMap + allocationsMap, expõe `{ professionals, ratingsMap, allocationsMap, loading, refetch, toggleFavorite, remove }`. Substitui `fetchProfessionals` inline. Usa `Promise.all` para as 3 queries.
- `src/hooks/useProfessionalMetrics.ts` — recebe `professional` e devolve `{ metrics, loading }`. Faz as 3 queries do `openDetail` em paralelo via `Promise.all`.
- `src/components/professionals/ProfessionalsTable.tsx` — tabela desktop (colunas atuais).
- `src/components/professionals/ProfessionalsCardList.tsx` — lista de cards para `< md` (substitui o overflow horizontal).
- `src/components/professionals/ProfessionalsFilters.tsx` — search + chips (status, favoritos, em projeto, especialidade).
- `src/components/professionals/ProfessionalDetailModal.tsx` — modal de detalhe (ver §3).
- `src/components/professionals/ProfessionalFormDialog.tsx` — modal criar/editar (ver §4).
- `src/components/professionals/DeleteProfessionalDialog.tsx` — alert dialog de exclusão com mensagem mais clara.

`src/pages/Professionals.tsx` vira ~120 linhas: header, hooks, e composição dos componentes acima.

Match por id quando possível: ratings já têm `professional_id` (nullable). Atualizar `useProfessionalMetrics` para preferir `professional_id` e cair em `ilike(name)` como fallback (sem migration agora — apenas usar a coluna que já existe).

### 2. UI/UX da listagem

- **Mobile (< md)**: substituir tabela por `ProfessionalsCardList`. Cada card mostra avatar (inicial do nome em círculo), nome + favorito, especialidade, badge "Em projeto: X", nota, e menu de 3 pontos com ações (editar / excluir). Toque no card abre detalhe.
- **Desktop**: manter tabela, mas:
  - Remover ícones de Editar/Excluir das linhas. Substituir por menu kebab (`DropdownMenu`) com Editar, Excluir, Marcar como favorito, Convidar para projeto.
  - Linha continua clicável → abre detalhe (com `role="button"`, `tabIndex=0`, handler `Enter/Space`).
  - Estrela de favorito vira só ícone visual; marcar/desmarcar pelo menu (resolve o conflito de 3 affordances).
- **Filtros**: alinhar todos os chips na mesma altura (`h-7`). Especialidade vira `DropdownMenu` (não Select) para combinar com os outros chips, com checkmark. Adicionar chip "Cidade" se houver cidades cadastradas.

### 3. Modal de detalhe

- **Header**: avatar inicial em círculo (cor derivada do nome) no lugar do 🎵 fixo. Nome, especialidade, badges (Ativo/Inativo, Globalmente listado).
- **Métricas**: trocar grid 4 colunas com `text-[9px]` por 2 linhas legíveis:
  - Linha 1 (sempre visível): `Projetos juntos · Na plataforma · Nota média (n) · Na agenda desde`. Tipografia `text-sm/text-base`, labels em `text-xs`.
  - Linha 2 (financeiro, **colapsado por padrão**): toggle `<button>` "Mostrar dados financeiros" → expande "Cachê médio" e "Prazo médio". Persistir preferência em `localStorage` (`professionals.show_financial`).
- **Histórico de colaboração**: mantém, mas com `max-h-[200px] overflow-y-auto` quando > 4 itens.
- **Contato**: e-mail (mailto), WhatsApp (wa.me com sanitização e validação mínima de 10 dígitos antes de mostrar o link).
- **Bio**: igual.
- **Footer com ações úteis**:
  - Se contato tem perfil público (futuramente lookup por email em `profiles.public_email` + `allow_global_listing` — query opcional dentro de `useProfessionalMetrics`): botão "Ver perfil público" → `/u/:username`.
  - Botão "Convidar para projeto" → abre `Select` inline com projetos do usuário (do `ProjectContext`) e navega para `/projects/:id` na aba equipe (sem inscrever automaticamente; respeita constraint MVP de "convites manuais").
  - "Editar" e "Fechar" mantidos.
- Adicionar `<DialogDescription>` em todos os modais (acessibilidade).

### 4. Formulário criar/editar

- Adicionar `<DialogDescription>`.
- **Especialidade**: trocar `<Input>` livre por `<Select>` populado com `specialtyOptions` (constants/specialtyOptions.ts), com opção "Outro" que volta ao input livre. Garante consistência com Equipe/Parceiros.
- **Telefone**: máscara BR `(XX) XXXXX-XXXX` no `onChange` + validação Zod ajustada (`/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/` ou vazio). Helper text "Usado para gerar link do WhatsApp".
- **Cidade**: novo campo de texto livre (existe coluna? Não — `professionals` não tem `city`). **Sem migration neste plano**: omitir o campo cidade até ter alinhamento, OU adicionar via migration separada. Por enquanto: pular cidade neste plano para não acoplar mudança de schema.
- **Toggle "Aparecer no banco global"**: novo `Switch` com label e helper text "Outros artistas poderão te encontrar pelo nome/especialidade. Você pode desativar a qualquer momento." Vincula a `allow_global_listing`.
- **Validação anti-duplicata client-side**: ao submeter create, verificar se `email` já existe na lista carregada — se sim, mostrar warning e perguntar "Deseja editar o existente?" antes de inserir.
- Layout: 2 colunas em `sm+` para Telefone/Especialidade, demais em coluna única.

### 5. Confirm de exclusão

- Texto: "Excluir **{nome}**? Esta ação não pode ser desfeita. O histórico de colaborações em projetos passados continuará visível, mas o contato sairá da sua agenda."

### Fora de escopo (conscientemente)

- Migration para adicionar `city`, `instagram`, `avatar_url` em `professionals`.
- Importação CSV / merge de duplicatas globais.
- Realtime / React Query.
- Backfill de `professional_ratings.professional_id` quando nulo.

### Arquivos editados/criados

```text
src/pages/Professionals.tsx                                 (refatorar — ~120 linhas)
src/hooks/useProfessionalsList.ts                           (novo)
src/hooks/useProfessionalMetrics.ts                         (novo)
src/components/professionals/ProfessionalsTable.tsx         (novo)
src/components/professionals/ProfessionalsCardList.tsx      (novo)
src/components/professionals/ProfessionalsFilters.tsx       (novo)
src/components/professionals/ProfessionalDetailModal.tsx    (novo)
src/components/professionals/ProfessionalFormDialog.tsx     (novo)
src/components/professionals/DeleteProfessionalDialog.tsx   (novo)
```

Sem mudanças no banco. Sem mudanças em outras páginas além de imports já existentes.
