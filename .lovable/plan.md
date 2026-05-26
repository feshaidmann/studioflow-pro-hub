## Diagnóstico das seções atuais

Mapeei o relatório (componente `MusicDNAAnalyzer.tsx` + filhos) e classifiquei cada campo por **fonte de dados** e **risco de redundância**.

```text
1. Header                       → realAnalysis + externalLookup (OK)
2. Resumo executivo             → IA + realAnalysis
3. Diagnóstico (fortes/gargalos/passos) → IA
4. Identidade                   → IA
5. Referências = BenchmarkPanel → music_dna_benchmarks (catálogo)
6. Técnico (6 MetricCards + texto IA) → realAnalysis + IA
7. Seções da faixa              → realAnalysis (librosa)
8. Perfil Acústico (Radar + Bars) → realAnalysis vs refFeatures (preset hardcoded)
9. PlaylistMatchCard + TimbralMap → playlist_profiles + reference_projection
10. Footer                      → ações
```

### Problemas confirmados

- **`refFeatures` no Perfil Acústico vem de `GENRE_PRESETS` hardcoded** (`src/lib/genreClassifier`), não do catálogo. Fonte frágil — colide com o BenchmarkPanel, que já compara as mesmas features Spotify-style contra o catálogo real.
- **Duplicação Perfil Acústico × BenchmarkPanel:** ambos renderizam barras (`FeatureBar`) das mesmas dimensões (danceability/energy/valence/acousticness/instrumentalness/speechiness/liveness) contra "referência". Usuário vê o mesmo gráfico duas vezes.
- **Chip "Fonte" aparece 3×:** badge no header (`Fonte: web_audio`), badge de confiança ("Análise rápida/completa") no Resumo, e bloco "Fonte: Catálogo de referência" dentro do BenchmarkPanel.
- **Chips redundantes no Resumo:** `Trecho 0:00–X` e `Métricas globais OK` repetem dados já visíveis nos MetricCards (Duração) e no badge de status.
- **Limites de "Pronta para streaming" inconsistentes:** o resumo aceita LUFS ∈ [−16, −10]; o MetricCard de LUFS marca verde só em [−15, −13]. Mesma faixa, regras diferentes → veredito conflita visualmente.
- **`technicalItems` (texto IA) repete o veredito dos MetricCards** quando o texto é curto/factual; o filtro atual (`>= 40 chars`) ainda deixa passar repetições de "LUFS dentro do alvo".
- **TimbralMap × PlaylistMatchCard × BenchmarkPanel:** três visualizações de "proximidade" sem hierarquia clara para o usuário (artista independente). BenchmarkPanel responde "como meu gênero soa em média"; Playlist "em que cluster me encaixo"; Timbral "onde estou no mapa global". Falta título/legenda que diferencie.
- **"Persona do ouvinte"** é texto IA livre sem ancoragem em dados → manter, mas marcar explicitamente como interpretação.
- **Espectro_avaliacao (texto IA)** não tem MetricCard equivalente; OK manter.
- **PDF/Markdown export** ainda inclui "Avaliação técnica" textual mas não inclui os valores dos targets (faixa ideal por métrica) — usuário recebe texto sem âncora numérica.

## Refinamentos propostos

### A. Eliminar redundâncias

1. **Remover o painel "Perfil Acústico" (Radar + Bars contra `refFeatures`).** Ele duplica o BenchmarkPanel e usa fonte fraca (preset hardcoded). O radar pode ser realocado dentro do BenchmarkPanel como visualização opcional (toggle "Barras / Radar"), mas comparado contra o **benchmark do catálogo**, não contra preset. Decisão default no plano: **remover Perfil Acústico** e oferecer toggle de visualização no Benchmark.
2. **Remover o chip `Métricas globais OK`** do Resumo (o status badge "Pronta/Precisa revisão" já comunica isso) e o chip `Trecho 0:00–X` (Duração já está no MetricCard).
3. **Unificar regra de "Pronta para streaming"** com os targets dos MetricCards: LUFS verde quando ∈ [−15, −13] (target do MetricCard), TP ≤ −1, DR ≥ 7. Status "Boa base" para a faixa larga atual. Garante coerência entre as duas visualizações.
4. **Filtrar mais agressivamente `technicalItems`:** descartar itens cujo texto da IA não traga nada além do veredito numérico já mostrado (heurística: rejeitar quando o texto não contém recomendação acionável — verbo no imperativo OU palavra-chave como "considere/reduza/aumente/cuidado").
5. **Tirar o chip "Fonte: web_audio" do header** — a informação já está no badge de confiança ("Análise rápida/completa/Catálogo verificado") logo abaixo.

### B. Reforçar fonte de dados

6. **BenchmarkPanel — explicitar amostra e data:** mostrar contagem efetiva (`tracks · artists`) e label "atualizado mensalmente". Já existe parcialmente; padronizar.
7. **Marcar campos puramente IA como "interpretação"** (Identidade.mood/território/persona, Pontos fortes, Gargalos, Sugestões) com micro-rótulo `IA · interpretação` para diferenciar de métricas medidas. Evita o usuário tratar texto livre como fato medido.
8. **MetricCards — adicionar âncora "alvo: X a Y"** em texto pequeno abaixo do gráfico de range, em vez de só uma faixa colorida sem números. Hoje só o tooltip do gauge no PDF mostra.
9. **PlaylistMatchCard + TimbralMap — adicionar subtítulo explicando o que cada um responde**: "Em que cluster de playlist sua faixa cai" vs "Onde sua faixa aparece no mapa do catálogo". Sem isso parecem redundantes.
10. **Export (PDF + Markdown) — incluir targets ao lado dos valores** (`LUFS integrado: −12.3 (alvo −15 a −13)`) e seção dedicada "Como ler" (1 parágrafo) explicando o que é medido vs interpretado.

### C. Hierarquia da página

11. **Reordenar a sticky nav** para refletir o fluxo do artista independente:
   `Resumo → Diagnóstico → Técnico → Seções → Identidade → Referências → Mapa`.
   (Hoje Identidade e Referências vêm antes do Técnico, empurrando dados objetivos para baixo.)

## Escopo da implementação (em ordem)

- `MusicDNAAnalyzer.tsx`
  - Remover painel "Perfil Acústico" e respectivos imports (`AcousticRadar`, `FEATURE_KEYS`, `FEATURE_LABELS`, `refFeatures` no consumo da seção). Manter `refFeatures` no objeto `diagnosis` para não quebrar outros usos.
  - Remover chips `Trecho` e `Métricas globais` do `ExecutiveSummary`.
  - Remover badge `Fonte: ...` do header (manter `confidenceBadge`).
  - Ajustar regra de `status` em `ExecutiveSummary` para usar os mesmos thresholds do `MetricCard` (LUFS [−15,−13]; TP ≤ −1; DR ≥ 7).
  - Endurecer filtro de `technicalItems` (heurística de "tem recomendação acionável").
  - Reordenar sticky nav + ordem das seções renderizadas.
  - Adicionar subtítulos curtos em `PlaylistMatchCard` e `TimbralMap` (props ou wrappers).
  - Ajustar `buildAnalysisMarkdown` e `downloadAnalysisReport` para incluir targets nas métricas e bloco "Como ler".
- `MetricCard` (mesmo arquivo): renderizar `alvo: X a Y {unit}` abaixo da barrinha quando `target` existir.
- Adicionar micro-rótulo `IA · interpretação` em `DiagCard` quando `variant === "primary"` e seção for textual (Identidade, Sugestões). Implementar via prop opcional `aiBadge`.
- `BenchmarkPanel`: pequeno selo `Atualizado mensalmente` ao lado do "Fonte: Catálogo de referência".

Sem mudanças em schema, edge functions, RPCs ou pipeline Python. Sem mudar a lógica de classificação ou de busca de vizinhos.

## Fora de escopo

- Repopular `playlist_profiles` ou `music_dna_benchmarks`.
- Mudar o classificador de gênero ou pesos do `find_nearest_reference_tracks`.
- Substituir Radar por outra visualização (apenas remoção; toggle dentro do Benchmark fica para iteração futura).
- Tradução EN do relatório.