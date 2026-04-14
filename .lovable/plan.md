
# Plano: Remover campo "Relatório completo"

## Alterações

1. **`src/pages/Editais.tsx`** — Remover o bloco `<details>` (linhas ~908-914) que exibe `searchResult.message`.

2. **`src/contexts/LanguageContext.tsx`** — Remover a chave `"editais.report"` das traduções PT e EN.

Nenhuma alteração de banco de dados ou lógica de backend necessária.
