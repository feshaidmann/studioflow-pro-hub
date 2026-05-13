# Relatório de cobertura por gênero (Music DNA References)

Adicionar uma seção "Relatório de Cobertura" na página `/admin/reference-tracks` que mostra, por gênero, a saúde do catálogo de referências e o impacto provável na qualidade dos resultados do RPC `find_nearest_reference_tracks`.

## 1. RPC novo: `report_reference_coverage`

`SECURITY DEFINER`, retorna uma linha por gênero (inclui `''` para "sem gênero"):

Colunas:
- `genre`
- **Cobertura simples**
  - `total`, `active`, `quarantined`
  - `healthy_pct` = active / total
  - `distinct_bands_active`
- **Cobertura de dimensões técnicas** (sobre as 15 dimensões usadas pelo RPC: lufs, dynamic_range, centroid, rolloff, flatness, zcr, bandwidth, tempo, energy, danceability, valence, acousticness, instrumentalness, liveness, speechiness)
  - `avg_dims_filled` (média entre faixas ativas)
  - `pct_above_floor` = % de ativas com `dims_used >= 8` (piso atual do RPC)
- **Diversidade de artistas**
  - `tracks_per_band_avg`, `tracks_per_band_max`
  - `monopoly_risk` = `tracks_per_band_max / NULLIF(active, 0)` (alto = um único artista pode dominar antes do cap de 2)
- **Saúde estatística** (desvio padrão entre as faixas ativas)
  - `lufs_stddev`, `bpm_stddev`, `centroid_stddev`, `dr_stddev`
- **Score de qualidade estimado** (0–100, transparente):
  - `quality_score` = `100 * (0.30·healthy_pct + 0.25·min(active/30, 1) + 0.25·pct_above_floor + 0.20·(1 − min(monopoly_risk, 1)))`
  - Heurística: gênero precisa ter catálogo saudável + amostra ≥30 + dimensões completas + sem monopólio.
- `quality_label`: "Crítico" (<40), "Frágil" (40–60), "Aceitável" (60–80), "Sólido" (≥80)

Acesso: somente `admin` (checagem com `has_role(auth.uid(),'admin')`).

## 2. UI: aba "Cobertura" em `/admin/reference-tracks`

- Tabs no topo do admin: "Faixas" (atual) | **"Cobertura"** (novo).
- Painel "Cobertura":
  - Cards de resumo no topo: total ativo, total quarentenado, % saudável global, gêneros críticos.
  - Tabela ordenável por gênero com chips coloridos para `quality_label`.
  - Cada linha expansível mostrando os blocos das 4 métricas.
  - Botão "Atualizar" (re-roda o RPC) e "Exportar CSV" (pt-BR, `;`, UTF-8 BOM, via `papaparse`, em `/admin`).
  - Banner explicando como o `quality_score` é calculado (transparência) e como interpretar (linkando para o RPC `find_nearest_reference_tracks`).

## 3. Onde plugar
- `src/pages/AdminReferenceTracks.tsx`: adicionar Tabs, novo componente `ReferenceCoverageReport`.
- `src/components/admin/ReferenceCoverageReport.tsx`: tabela + export.
- Hook `useReferenceCoverageReport` que chama `supabase.rpc('report_reference_coverage')`.

## Detalhes técnicos

- O RPC só lê de `music_reference_tracks` — sem custo de IA, sem cron.
- Stddev/avg calculados em uma única CTE para escalar para qualquer volume.
- A contagem de "dimensões preenchidas" verifica `IS NOT NULL` em cada uma das 15 colunas espelhando o cálculo do `find_nearest_reference_tracks`, garantindo que as duas métricas conversem.
- Sem mudança em RLS de tabelas existentes; o RPC já força admin internamente.
