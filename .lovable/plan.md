

# Enriquecer Editais com Dados Relevantes

## Problema atual

Cada edital exibe apenas: titulo, orgao, estado, area, status, abertura, prazo e link. Faltam informações decisivas para o artista avaliar se vale a pena se inscrever:

- **Valor** (quanto o edital oferece)
- **Público-alvo** (quem pode se inscrever)
- **Documentos exigidos** (resumo)
- **Resumo** (do que se trata)

Essas informações existem nos sites dos editais mas não são extraídas pela busca atual.

## Proposta

### 1. Ampliar a extração na busca (`edital-search`)

Adicionar campos ao SYSTEM_PROMPT do Perplexity para que extraia também:
- `valor`: texto livre ("R$ 50.000" ou "até R$ 200.000 por projeto")
- `publico_alvo`: texto curto ("Artistas e grupos musicais de SP")
- `resumo`: 1-2 frases descrevendo o edital
- `documentos_resumo`: lista curta dos principais docs exigidos

Esses campos vão no JSON estruturado `<editais_json>` que já é retornado.

### 2. Expandir a tabela `editais` no banco

Adicionar colunas:
- `valor text default ''`
- `publico_alvo text default ''`
- `resumo text default ''`
- `documentos_resumo text default ''`

### 3. Mostrar dados no card/linha do edital

No mobile (card view), exibir os novos campos quando presentes:
- Valor em destaque (badge ou texto bold)
- Resumo como texto secundário abaixo do titulo
- Público-alvo e documentos em um expandível "Ver detalhes"

No desktop (table view), adicionar coluna "Valor" e tooltip com resumo ao hover no titulo.

### 4. Detalhe expandido

Ao clicar num edital, abrir um Dialog/Sheet com todos os dados: titulo, orgao, valor, resumo, publico_alvo, documentos_resumo, prazo, link, status. Botões de ação: "Iniciar inscrição", "Abrir link", "Remover".

## Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/edital-search/index.ts` | Adicionar campos ao prompt e ao JSON de saída |
| `src/hooks/useEditais.ts` | Expandir interface `Edital` com novos campos, salvar no insert |
| `src/pages/Editais.tsx` | Card mobile com resumo/valor, dialog de detalhe, coluna Valor na tabela |

### Migração de banco
```sql
ALTER TABLE public.editais
  ADD COLUMN IF NOT EXISTS valor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS publico_alvo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resumo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documentos_resumo text NOT NULL DEFAULT '';
```

## Detalhes técnicos

- O prompt do Perplexity já extrai dados estruturados — basta adicionar os campos ao schema solicitado na ETAPA 4
- Editais já salvos ficam com campos vazios (retrocompatível)
- O dialog de detalhe reutiliza o componente Sheet existente
- Nenhuma edge function nova necessária

