

# Desdobramentos de Arte — Geração em Lote por Canal

## Resumo
Adicionar um fluxo "Desdobrar" que, a partir de uma arte-base (ex: capa de álbum), gera automaticamente versões adaptadas para múltiplos canais (Instagram Post, Story, YouTube, etc.) com conteúdo contextual por canal. O prompt da edge function incluirá instrução explícita de preservação facial.

---

## Mudanças

### 1. Instrução de preservação facial na Edge Function
**Arquivo:** `supabase/functions/generate-creative/index.ts`
- Quando `editImageUrl` estiver presente, injetar no prompt do sistema: *"IMPORTANT: If there are human faces in the reference image, preserve them exactly — do not alter, distort or replace any facial features."*
- Novo campo opcional no body: `channelContext` (string) — texto descritivo do canal (ex: "Story vertical do Instagram com texto de divulgação do single")

### 2. Novo componente `DeriveBatchDialog`
**Novo:** `src/components/creative/DeriveBatchDialog.tsx`
- Dialog que recebe a imagem-base (URL ou base64)
- Mostra checkboxes dos formatos disponíveis (Post Instagram, Story, YouTube, etc.)
- Campo de prompt contextual por canal com sugestões pré-preenchidas:
  - Story: "Adicionar 'Ouça agora' e nome do artista"
  - YouTube: "Banner com título do álbum centralizado"
  - Twitter: "Post de divulgação com data de lançamento"
- Botão "Gerar todos" que dispara N chamadas em sequência (uma por formato selecionado)
- Progress bar mostrando "Gerando 2/5..."
- Ao finalizar, exibe grid com todas as variações geradas
- Botão "Baixar todos" (zip via client-side) e download individual

### 3. Integrar na página Creative
**Arquivo:** `src/pages/Creative.tsx`
- No `ImagePreview`, adicionar botão "Desdobrar para canais" (ícone `Layers`) ao lado de "Editar com IA"
- Na galeria, adicionar mesmo botão no hover de cada asset
- Ao clicar, abre o `DeriveBatchDialog` com a imagem selecionada

### 4. Integrar no hook
**Arquivo:** `src/hooks/useCreativeAssets.ts`
- Nova função `generateBatch(params[])` que chama `generate()` sequencialmente com delay de 2s entre chamadas para evitar rate limit
- Retorna array de resultados

---

## Fluxo do usuário

```text
1. Artista faz upload da capa do álbum como referência (ou seleciona da galeria)
2. Clica em "Desdobrar para canais"
3. Seleciona: Story, Post Instagram, Banner YouTube
4. Cada formato já vem com sugestão de texto contextual
5. Clica "Gerar todos"
6. IA gera cada variação preservando rostos e adaptando composição
7. Artista visualiza grid com os 3 resultados
8. Baixa individualmente ou todos de uma vez
```

## Proteção facial
A instrução de preservação é injetada automaticamente no backend sempre que houver imagem de referência — o artista não precisa lembrar de pedir isso manualmente.

## Sem migrações de banco
Usa a mesma tabela `creative_assets` e bucket `creative-assets`.

