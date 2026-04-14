

# Plano: Simplificar a busca de editais

## Problema atual

A página tem 4 abas (Busca, Fontes automáticas, Recomendados, Painel) e a aba de Busca mistura formulário de pesquisa, filtros avançados ocultos, resultados, seleção individual, vinculação a projeto e lista de editais salvos — tudo na mesma tela. Isso sobrecarrega o artista independente que quer apenas encontrar oportunidades de fomento.

## Proposta de simplificação

### 1. Reduzir de 4 abas para 2: "Buscar" e "Meus Editais"

- **Buscar**: campo de busca + resultados + ação de salvar
- **Meus Editais**: lista salva com filtros, exportação CSV, edição, painel de métricas (colapsável)

Remover as abas **Fontes automáticas** e **Recomendados** — são funcionalidades avançadas que não funcionam de forma autônoma no MVP (dependem de Perplexity key e perfil cultural configurado). Manter o código dos hooks mas tirar da UI.

### 2. Simplificar o fluxo de busca

- Manter apenas o campo de texto + botão Buscar (remover filtros UF/Área/Status do formulário — a IA já interpreta "editais de música em SP")
- Remover o campo "Fontes adicionais" (textarea oculto no collapsible)
- Adicionar texto-guia sob o campo: _"Ex: editais de música abertos em São Paulo"_
- Após resultados: botão único **"Salvar todos"** (remover seleção individual com checkboxes e o "Salvar selecionados")
- Mover a vinculação a projeto para a aba "Meus Editais" (editar edital individualmente)

### 3. Aba "Meus Editais" mais limpa

- Manter: busca interna, tabela com ações (editar, excluir, link externo, inscrição), paginação, exportar CSV
- Adicionar filtro de status inline (badges clicáveis em vez de Select)
- Mover o Painel de métricas como seção colapsável no topo (em vez de aba separada)

### 4. Estado vazio didático

Quando o artista não tem editais salvos e não fez busca, exibir:
- Ícone + título: "Encontre editais culturais para seu projeto"
- 3 exemplos de busca clicáveis (preenchem o campo automaticamente)
- Texto curto explicando o valor: "A IA vasculha portais federais, estaduais e municipais para encontrar oportunidades de fomento para artistas."

## Arquivos alterados

- **`src/pages/Editais.tsx`** — Reescrever estrutura de abas, remover FontesTab, RecomendadosTab, PainelTab do render (manter como código morto ou remover), simplificar SearchCard, remover checkboxes dos resultados, novo empty state
- **`src/contexts/LanguageContext.tsx`** — Ajustar/adicionar chaves de tradução para novos textos

## O que NÃO muda

- Hook `useEditais` e edge function `edital-search` permanecem iguais
- Tabela do banco `editais` e RLS inalterados
- `EditalTable` e `EditEditalDialog` mantidos (apenas removido prop `selectable`)

