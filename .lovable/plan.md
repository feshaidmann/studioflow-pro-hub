

# Integração DNA Musical → Criativo

## Resumo
Conectar o resultado do DNA Musical ao módulo Criativo, adicionando botão de ação no resultado da análise, consumo do parâmetro `dna` na página Criativo, montagem automática de prompt visual, e modo texto na edge function para gerar legendas para redes sociais.

## Arquivos a modificar

### 1. `src/components/music-dna/MusicDNAAnalyzer.tsx`
- Importar `useNavigate` do react-router-dom e `Palette` do lucide-react
- No `ResultView`, adicionar botão "🎨 Criar arte com este DNA" no footer (linha ~768, junto aos botões existentes)
- Lógica: se `isSaved` e temos um `savedAnalysisId`, navegar para `/creative?dna={id}`. Caso contrário, navegar para `/creative?dna=session` (os dados já estão no sessionStorage via `cacheLastAnalysis`)
- O `ResultView` precisa receber uma nova prop opcional `savedAnalysisId?: string` para saber qual ID usar
- No componente pai (`MusicDNAAnalyzer`), rastrear o ID da análise salva via state e passá-lo ao `ResultView`. Quando `handleLoadSaved` é chamado, guardar `saved.id`. Quando `handleSave` tem sucesso, buscar o ID da análise recém-salva

### 2. `src/pages/Creative.tsx`
- Importar `supabase`, `getCachedAnalysis` de `useSavedAnalyses`, e `DiagnosisResult` de `useMusicDNA`
- Adicionar states: `dnaCopyText` (string), `dnaLoading` (boolean), `dnaSource` (DiagnosisResult | null)
- Ler `searchParams.get("dna")` via `useEffect`:
  - Se `dna=session`: ler de `getCachedAnalysis()`, extrair diagnosis, chamar `buildDNAPrompt`
  - Se `dna={uuid}`: fetch de `music_dna_analyses` pelo id, extrair diagnosis, chamar `buildDNAPrompt`
- Nova função `buildDNAPrompt(diagnosis, trackName)` que monta prompt em pt-BR:
  - `genero_classificado` → "Capa artística para single de {gênero}."
  - `identidade.mood_principal` → "Atmosfera: {mood}."
  - `identidade.territorio_sonoro` → "Cenário: {território}."
  - `identidade.tags` → "Elementos visuais: {tags}."
  - `detectedInstruments` → "Inclua {instrumentos} na composição."
  - `track_name` → "Título da faixa: '{name}'."
- Pré-preencher `prompt` e `selectedFormat` (spotify_cover) via o `useEffect`
- Após gerar imagem quando `dnaSource` está ativo, chamar `generateText` para obter copy e setar `dnaCopyText`
- Exibir card copiável com a legenda sugerida abaixo do `ImagePreview` quando `dnaCopyText` tem conteúdo
- Botão de copiar texto usa `navigator.clipboard.writeText`

### 3. `src/hooks/useCreativeAssets.ts`
- Adicionar função `generateText` que chama `supabase.functions.invoke("generate-creative", { body: { mode: "text", prompt, ... } })` e retorna `{ text: string }`
- Retornar `generateText` no hook

### 4. `supabase/functions/generate-creative/index.ts`
- Extrair `mode` do body (default: `"image"`)
- Quando `mode === "text"`:
  - Validar apenas `prompt` (não exigir format/width/height)
  - Usar modelo `google/gemini-3-flash-preview` (texto)
  - System prompt focado em gerar legenda/copy para Instagram/Spotify em pt-BR contextualizada ao DNA musical
  - Retornar `{ text: string }` sem upload de imagem
  - Registrar invocação em `ai_invocations` (quota)
- Quando `mode` ausente ou `"image"`: manter comportamento atual inalterado

### 5. Sem migrações de banco
Usa tabelas existentes (`music_dna_analyses`, `creative_assets`, `ai_invocations`).

## Detalhes técnicos

**Exemplo de prompt gerado por `buildDNAPrompt`:**
```
Capa artística para single de MPB Contemporânea. Atmosfera: melancólica e introspectiva.
Cenário: noite urbana com elementos orgânicos. Elementos visuais: acústico, intimista, urbano.
Inclua violão e piano na composição. Título da faixa: 'Yellow and Green'.
```

**Fluxo de dados:** sessionStorage ou query ao banco → `buildDNAPrompt` → pré-preenche textarea → artista ajusta → gera imagem → chamada automática de texto → exibe card de legenda copiável.

