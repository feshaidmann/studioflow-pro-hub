# Plano — Geração de referências e Revisão editável

## Estado atual (já pronto)
- Edge function `generate-visual-direction` gera 6 imagens + paleta (4 hex + justificativa) + 3 opções de copy (A/B/C) em paralelo, com limite de 5 regenerações.
- `GenerationStep` exibe as 6 imagens em grid, permite selecionar/desselecionar, mostra copy options em modo leitura, regenerar e avançar.
- `ReviewStep` mostra imagens selecionadas (com remover), paleta como **swatches read-only** e textarea com `approved_copy` (edita a copy final, mas não as opções A/B/C).
- Hook `useVisualBriefing` já tem autosave debounced para perfil/copy/notas/imagens e já suporta `current_step`.

## O que falta (escopo desta tarefa)

### 1. Feedback visual durante geração
- `GenerationStep` ganha estado **skeleton** quando `regenerating` está ativo e ainda não chegaram novas imagens, ou quando estamos esperando a geração inicial (caso o passo seja forçado em `generation` sem imagens).
- 6 cards placeholder com shimmer (`animate-pulse`) usando os tokens semânticos (`bg-muted`).
- Mostra `Gerando referências de estilo…` em texto auxiliar.
- Se a edge function devolver menos de 6 imagens (falha parcial), mostrar chip discreto `Algumas falharam — tente regenerar`.

### 2. Paleta editável no `ReviewStep`
- Substituir os swatches read-only por uma lista editável:
  - Cada cor vira um chip com **swatch + input hex inline** (validação `#RRGGBB`, commit on blur/Enter, descarta inválido) + botão remover.
  - Botão `+ Adicionar cor` (até 8 cores; default `#CCCCCC` em modo edição imediato).
  - Campo `rationale` vira `<Textarea rows=2>` editável com placeholder.
- Persiste via hook em `generated_palette: { colors, rationale }`.

### 3. Opções de copy editáveis (A/B/C)
- Cada `copy_option` ganha um card com:
  - `label` editável (`<Input>`, max 24 chars).
  - `text` editável (`<Textarea rows=4>`).
  - Botão `Usar como copy aprovada` que copia o `text` atual para `approved_copy` (sem deixar de manter a edição da option).
- Mantém os 3 cards (A/B/C) sempre visíveis; sem adicionar/remover.
- Persiste via hook em `copy_options`.

### 4. Extensão do hook `useVisualBriefing`
- `updateReview` passa a aceitar também `generated_palette` e `copy_options`. O tipo `Patch` já cobre — só precisamos expor.
- Mantém o mesmo debounce (600ms) e o mesmo flush em troca de passo.

## Arquivos afetados
```
src/components/visual-direction/useVisualBriefing.ts   — amplia updateReview
src/components/visual-direction/GenerationStep.tsx     — skeleton + chip de falha parcial
src/components/visual-direction/ReviewStep.tsx         — paleta editável + copy options editáveis
src/pages/VisualDirection.tsx                          — passa `generating` ao GenerationStep para skeleton em regen
```

## Fora de escopo
- Regeneração por imagem individual (continua batch).
- Upload de imagem do próprio artista como referência.
- Mudanças na edge function (já produz tudo que precisamos).
- Versionamento da paleta/copy editadas (sobrescreve em lugar; histórico fica em versions de regen).

## Detalhes técnicos
- Validação hex client-side com regex `^#[0-9a-fA-F]{6}$`. Inputs inválidos não disparam autosave.
- Tudo segue o design system (light mode, `rounded-lg`, tokens semânticos). Swatches usam `style={{ backgroundColor: hex }}` (cor dinâmica de usuário, não pode virar token).
- Sem nova lib: usa `Input`, `Textarea`, `Button`, `Badge` já presentes.
