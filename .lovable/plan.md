

# Plano: Melhorias incrementais no módulo de Editais

## Resumo
Implementar 3 melhorias de alto valor sem criar rotas ou hooks novos, mantendo tudo na página existente.

## 1. Checkboxes de seleção nos resultados da busca
- Adicionar estado `selectedKeys: Set<string>` para rastrear session_keys selecionados
- Checkbox no header da tabela (selecionar/deselecionar todos)
- Checkbox por linha nos resultados
- Dois botões: "Salvar selecionados (N)" e "Salvar todos"
- `saveResults` recebe apenas os itens selecionados

## 2. Modal de edição para editais salvos
- Dialog com form para editar: titulo, orgao, status, area, prazo, abertura, link
- Novo método `updateEdital(id, fields)` no hook `useEditais` (UPDATE via Supabase)
- Botao de editar (Pencil icon) na coluna de ações da tabela de salvos
- Tooltip/asterisco para `inferido = true`

## 3. Paginação + busca textual nos salvos
- Estado `savedPage` e `savedSearch` (texto)
- Input de busca acima da tabela de salvos, filtrando por titulo/orgao client-side
- Paginação simples (20 por pagina) usando componentes Pagination do shadcn/ui
- Contador mostrando "X de Y editais"

## Arquivos editados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Editais.tsx` | Checkboxes nos resultados, modal de edicao, paginacao e busca nos salvos |
| `src/hooks/useEditais.ts` | Adicionar `updateEdital(id, fields)` |

Nenhuma alteracao de banco, edge function ou rotas.

