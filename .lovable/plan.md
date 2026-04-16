

# Separar instrução de composição vs. texto a renderizar

## Problema
Hoje no `/criativo`:
- O **prompt** descreve a estética → mas a IA pode renderizar palavras dele como texto na imagem
- `trackName` / `artistName` / `releaseDate` → sempre são exibidos como texto na arte (instrução fixa no system prompt)
- Não há campo para **texto extra opcional** (tagline, "Vol. 2", "feat. X", frase do release)

Resultado: arte vem com palavras inesperadas; falta espaço para textos legítimos.

## Mudanças

### 1. System prompt da edge function (`generate-creative`)
Adicionar instrução explícita logo no topo:
> "The user's creative description is **composition guidance only** — do NOT render any of its words as visible text in the image. Only render text from the dedicated text fields below (track title, artist name, release date, additional text)."

E mudar o tom dos campos atuais de "Display X prominently" para "**If appropriate for this format**, you may include X as readable text" — dando à IA discrição (uma capa minimalista pode não querer texto algum).

### 2. Novo campo opcional "Texto adicional na arte"
Em `Creative.tsx`, dentro do `Collapsible` "Detalhes do release" (já existente), adicionar:
- **Input** `additionalText` (até 60 chars) — ex.: "Vol. 2", "feat. Maria", "Lançamento 2026", "Edição limitada"
- Helper: *"Texto extra que aparecerá na arte (opcional). Ex.: 'feat. Maria', 'EP Vol. 2'."*

### 3. Toggle "Sem texto na arte"
Switch novo no mesmo bloco: **"Arte sem nenhum texto"** (default off).
- Quando **on**: edge function recebe `noText: true` e o system prompt instrui "Do NOT render ANY text, letters, numbers, words or typography in the image. Pure visual composition only."
- Cobre o caso "quero só a estética, sem nome nenhum"

### 4. Edge function — novos parâmetros
- `additionalText?: string` → "If provided and appropriate, include this short text in the artwork: '...'"
- `noText?: boolean` → suprime todas as instruções de texto, sobrepondo as outras

### 5. Hook `useCreativeAssets.ts`
Propagar os 2 campos novos no `generate({...})`.

## Arquivos
- **Modificar**: `supabase/functions/generate-creative/index.ts` (system prompt + 2 params)
- **Modificar**: `src/pages/Creative.tsx` (campo + toggle dentro do collapsible "Detalhes do release", passar no `handleGenerate`)
- **Modificar**: `src/hooks/useCreativeAssets.ts` (tipagem do `generate`)

## Sem migrações
Mudança puramente de prompt + UI.

## Fora do escopo
Não vou separar a Quick Template (`buildDNAPrompt`) — ela já gera composição pura sem nomes; o nome chega só via campo `trackName`.

