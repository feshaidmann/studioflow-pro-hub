## Objetivo

Aumentar a precisão do match do DNA Musical incorporando features do `music_reference_tracks` que hoje são ignoradas, e tornar visível ao usuário **quais faixas reais do catálogo** mais se parecem com a dele.

Sem mudanças no front de extração de áudio (Fase 3 com MFCC/chroma fica para depois).

---

## Fase 1 — Distância escalar enriquecida (puro SQL)

**Migração nova:** estender `find_nearest_reference_tracks` adicionando 6 features escalares e bônus de tonalidade. Mantém compatibilidade (todos os novos parâmetros opcionais com default `NULL`).

Novos parâmetros:
- `p_speechiness numeric` — peso ×1.0
- `p_liveness numeric` — peso ×0.8
- `p_spectral_bandwidth numeric` — peso /1500
- `p_spectral_rolloff numeric` — peso /3000
- `p_spectral_flatness numeric` — peso ×5.0
- `p_zero_crossing_rate numeric` — peso ×4.0
- `p_key_name text`, `p_mode text` — bônus −0.3 se ambos batem, −0.15 se só `key_name` bate

Termos `COALESCE(..., 0)` garantem que features ausentes simplesmente não pesam (não viram NULL na soma).

Retorno ganha colunas: `speechiness`, `liveness`, `spectral_flatness`, `zero_crossing_rate` (para o front exibir).

**Edge function `music-dna-analyze`:** passar os novos parâmetros a partir de `payload.track_features` (já temos `spectral_centroid`; os demais ficam `null` por enquanto até a Fase 3 extrair de fato — o algoritmo continua funcionando porque os termos viram 0).

**Benchmark de gênero:** estender `music_dna_benchmarks` com:
- `avg_spectral_centroid`, `avg_spectral_flatness`, `avg_zero_crossing_rate`, `avg_dynamic_range_db`

E atualizar `recalcular_benchmark_genero` para popular esses campos a partir de `music_reference_tracks` (a tabela `music_dna_analyses` não tem essas colunas, então só entra `music_reference_tracks` para esses 4 novos avg).

## Fase 2 — Mostrar os vizinhos no resultado

Hoje `nearestNeighbors` é injetado só no prompt da IA. Vamos expor no UI.

**Edge function:** quando `action !== "save_features"` e tivermos `nearestNeighbors`, devolver também no JSON da resposta:
```json
{ "content": "...", "neighbors": [...] }
```

**`useMusicDNA.ts`:**
- `callMusicDNAAnalyze` passa a retornar `{ content, neighbors }`.
- `DiagnosisResult` ganha `catalogNeighbors?: CatalogNeighbor[]` com tipo: `{ band, filename, genre, similarity_score, tempo_bpm, lufs_integrated, key_name, mode, energy, danceability, valence, dynamic_range_db, spectral_centroid }`.
- Preenche `catalogNeighbors` no objeto retornado.

**`MusicDNAAnalyzer.tsx`:** novo card "Faixas mais próximas no catálogo" dentro do resultado, perto de `referencias_proximas`. Para cada vizinho:
- Linha: `Banda — Filename` + badge `similaridade XX%` (= `similarity_score * 100`).
- Sub-linha com 3 deltas relevantes calculados contra `result.realAnalysis`:
  - `ΔBPM`, `ΔLUFS`, `Δenergy` (formatados pt-BR, com sinal).
- Visual macOS: card glassmorphism, lista compacta, `border-b border-border` entre itens (mesmo padrão de `referencias_proximas`).

Incluir tooltip explicando que esses vizinhos vêm do catálogo de referência interno (CSV importado) e que a IA usou essa lista para fundamentar `referencias_proximas`.

**Markdown / PDF de exportação:** `buildAnalysisMarkdown` e `downloadAnalysisReport` ganham seção "Vizinhos no catálogo" com a mesma lista (sem deltas).

## Detalhes técnicos

### Estrutura do cálculo da nova `find_nearest_reference_tracks`

```text
distance =
    |Δtempo|/40              + |ΔLUFS|/8
  + |Δenergy|×1.2            + |Δdanceability|×1.0
  + |Δvalence|×0.8           + |Δacousticness|×0.8
  + |Δinstrumentalness|×0.6  + |Δdynamic_range|/10
  + |Δspectral_centroid|/2000
  + |Δspeechiness|×1.0       + |Δliveness|×0.8           [NOVOS]
  + |Δspectral_bandwidth|/1500
  + |Δspectral_rolloff|/3000
  + |Δspectral_flatness|×5.0
  + |Δzero_crossing_rate|×4.0
  + bônus de gênero (existente)
  + bônus de key/mode                                    [NOVO]

similarity_score = 1 / (1 + distance)
```

### Tipos novos em `useMusicDNA.ts`

```ts
export interface CatalogNeighbor {
  band: string; filename: string; genre: string;
  similarity_score: number;
  tempo_bpm: number | null;
  lufs_integrated: number | null;
  key_name: string | null; mode: string | null;
  energy: number | null; danceability: number | null; valence: number | null;
  dynamic_range_db: number | null; spectral_centroid: number | null;
}
```

### Compatibilidade

- A migração **substitui** `find_nearest_reference_tracks` via `CREATE OR REPLACE FUNCTION` com a mesma assinatura base + novos parâmetros opcionais. A chamada atual da edge function continua válida porque PG aceita parâmetros nomeados.
- `music_dna_benchmarks` ganha colunas nullable, sem default destrutivo.
- Front continua funcionando se `neighbors` vier vazio (renderiza só se `catalogNeighbors?.length`).

## Fora do escopo desta etapa

- Extração real de MFCC / chroma / spectral_contrast no front (Fase 3, exige integrar `meyda` em `analyzeAudioFull`).
- Distância tímbrica vetorial via `array_l2_distance` (Fase 3).
- pgvector / HNSW (Fase 4, só se catálogo crescer >5k faixas).
- Tabela `harmonic_neighbors` para tons relacionados (extensão futura do bônus key/mode).

## Arquivos afetados

- **Migração SQL** (nova): redefine `find_nearest_reference_tracks`, estende `music_dna_benchmarks`, redefine `recalcular_benchmark_genero`.
- `supabase/functions/music-dna-analyze/index.ts`: monta novos parâmetros da RPC; devolve `neighbors` no JSON.
- `src/hooks/useMusicDNA.ts`: tipo `CatalogNeighbor`, propaga `catalogNeighbors` no `DiagnosisResult`.
- `src/components/music-dna/MusicDNAAnalyzer.tsx`: novo card de vizinhos + entradas no markdown e no PDF.

## Teste manual após deploy

1. Subir uma demo no DNA Musical com gênero válido (ex.: "Sertanejo").
2. Verificar no resultado:
   - Card "Faixas mais próximas no catálogo" aparece com 3–6 itens, similaridades entre 0–100%.
   - `referencias_proximas` (gerado pela IA) cita band+filename que aparecem na lista de vizinhos.
3. Trocar o gênero e refazer — vizinhos mudam priorizando o novo gênero.
4. Exportar PDF e markdown — seção "Vizinhos no catálogo" presente.
