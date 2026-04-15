

# Adicionar campos enriquecidos ao dialog de Edição de Edital

## Problema
O dialog de edição (`EditEditalDialog`) só carrega 7 campos (titulo, orgao, status, area, prazo, abertura, link). Os 4 novos campos (valor, publico_alvo, resumo, documentos_resumo) e o campo **estado** (UF) não aparecem — o artista não consegue editá-los nem vê-los pré-preenchidos.

## Mudanças

### Arquivo: `src/pages/Editais.tsx` — `EditEditalDialog`

1. **Expandir o `reset()`** para incluir os 5 campos faltantes: `estado`, `valor`, `publico_alvo`, `resumo`, `documentos_resumo`

2. **Adicionar ao formulário:**
   - **Estado (UF)** — Input texto curto, ao lado de Órgão (grid 2 colunas)
   - **Valor** — Input texto, ao lado de Link (grid 2 colunas)
   - **Público-alvo** — Input texto, linha completa
   - **Resumo** — Textarea (3 linhas), linha completa
   - **Documentos exigidos** — Textarea (2 linhas), linha completa

3. **Tornar o dialog scrollável** — adicionar `max-h-[80vh] overflow-y-auto` ao conteúdo, pois agora tem mais campos

### Nenhuma alteração de banco ou edge function necessária
Os campos já existem na tabela `editais` e o `updateEdital` no hook já aceita `Partial<Edital>`.

## Layout proposto
```text
┌─ Título ─────────────────────────┐
├─ Órgão ──────────┤─ Estado (UF) ─┤
├─ Status ─────────┤─ Área ────────┤
├─ Link ───────────┤─ Valor ───────┤
├─ Abertura ───────┤─ Prazo ───────┤
├─ Público-alvo ───────────────────┤
├─ Resumo (textarea) ─────────────┤
├─ Documentos exigidos (textarea) ─┤
└─ [Salvar] ───────────────────────┘
```

