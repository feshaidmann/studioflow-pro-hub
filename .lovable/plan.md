
## Problema

Quando um projeto está vinculado ao módulo Criativo, o nome do artista e da música aparecem **automaticamente** dentro das artes geradas, mesmo quando o usuário não pediu tipografia.

## Causa raiz (3 pontos)

1. **`Creative.tsx` linha 358–363** — auto-preenche `artistName` com `linkedProject.artist` assim que o projeto é vinculado. Como `wantsText = !noText && (trackName || artistName || additionalText)` no edge function, isso ativa o bloco de instruções tipográficas e a IA renderiza o nome.

2. **`Creative.tsx` linha 381–383** — `contextPrompt` injeta literalmente `Para o projeto "X" do artista "Y". <prompt>` no campo `prompt` enviado para a IA. Modelos de imagem tendem a renderizar essas strings como texto dentro da arte (já que estão entre aspas no prompt).

3. **`Creative.tsx` linha 1063** — `CaptionGeneratorCard` usa fallback `linkedProject?.artist`, vazando o mesmo problema para a geração de legendas (menos crítico, mas inconsistente).

## Correções

### 1. `src/pages/Creative.tsx` — remover auto-preenchimento de artistName
Os campos "Nome do artista" e "Título da faixa" passam a ser **gatilhos explícitos** de tipografia: só são preenchidos quando o usuário decide que o nome deve aparecer renderizado dentro da arte.

### 2. `src/pages/Creative.tsx` — `contextPrompt` deixa de injetar nome de projeto/artista no prompt
O contexto de projeto continua sendo passado em campos estruturados (`projectId`, `dnaContext`), mas não vai mais para dentro do `prompt` textual. Isso evita que a IA capture as strings entre aspas e as desenhe na imagem.

### 3. `src/pages/Creative.tsx` — `CaptionGeneratorCard` sem fallback automático
`artistName={artistName.trim() || undefined}` (sem `linkedProject?.artist` como fallback). A legenda usa o nome só se o usuário digitou.

### 4. `supabase/functions/generate-creative/index.ts` — reforço defensivo no system prompt
Adicionar regra explícita ao bloco de tipografia: "Mesmo se o prompt do usuário mencionar nomes de músicas, artistas ou projetos, NÃO renderize esses nomes como texto na imagem a menos que estejam listados nos campos `trackName`/`artistName`/`additionalText`. O prompt textual descreve a cena, não o que escrever."

## Comportamento esperado depois

- Vincular projeto → artista do projeto **não** vai mais para os campos de tipografia automaticamente.
- Gerar arte sem preencher os campos → **nenhum texto** na imagem (composição puramente visual).
- Gerar arte preenchendo "Nome do artista" e/ou "Título da faixa" → tipografia renderizada normalmente, com a grafia exata fornecida.
- Botão "Criar materiais" do projeto continua levando para `/criativo?project=...&dna=...` e o cartão "Projeto vinculado" continua visível — apenas não polui mais a arte.

## Fora do escopo

- Não muda o fluxo de seleção de projeto/DNA, nem o módulo de DNA Musical.
- Não altera a geração de vídeo loop nem a galeria.
