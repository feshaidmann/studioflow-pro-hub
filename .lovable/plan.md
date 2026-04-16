

# Campos "Nome da Música" e "Artista" + Data de Lançamento no Criativo

## O que muda

Adicionar campos dedicados acima do prompt para **Nome da Música** e **Artista**, que serão injetados automaticamente no prompt enviado à IA. Quando o formato selecionado for uma capa de lançamento (Spotify, Deezer, Tidal), exibir um campo adicional de **Data de Lançamento**.

## Formatos que ativam o campo de data

`spotify_cover`, `deezer_cover`, `tidal_cover` — são formatos de capa de single/álbum associados a lançamentos.

## Mudanças em `src/pages/Creative.tsx`

1. **Novos estados:**
   - `trackName` (string) — nome da música
   - `artistName` (string) — nome do artista
   - `releaseDate` (string) — data no formato `dd/MM/yyyy`, exibido apenas para formatos de lançamento

2. **Novos campos no formulário (antes do prompt):**
   - Input "Nome da música" — preenchido automaticamente pelo DNA se disponível
   - Input "Artista" — preenchido via `linkedProject?.artist` quando um projeto é selecionado
   - DatePickerField "Data de lançamento" — visível apenas quando `selectedFormat.id` é `spotify_cover`, `deezer_cover` ou `tidal_cover`

3. **Integração no prompt enviado à IA (`handleGenerate`):**
   - Prefixar o prompt com: `Nome da música: "${trackName}". Artista: "${artistName}".`
   - Se `releaseDate` preenchido, adicionar: `Data de lançamento: ${releaseDate}.`
   - Essas informações vão no `contextPrompt` enviado à edge function, para que o modelo as use na composição visual

4. **Auto-preenchimento:**
   - Quando DNA source carrega: `trackName` = nome da faixa do DNA
   - Quando projeto é selecionado: `artistName` = `linkedProject.artist`
   - O `buildDNAPrompt` continua gerando o prompt descritivo; os campos nome/artista ficam separados

5. **Edge function `generate-creative`:**
   - Receber `trackName`, `artistName`, `releaseDate` opcionais no body
   - Adicionar ao system prompt: `Song title: "${trackName}". Artist: "${artistName}".` para que apareçam na arte
   - Se `releaseDate` presente: `Release date: ${releaseDate}. Include this date in the artwork.`

## Arquivos modificados
- `src/pages/Creative.tsx` — novos campos + lógica de auto-preenchimento
- `supabase/functions/generate-creative/index.ts` — receber e usar trackName/artistName/releaseDate no system prompt

## Sem migrações de banco
Campos são passados diretamente à IA, não precisam de persistência adicional.

