# Plano de Execução — Refinamento CX do Módulo Criativo

Implementação dos achados do diagnóstico em 4 ondas, da maior à menor alavanca.

---

## Onda 1 — Taxonomia de estilo unificada

**Problema**: `StyleChips` envia IDs em inglês (`minimalist`), `QuickTemplates` envia rótulos em português (`Minimalista`). A IA recebe entradas inconsistentes.

**Mudanças**
- `src/components/creative/StyleChips.tsx`: manter ID em inglês como valor canônico, exibir label PT.
- `src/components/creative/QuickTemplates.tsx`: trocar `style: "Minimalista"` → `style: "minimalist"` (e demais templates) para casar com os IDs de `StyleChips`.
- `supabase/functions/generate-creative/index.ts`: criar mapa `STYLE_DESCRIPTIONS` (id → instrução visual rica em inglês) e injetar no system prompt em vez do ID cru. Ex.: `minimalist` → "minimalist composition, generous negative space, restrained palette, refined typography".

---

## Onda 2 — Modos de referência (identity / variation / edit)

**Problema**: `editImageUrl` aciona "STRICT IDENTITY PRESERVATION" para qualquer caso — variações ficam travadas, edits abstratos perdem liberdade.

**Mudanças no edge function `generate-creative`**
- Aceitar novo campo `referenceMode: "identity" | "variation" | "edit"` (default `"identity"`).
- Bloco de instruções condicional:
  - `identity`: mantém regras atuais de preservação facial.
  - `variation`: "Use the reference as conceptual seed; preserve overall mood and palette but freely change composition, framing, subject pose. If a face appears, you may reinterpret it loosely."
  - `edit`: "Apply the textual edit instruction to the reference image; preserve subjects and composition, change only what the user describes."

**Mudanças no client**
- `src/hooks/useCreativeAssets.ts`: adicionar `referenceMode?` no payload de `generate`.
- `src/pages/Creative.tsx`:
  - `handleGenerate` (com `referenceImage` upload): passa `"identity"`.
  - `handleVariation`: passa `"variation"`.
  - `handleEditSubmit`: passa `"edit"`.

---

## Onda 3 — Transparência de texto antes de gerar

**Problema**: Switch "Arte sem nenhum texto" e campos de texto ficam dentro do collapsible "Detalhes da faixa". Usuário gera arte com título indesejado e queima cota.

**Mudanças em `src/pages/Creative.tsx`**
- Adicionar pequeno bloco "Texto na arte" **fora do collapsible**, logo acima do botão Gerar:
  - Se `noText` → badge "Sem texto na arte".
  - Senão → linha enxuta: "Texto na arte: «{trackName}» · {artistName}" (ou "Nenhum texto definido — adicione título/artista nos Detalhes da faixa").
  - Toggle inline rápido para "Sem texto" sem precisar abrir collapsible.
- Tornar o campo "Texto adicional" e o switch "noText" visualmente agrupados dentro do collapsible com separator claro.

---

## Onda 4 — Refinos de layout e prompt

**4a. Prompt mais limpo (edge function)**
- Refatorar `systemParts` em `generate-creative` para formato estruturado por blocos rotulados (`[FORMAT]`, `[STYLE]`, `[TEXT_RULES]`, `[REFERENCE]`) em inglês — modelos de imagem performam melhor com tags explícitas que com parágrafos longos.
- Sem mudança de comportamento, só estrutura.

**4b. Layout do preview**
- `src/components/creative/ImagePreview.tsx`: remover `max-w-md` rígido; usar `max-w-md` apenas para formatos quadrados/verticais e `max-w-2xl` para `aspect-video` (YouTube/banner). Em desktop usa melhor a largura.

**4c. Botão Gerar sticky no mobile**
- Em `src/pages/Creative.tsx` (aba Criar), envolver o botão Gerar em wrapper `sticky bottom-16 md:static` com fundo `bg-background/95 backdrop-blur` no mobile, para evitar scroll até o final em formulários longos.

---

## Detalhes técnicos

**Arquivos editados**
- `src/components/creative/StyleChips.tsx`
- `src/components/creative/QuickTemplates.tsx`
- `src/components/creative/ImagePreview.tsx`
- `src/pages/Creative.tsx`
- `src/hooks/useCreativeAssets.ts`
- `supabase/functions/generate-creative/index.ts`

**Compatibilidade**
- `referenceMode` é opcional no edge function (default `identity`) — chamadas antigas continuam funcionando.
- Mapa `STYLE_DESCRIPTIONS` faz fallback para o valor cru se o ID não estiver mapeado, então estilos legados em registros antigos não quebram.

**Sem migrações de banco**. Sem novos secrets. Edge function `generate-creative` será re-deployada automaticamente.

---

Aprove para eu executar todas as 4 ondas em sequência.