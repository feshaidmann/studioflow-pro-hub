
# Music DNA — features acionáveis para indie

Escopo aprovado: só features acionáveis (curva espectral vs alvo, recomendações DIY, playlist match derivado do banco, estrutura), aproximações client-side para o que não roda, + PDF e projeção 2D. **Mantém** pipeline atual de extração (Web Audio + `useMusicDNA` + edge `music-dna-analyze`) e a tabela `music_reference_tracks` que já tem 3.6k faixas.

## O que entra

1. **Curva espectral vs alvo do gênero** (recomendação acionável de EQ)
2. **Timeline de seções** + comparação de tempo até o 1º refrão
3. **Sequência de acordes aproximada** (croma → Roman numerals) com leitura "tipo de progressão"
4. **Playlist Match** — clusters derivados de `music_reference_tracks`
5. **Recomendações de mix/master DIY** geradas a partir das métricas (não da LLM)
6. **Projeção 2D do banco** (PCA pré-computado, offline) com ponto do artista plotado
7. **Export PDF do dashboard** (client-side)
8. **Reorganização do /music-dna em abas**: Resumo · Técnico · Comparação · Recomendações

Fora desta entrega: A/B player com faixa vizinha (URLs públicas não existem), evolução temporal entre uploads, OAuth provider novo, qualquer backend Python.

---

## 1. Edge function nova `music-dna-spectral-target` (Deno)
Recebe `{ genre }` e devolve, por bandas (sub 20–60, bass 60–250, low-mid 250–500, mid 500–2k, hi-mid 2k–5k, presence 5k–10k, air 10k–20k), a **curva alvo** = média ponderada de `spectral_centroid/bandwidth/rolloff/flatness` das refs do gênero (cache 24h em memória da função). Saída inclui `lufs_target_p50` e `dr_target_p50`. Sem LLM, só SQL agregado.

Frontend: `SpectralTargetCurve.tsx` desenha 2 linhas (artista vs alvo) usando Recharts e marca bandas com desvio > X dB como "EQ sugerido: corte 2 dB em 2–5 kHz com Q baixo (TDR Nova / EQ nativo da DAW)".

## 2. Timeline de seções
A função `detectSections` já existe em `audioAnalysis.ts`. Novo componente `SectionsTimeline.tsx` (barras horizontais por seção, com label e duração). Mostra:
- "Primeiro refrão começa em **45s** — mediana do banco no gênero: **30s** → considere encurtar a intro".
- Cálculo do "tempo até refrão mediano" via edge function `music-dna-genre-stats` (uma nova RPC `get_genre_section_stats(p_genre)` baseada em `segments_count` e duração — aproximação grosseira; deixar nota técnica).

## 3. Acordes aproximados
Adicionar `extractChordSequence(audioBuffer)` em `audioAnalysis.ts`: janela 1s, croma 12-bin, casa com 24 templates (maior/menor) por correlação. Pós-processa em Roman numerals via tonalidade detectada. UI em `ChordSequenceCard.tsx` mostra os primeiros 16 acordes + classificação ("vi–IV–I–V — progressão pop comum"). Limitação documentada via tooltip.

## 4. Playlist Match — clusters do banco
Job offline (script Python local executado uma vez via `code--exec` e migration de seed) que:
- Pega `music_reference_tracks` ativas, normaliza 8 features (lufs, dr, centroid, bpm, energy, dance, valence, acousticness).
- Roda **K-Means k=8** → cada cluster vira uma "playlist" com label heurístico (`Chill Acoustic`, `Workout`, `Late Night`, `Indie BR Quiet`, etc., nomeados manualmente após inspeção dos centroides).
- Salva centroides + label na nova tabela `playlist_profiles` (id, name, slug, vector jsonb, sample_tracks jsonb, created_at). RLS público leitura, admin escrita.

Runtime: hook novo `usePlaylistMatch(features)` → calcula distância euclidiana normalizada do vetor do artista a cada centroide, devolve top 5 com `compat_pct = 1 - d/dmax`. Componente `PlaylistMatchCard.tsx` lista + para a playlist alvo escolhida pelo usuário, mostra "Para chegar a esse perfil: BPM 128 → 110, acousticness 0.32 → 0.70" (delta por eixo, só dos eixos com diff > 1 desvio).

## 5. Recomendações DIY determinísticas
Novo `src/lib/mixRecommendations.ts` puro:
- Compressão (a partir de crest factor / DR): textos prontos com plugins free.
- LUFS alvo (a partir de `lufs_integrated` + gênero): faixa segura por gênero.
- EQ (a partir do delta da curva espectral): bandas a cortar/realçar.
- True Peak (já existe `evaluateTruePeak`).
Cada recomendação tem `prioridade`, `acao`, `como_fazer` (plugin free + DAW). Renderiza na aba **Recomendações** acima das sugestões da LLM.

## 6. Projeção 2D do banco
Script offline (uma vez) faz **PCA-2 sobre as 8 features normalizadas** das refs ativas → salva `public/data/reference_projection.json` (~3.6k pontos, ~250 KB) com `{x, y, genre, band}`. Frontend `TimbralMap.tsx` renderiza um scatter Recharts com pontos cinza por gênero e ponto colorido do artista (calculado runtime usando os mesmos pesos PCA salvos no JSON).

Nota: PCA é honesto e leve. **Sem t-SNE/UMAP** (tooltip explica): t-SNE/UMAP exigiriam recomputo periódico e biblioteca pesada no cliente — escolha consciente para entregar valor agora.

## 7. Export PDF
Nova lib `jspdf` + `html2canvas`. Botão "Exportar PDF" na aba Resumo: captura cada aba (4 canvases) e empilha em A4. Cobre: cabeçalho com nome da faixa/artista/data, métricas-chave, gráficos, top recomendações. Logo + paleta do app.

## 8. Reorganização de /music-dna em abas
Refatorar `MusicDNA.tsx` para usar `Tabs` do shadcn (já em uso no projeto):
- **Resumo** — cards atuais (LUFS, BPM, key, gênero) + diagnostico_resumo + botão Export PDF
- **Técnico** — radar perceptual atual + curva espectral vs alvo + timeline de seções + acordes
- **Comparação** — vizinhos próximos (já existe) + TimbralMap + PlaylistMatch
- **Recomendações** — DIY determinísticas + LLM `proximos_passos`

Mantém empty states e i18n PT/EN existentes.

---

## Banco

```text
playlist_profiles
  id uuid pk
  slug text unique
  name text
  vector jsonb            -- centroide normalizado das 8 features
  feature_ranges jsonb    -- desvio padrão por eixo para tolerância
  sample_tracks jsonb     -- 3-5 (band, filename) representativos
  created_at timestamptz
GRANT SELECT TO authenticated; admin manage; RLS habilitada.
```

Nova RPC `get_genre_section_stats(p_genre text)` retornando `p50_segments_count`, `p50_duration_sec`, `p50_seconds_to_first_chorus_estimate` (estimativa: `duration / segments_count * 1`).

## Arquivos novos / editados
- `supabase/functions/music-dna-spectral-target/index.ts` (novo)
- `supabase/migrations/<ts>_playlist_profiles_and_genre_stats.sql` (nova tabela + RPC + seed via script offline)
- `src/lib/audioAnalysis.ts` (adiciona `extractChordSequence`)
- `src/lib/mixRecommendations.ts` (novo)
- `src/lib/playlistMatch.ts` (novo)
- `src/components/music-dna/SpectralTargetCurve.tsx` (novo)
- `src/components/music-dna/SectionsTimeline.tsx` (novo)
- `src/components/music-dna/ChordSequenceCard.tsx` (novo)
- `src/components/music-dna/PlaylistMatchCard.tsx` (novo)
- `src/components/music-dna/TimbralMap.tsx` (novo)
- `src/components/music-dna/MixRecommendationsDIY.tsx` (novo)
- `src/components/music-dna/ExportPdfButton.tsx` (novo)
- `public/data/reference_projection.json` (novo, gerado offline)
- `src/pages/MusicDNA.tsx` (refatora para abas)
- `mem://funcionalidades/dna-musical/fluxo-de-analise` (atualiza)

## Validação
1. Subir migration → confirmar `playlist_profiles` populada com 8 clusters e RPC respondendo.
2. Executar análise real e conferir:
   - Curva espectral renderiza com 7 bandas e EQ tags coerentes.
   - Top-5 playlists com `compat_pct` ordenado e deltas plausíveis.
   - Timeline mostra ≥3 seções; comparação com mediana do gênero aparece.
   - Acordes: 16 itens com Roman numerals.
   - Mapa 2D: ponto do artista cai perto dos pontos de vizinhos retornados pela RPC `find_nearest_reference_tracks` (sanidade).
   - PDF gerado abre, todas 4 abas legíveis.
3. Sem regressão no fluxo atual de `useMusicDNA` (sessão cache, [DNA] tasks, feedback de classificador).

## Fora de escopo (declarado)
A/B player, evolução temporal entre uploads, t-SNE/UMAP real, qualquer reescrita do backend para Python/FastAPI, qualquer reuso das URLs originais das refs (não existem publicamente).
