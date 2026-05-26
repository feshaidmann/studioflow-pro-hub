# Unificar banco de comparação do DNA Musical

Hoje existem **duas fontes paralelas** alimentando a comparação por gênero:

1. `music_reference_tracks` — catálogo real (~17k faixas) com features calculadas via librosa/pyloudnorm.
2. `music_dna_benchmarks` — tabela materializada com mistura de seeds manuais antigos (round numbers, 2026-04) e agregações parciais (2026-05). Causa números desatualizados como "Hip-Hop · 115 faixas".

A solução é eliminar a segunda fonte e derivar tudo em tempo real do catálogo, com normalização canônica de gênero.

## O que muda

### 1. Backend (uma migration)

- **`genre_canonical(text)`** — função `IMMUTABLE` que normaliza casing/acentos e mapeia sinônimos (`Hip Hop` / `Hip hop` / `Rap` → `Hip-Hop`; `Funk Carioca` / `Brazilian Funk` → `Funk Carioca`; etc.).
- **DROP** da tabela `music_dna_benchmarks` (com backup automático em `music_dna_benchmarks_legacy_backup` por segurança).
- **CREATE VIEW `music_dna_benchmarks`** com as mesmas colunas que o front consome hoje, agregando direto de `music_reference_tracks` onde `quarantined = false`, agrupando por `genre_canonical(genre)`, e filtrando `total_faixas >= 5`. Inclui também `total_artistas` (count distinct de `band`) para sinalizar representatividade.
- **`get_benchmark_for_genre(p_genero text)`** — RPC `SECURITY INVOKER` que (a) tenta match exato pelo gênero canônico, (b) cai pra família/gênero pai (Trap→Hip-Hop, Piseiro→Forró, etc.) usando o mapeamento existente em `src/lib/genreFamilies.ts` espelhado em SQL, (c) retorna `NULL` quando não há amostra suficiente.
- Remover/aposentar `recalcular_benchmark_genero` (não tem mais sentido com a VIEW).

### 2. Front-end

- **`src/hooks/useMusicDnaBenchmarks.ts`** — simplificar: ler só a VIEW, remover o fallback que recalculava a partir de `music_dna_analyses` (essa fonte misturava dados subjetivos do usuário com benchmarks). Manter a função `findBenchmarkForGenre`, mas usar a RPC quando o gênero não está direto na VIEW.
- **`src/hooks/useGenreProfiles.ts`** — continuar lendo da VIEW (já compatível), mas usar `total_faixas >= 5` em vez de `>= 20`, já que a VIEW garante qualidade mínima.
- **`src/hooks/useMusicDNA.ts`** e **`supabase/functions/music-dna-analyze/index.ts`** — trocar `SELECT * FROM music_dna_benchmarks WHERE genero = ...` por `rpc('get_benchmark_for_genre', { p_genero })`, ganhando o fallback automático.
- **`src/components/music-dna/MusicDNAAnalyzer.tsx`** — atualizar o rótulo da fonte: em vez de "Banco público" mostrar "Catálogo de referência · N faixas · M artistas" para deixar claro o que está por trás.
- **`src/pages/admin/ReferenceTracks.tsx`** — remover qualquer UI residual de "recalcular benchmark" (agora é automático).

### 3. Limpeza

- Remover seeds antigos junto com o DROP da tabela.
- Atualizar `docs/04-banco-de-dados.md`: trocar a linha de `music_dna_benchmarks` para indicar que é uma VIEW derivada.

## Detalhes técnicos

### Estrutura da VIEW

```sql
CREATE OR REPLACE VIEW public.music_dna_benchmarks AS
SELECT
  genre_canonical(genre)         AS genero,
  COUNT(*)::int                  AS total_faixas,
  COUNT(DISTINCT band)::int      AS total_artistas,
  AVG(danceability)              AS avg_danceability,
  AVG(energy)                    AS avg_energy,
  AVG(loudness_rms_db)           AS avg_loudness_db,
  AVG(speechiness)               AS avg_speechiness,
  AVG(acousticness)              AS avg_acousticness,
  AVG(instrumentalness)          AS avg_instrumentalness,
  AVG(liveness)                  AS avg_liveness,
  AVG(valence)                   AS avg_valence,
  AVG(tempo_bpm)                 AS avg_tempo_bpm,
  AVG(lufs_integrated)           AS avg_lufs,
  AVG(dynamic_range_db)          AS avg_dynamic_range_db,
  AVG(spectral_centroid)         AS avg_spectral_centroid,
  AVG(spectral_flatness)         AS avg_spectral_flatness,
  AVG(zero_crossing_rate)        AS avg_zero_crossing_rate,
  NULL::jsonb                    AS top_keys,  -- calculado on-demand se preciso
  NOW()                          AS atualizado_em
FROM public.music_reference_tracks
WHERE quarantined = false AND genre <> ''
GROUP BY genre_canonical(genre)
HAVING COUNT(*) >= 5;

GRANT SELECT ON public.music_dna_benchmarks TO authenticated, anon;
```

### Performance

- Índice funcional `CREATE INDEX ON music_reference_tracks (genre_canonical(genre)) WHERE quarantined=false` torna o GROUP BY barato (~30–50 ms para 17k linhas).
- React Query mantém `staleTime` de 30 min, então o front quase nunca re-consulta.
- Caso fique lento no futuro, basta trocar `VIEW` por `MATERIALIZED VIEW` + trigger de refresh — interface fica intacta.

### Arquivos afetados

- **Novo:** uma migration (drop + função + view + índice + RPC).
- **Editados:** `useMusicDnaBenchmarks.ts`, `useGenreProfiles.ts`, `useMusicDNA.ts`, `music-dna-analyze/index.ts`, `MusicDNAAnalyzer.tsx`, `ReferenceTracks.tsx`, `docs/04-banco-de-dados.md`.

## Resultado esperado

- Uma única fonte de verdade — qualquer ajuste de catálogo se reflete imediatamente.
- Fim dos números fantasmas tipo "Hip-Hop · 115 faixas".
- O painel passa a expor "M artistas" junto do "N faixas", deixando explícita a representatividade.
- Compatibilidade preservada: como a VIEW mantém o nome `music_dna_benchmarks`, código não migrado ainda funciona durante a transição.
