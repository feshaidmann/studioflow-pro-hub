# Pipeline de ingestão de análises musicais

## Contexto

Você vai enviar múltiplos CSVs no formato do `music_analysis_full.csv` (61 colunas, schema fixo: features tipo Spotify + métricas técnicas LUFS/DR + MFCC/chroma/spectral). Esses dados servirão para:

1. **Alimentar `music_dna_benchmarks`** (médias por gênero — hoje populadas só com seeds editoriais e poucas análises reais).
2. **Treinar/refinar a classificação de gênero** da edge function `music-dna-analyze` (ground truth para prompts e few-shot).

A coluna `file_path` (caminhos pessoais do seu HD) é descartada na ingestão. Volume previsto: vários lotes — precisa de fluxo reutilizável.

## Decisões de arquitetura

- **Nova tabela `music_reference_tracks`** (separada de `music_dna_analyses`, que é por usuário) — guarda o catálogo de referência curado, sem `user_id`, leitura pública, escrita só admin.
- **Reuso do `recalcular_benchmark_genero(genero)`** existente — mas adaptado para também considerar a nova tabela de referência (via UNION ALL no cálculo de médias).
- **Edge function `import-reference-tracks`** — recebe upload de CSV, valida schema, faz dedupe por `(band, filename)`, ignora `file_path`, insere em lote e dispara recálculo dos benchmarks dos gêneros afetados.
- **Tela admin `/admin/reference-tracks`** — protegida por `has_role('admin')`, com upload de CSV, preview das primeiras linhas, contadores por gênero/banda e botão "Recalcular benchmarks".
- **Few-shot para a IA**: nova RPC `get_genre_reference_examples(p_genero, p_limit)` retorna 3-5 faixas representativas (medianas) por gênero, consumida pelo `music-dna-analyze` para enriquecer o contexto do prompt.

## Etapas

### 1. Schema (migration)
- Tabela `music_reference_tracks` com todas as 60 colunas relevantes (descarta `file_path`):
  - Identificação: `id`, `band`, `filename`, `genre`, `analysis_date`, `source_batch` (text — nome do CSV importado), `created_at`.
  - Features Spotify-style: `tempo_bpm`, `tempo_confidence`, `key_index`, `key_name`, `mode`, `danceability`, `energy`, `loudness_rms_db`, `lufs_integrated`, `lufs_method`, `dynamic_range_db`, `speechiness`, `acousticness`, `instrumentalness`, `liveness`, `valence`, `duration_sec`.
  - Engenharia: `spectral_centroid`, `spectral_bandwidth`, `spectral_rolloff`, `spectral_flatness`, `zero_crossing_rate`.
  - Vetores como `numeric[]`: `spectral_contrast` (7), `mfcc` (13), `chroma_cens` (12).
  - Outros: `segments_count`, `beat_times` (jsonb).
  - **UNIQUE(band, filename)** para dedupe.
- RLS: `SELECT` público autenticado; `INSERT/UPDATE/DELETE` apenas `has_role('admin')`.
- Atualizar `recalcular_benchmark_genero` para fazer `UNION ALL` entre `music_dna_analyses` e `music_reference_tracks` no cálculo das médias e top_keys.
- Nova RPC `get_genre_reference_examples(p_genero text, p_limit int default 5)` — retorna faixas mais próximas da mediana do gênero (band, filename, tempo, lufs, danceability, energy, valence).

### 2. Edge function `import-reference-tracks`
- Aceita `multipart/form-data` com campo `file` (CSV).
- Auth obrigatório + verifica `has_role(uid, 'admin')`.
- Parse CSV (papaparse), valida headers obrigatórios, mapeia colunas, **descarta `file_path`**.
- Achata `spectral_contrast_1..7`, `mfcc_1..13`, `chroma_cens_1..12` em arrays numéricos.
- `INSERT ... ON CONFLICT (band, filename) DO UPDATE` (idempotente — reimportar mesmo CSV não duplica).
- Após insert, agrupa gêneros únicos do lote e chama `recalcular_benchmark_genero` para cada.
- Retorna `{ inserted, updated, skipped, genres_updated, errors[] }`.
- Loga em `function_logs` e `ai_invocations` (function_name).

### 3. Tela admin `/admin/reference-tracks`
- Acesso restrito via `useAdminRole`. Redireciona não-admin.
- **Upload zone** (drag & drop CSV, max 20MB).
- **Preview**: parse client-side das 5 primeiras linhas + contadores (linhas, gêneros únicos, bandas únicas).
- **Botão "Importar"**: chama edge function, mostra progresso e resultado (inserted/updated/skipped + erros por linha).
- **Tabela de batches importados**: agrupa por `source_batch`, mostra data, total faixas, gêneros.
- **Card "Cobertura de benchmarks"**: lista gêneros em `music_reference_tracks` com nº faixas reais vs nº seed do `music_dna_benchmarks`, e botão "Recalcular tudo".

### 4. Integração na IA (`music-dna-analyze`)
- Antes de montar o prompt, se houver `genero` informado, busca `get_genre_reference_examples(genero, 5)`.
- Injeta no system/user prompt como bloco "Faixas de referência reais do gênero" com features médias — dá ground truth e melhora classificação.
- Se gênero estiver ambíguo, busca top-3 gêneros mais próximos em `music_reference_tracks` por distância euclidiana (BPM + LUFS + danceability + energy + valence) e oferece como sugestões.

### 5. Link no menu admin
- Adicionar "Faixas de Referência" na sidebar admin (só visível para `has_role('admin')`).

## Detalhes técnicos

**Mapeamento CSV → DB** (descartando `file_path`):
```text
CSV column          → DB column                  (tipo)
genre               → genre                       text
band                → band                        text
filename            → filename                    text
duration_sec        → duration_sec                numeric
tempo_bpm           → tempo_bpm                   numeric
key_index           → key_index                   int
key_name            → key_name                    text
mode                → mode                        text
danceability..valence → mesmas colunas            numeric
spectral_contrast_1..7 → spectral_contrast        numeric[7]
mfcc_1..13           → mfcc                        numeric[13]
chroma_cens_1..12    → chroma_cens                 numeric[12]
beat_times           → beat_times                  jsonb
analysis_date        → analysis_date               timestamptz
file_path            → DESCARTADO
```

**Dedup**: `ON CONFLICT (band, filename) DO UPDATE` — reimportar mesmo CSV sobrescreve dados (útil para correções) sem duplicar linhas. `source_batch` armazena o último batch que tocou a linha.

**Recalculo de benchmarks**: a função `recalcular_benchmark_genero` passa a usar:
```sql
WITH all_tracks AS (
  SELECT genre, danceability, energy, ... FROM music_dna_analyses WHERE genre = p_genero
  UNION ALL
  SELECT genre, danceability, energy, ... FROM music_reference_tracks WHERE genre = p_genero
)
SELECT AVG(...) FROM all_tracks;
```

**Validação de schema** na edge function: header esperado é fixo; se faltar coluna obrigatória, retorna 400 com lista de campos ausentes.

**Performance**: insert em batches de 500 linhas via `.insert([...])`. Para CSVs grandes (>10k linhas), processar em chunks.

## Arquivos afetados

- `supabase/migrations/<ts>_music_reference_tracks.sql` (novo)
- `supabase/functions/import-reference-tracks/index.ts` (novo)
- `src/pages/admin/ReferenceTracks.tsx` (novo)
- `src/hooks/useReferenceTracksImport.ts` (novo)
- `src/App.tsx` (rota `/admin/reference-tracks`)
- `src/components/AppLayout.tsx` (item de menu admin)
- `supabase/functions/music-dna-analyze/index.ts` (injetar exemplos de referência no prompt)

## Fora de escopo (rodadas futuras)

- UI pública para o artista navegar no catálogo de referências.
- Treinamento de modelo próprio (clustering por MFCC/chroma) — por ora só usamos médias e exemplos no prompt.
- Importação automática direta da sua máquina (manter upload manual via UI admin).

## Como você usará

1. Eu implemento tudo acima.
2. Você acessa `/admin/reference-tracks`, faz upload do `music_analysis_full.csv` — popula 107 faixas em 5 gêneros.
3. Próximos lotes: mesmo fluxo, basta arrastar o CSV.
4. A IA do DNA Musical passa automaticamente a usar essas faixas como referência ao classificar gêneros.