## Análise minuciosa — "Referências mais próximas" (Music DNA)

Auditoria do pipeline ponta-a-ponta da seção, do banco até o JSX. Foco: coerência dos resultados que o usuário enxerga.

---

### 1. Pipeline atual (resumo)

```text
extração local (Web Audio)
   │
   ▼
calibrateForCatalog()  ──►  identidade (offsets = 0)
   │
   ▼
edge: music-dna-analyze
   │
   ├─► count(*) total + count por gênero
   ├─► useStrictGenre = (genre informado && count_genre ≥ 20)
   ├─► RPC find_nearest_reference_tracks(p_strict_genre, weights, bonuses)
   └─► IA gera "referencias_proximas" (artistas livres, validados client-side)
   │
   ▼
UI MusicDNAAnalyzer:
   filtra similarity_score ≥ 0.40
   categoriza (≥0.75 Próximo, ≥0.55 Aproximado, senão Distante)
   tabs: Catálogo Real | Sugestões IA
```

---

### 2. Problemas críticos (alta gravidade, distorcem o ranking)

**2.1. Catálogo está corrompido por desalinhamento de colunas no import**

Inspeção do banco (1 374 faixas, 32 "gêneros"):

| Coluna | Sintoma | Impacto |
|---|---|---|
| `mode` | 596 `'minor'`, 755 `'major'`, **23 valores numéricos (0.63…0.74)** | Bonus de tonalidade acionado errado; rows numéricas nunca casam |
| `key_name` | 'A', 'E'… (corretos) **+ 13 'major' + 10 'minor'** | Mesmo desalinhamento; key_bonus zera |
| `genre` | "Rock", "Pop"… **+ "10CC", "2 Pac"** (artistas como gênero) | Filtro `ilike` falha; strict_genre vira inútil |
| `band` / `filename` | "Beth Orton" / `09 Blood Red…` (corretos) **+ "11 18 Carat Man Of Means.mp3" / "208.03"** (filename como band, BPM como filename) | UI mostra lixo |
| `energy` | 1 227 normalizadas (0–1) **+ 124 fora da faixa** (-19.47 a 724) | Linha corrompida soma `|638-0.6|*0.4*0.6 ≈ 153` ao distance e some do top, mas reduz o pool útil em ~10% por gênero |
| `danceability/valence/acousticness/instrumentalness/liveness/speechiness` | 55–138 rows com valor > 1 (alguns com `valence = 2408.24`, que é spectral_centroid leakage) | Mesmo problema |

Causa: `upsert_reference_tracks` faz `NULLIF(r->>'col','')::numeric` sem **clamp/validação de domínio** (energy/dance/val devem ser 0–1, mode deve ser enum). Qualquer CSV com colunas trocadas entra cru.

**2.2. Catálogo é Anglo-cêntrico — incoerente com o público da plataforma**

Top gêneros: Rock 155, Pop 140, Jazz 124, Hip-Hop 115, Ambient 91, Indie Rock 84, Eletrônico 83.
Gêneros BR centrais ao produto (memória do projeto): MPB 29, Funk 25, Bossa 19, **Sertanejo 0, Forró 0, Pagode 0, Trap BR 0, Axé 0**.

Resultado: artista de sertanejo recebe vizinhos do Rock/Pop/Jazz, com bônus de gênero zero (gênero declarado não existe no catálogo) — ranking puramente acústico, e a UI exibe "Próximo" quando na verdade são tracks aleatórias.

**2.3. Distância do RPC favorece linhas com poucas dimensões**

`find_nearest_reference_tracks` faz `weighted_sum / total_weight`, e `total_weight` só conta pesos das dims **não-NULL**. Uma faixa do catálogo com 4 dims preenchidas que casem por sorte pode produzir `norm_distance` menor que uma com 12 dims onde 1 destoa.
Não há piso de `dims_used` — a UI até mostra "5/15 dims" mas isso não penaliza o score.

**2.4. Bônus de gênero/tonalidade aplicados depois da normalização**

`norm_distance + key_bonus(-0.15) + genre_bonus(-0.25)` pode somar **−0.40**, transformando uma faixa pouco parecida tecnicamente em "Próximo (>75%)" só por bater gênero+tom. Gera falsa precisão.

**2.5. Calibração browser→librosa é stub identidade**

`BROWSER_CALIBRATION` está zerado (offsets/scale = 1). Web Audio mede LUFS/centroide com pipeline diferente do librosa do batch — diferenças sistemáticas (LUFS pode estar +1 a +3 dB off, centroide com janela diferente). Toda comparação espectral fica enviesada.

**2.6. Sem deduplicação por banda**

Beastie Boys tem 72 tracks, Beaver & Krause 66. Para um usuário cujo perfil acústico bate com Beastie Boys, os 6 vizinhos podem ser todas as mesmas iterações da mesma banda. Atualmente nenhum `DISTINCT ON (band)` ou cap por artista.

---

### 3. Problemas relevantes (média gravidade, afetam a leitura)

**3.1. Limiar `MIN_SIM = 0.40` no front desperdiça o trabalho do RPC**
RPC retorna 6, UI corta tudo abaixo de 40%. Em gêneros mal cobertos sobra 0–1 vizinho. Como o score é `1/(1 + norm_distance)`, 0.40 ↔ norm_distance ≤ 1.5 — corte arbitrário sem justificativa numérica.

**3.2. Thresholds de label inconsistentes**
- Prompt da IA fala em "≥ 0,80 alta proximidade".
- UI categoriza "≥ 0,75 Próximo".
- `defaultTab` decide pela aba IA quando `topSim < 55%`.
Três escalas diferentes coexistem.

**3.3. Validação client-side da IA descarta silenciosamente**
`referencias_proximas` é filtrado contra `ALL_REFERENCE_ARTISTS ∪ catalogBands`. Quando a IA cita um artista BR legítimo fora dessa lista (caso comum dado o catálogo Anglo), a sugestão some sem feedback ao usuário e a aba IA fica vazia.

**3.4. `useStrictGenre` mente em casos limítrofes**
Bossa Nova tem 19 faixas, MPB 29. Strict só ativa em ≥20. Para Bossa Nova a UI mostra "Catálogo: 1 374 faixas · 19 no gênero detectado" mas ranqueia em todo o catálogo — o usuário lê como se 19 fossem as candidatas reais.

**3.5. Estado "(filtro ativo)" só aparece se `useStrictGenre = true`**, mas a label é a mesma cor — fácil passar despercebida.

**3.6. UI exibe nomes de arquivo crus (`07 Polly.mp3`)**
Sem normalização de track title, sem capitalização, com underscores. Visual de dump técnico, não de produto curado.

**3.7. `dims_used / dims_total = 15` exposto**
Sem tooltip explicando o que é uma "dimensão". Para o usuário-alvo (artista independente), é ruído cognitivo.

**3.8. BPM half/double**
RPC trata corretamente no score, e a UI mostra `(half-time)`/`(double-time)`. Mas o delta numérico exibido (`fmtDelta`) ainda é o **direto** — usuário vê "−60 BPM (half-time)" sem entender que o algoritmo já compensou.

**3.9. Risco de surfar a própria faixa do usuário**
Se o nome bater com algo no catálogo (ex.: artista que cadastrou referências próprias no `/admin/reference-tracks`), a faixa pode aparecer como "vizinho 100%". Não há filtro por `band ≠ user.display_name` ou `analysis.user_id = user`.

**3.10. Classifier hint vs gênero declarado**
Se classificador interno discorda do declarado (>75% confiança), a UI nem avisa que os vizinhos foram puxados pelo declarado, não pelo detectado. Pode produzir vizinhos incoerentes com o que o resto do diagnóstico está dizendo.

---

### 4. Problemas menores / polimento

- Aba `Catálogo Real` decide ser default mesmo sem nenhum vizinho ≥0.55 quando IA também está vazia (`topSimDefault = 0` cai no else, ok), mas em "borderline" 0.55 troca de aba sem aviso.
- Tooltip do título "Comparação técnica entre extrações… vizinhos abaixo de 40% omitidos" aparece em ícone `Info` pequeno dentro do TabsTrigger — clique propaga e troca de aba.
- O `coverageLine` mostra `catalogTotal` mesmo quando `useStrictGenre=true`, dando a impressão de que comparou contra 1 374 quando comparou contra 19.
- Sem ordenação estável quando dois vizinhos empatam em score (depende do plano do Postgres).
- `find_nearest_reference_tracks` usa `LIMIT GREATEST(p_limit, 1)` mas não há paginação nem "ver mais".
- O JSON do prompt para a IA inclui o `nearestNeighbors` inteiro (band+filename+features) — o `motivo` da IA acaba parafraseando o RPC, sem agregar.

---

### 5. Plano de correção proposto (ondas independentes)

**Onda 1 — Saneamento de dados (alto ROI, não quebra UI):**

1. Migration `clean_reference_tracks_v1`:
   - Marcar como `quarantined=true` (nova flag) toda row onde:
     - `mode NOT IN ('major','minor')` OU
     - `key_name IN ('major','minor')` OU
     - `energy NOT BETWEEN 0 AND 1` OU
     - `danceability/valence/acousticness/instrumentalness/liveness/speechiness NOT BETWEEN 0 AND 1` OU
     - `genre` é nome de banda (heurística: existe igual em `band`).
   - Filtrar `quarantined` em `find_nearest_reference_tracks`.
2. Endurecer `upsert_reference_tracks`:
   - `CHECK` de domínio antes do INSERT (clamp ou rejeita).
   - Validação de `mode IN ('major','minor')`.
3. Rodar `recalcular_benchmark_genero` para todos os gêneros após o cleanup.

**Onda 2 — Fairness do ranking (correção algorítmica):**

4. Em `find_nearest_reference_tracks`:
   - Exigir `dims_used >= 8` (de 15) para entrar no top.
   - Reduzir bônus de gênero para `-0.10` e key para `-0.05` (eram −0.25/−0.15).
   - Adicionar `DISTINCT ON (band)` ou cap de 2 faixas por banda.
   - Penalizar BPM half/double com fator menor (0.7×) — não tratar como match perfeito.
5. Calibrar `BROWSER_CALIBRATION` com 10 faixas conhecidas (Web Audio vs librosa) — mesmo um offset empírico já reduz viés sistemático.

**Onda 3 — Coerência com o produto (mercado BR):**

6. Importar lote curado de Sertanejo/Forró/Pagode/Trap BR/Axé via `/admin/reference-tracks` (mínimo 25/gênero para ativar strict_genre).
7. Atualizar tooltip do `Info` deixando claro que o catálogo ainda é parcial em BR.

**Onda 4 — Honestidade visual & UX:**

8. UI:
   - Rótulos: alinhar IA prompt + categorize em `<0.55 / 0.55–0.75 / >0.75`.
   - Mostrar nome curado: `"Banda — Título"` (strip prefixo `"NN "` e sufixo `.mp3`, replace `_` → `'`).
   - `coverageLine`: quando strict ativo, escrever "Comparado contra 19 faixas do gênero" (não 1 374).
   - Substituir `dims_used/dims_total` por badge "comparação parcial" quando `dims_used < 12`.
   - Quando `bpmRel != null`, esconder o delta numérico bruto (mostrar só "half-time"/"double-time").
   - Filtrar vizinho cujo `band` == `user.display_name` ou `filename` == nome do arquivo enviado.
9. Quando classifier discorda do declarado com confiança ≥75%, exibir banner "Vizinhos buscados em <gênero declarado>; perfil acústico se aproxima mais de <detectado>".
10. Aba IA: quando o filtro descarta sugestões, mostrar texto explícito ("X sugestões fora do catálogo curado foram omitidas") em vez de aba vazia.

---

### 6. Critério de "pronto"

- Zero rows com `mode` numérico ou `energy>1` no catálogo ativo.
- Em ao menos 5 gêneros BR top, `useStrictGenre=true`.
- Top-6 de uma faixa não pode ter > 2 entradas da mesma banda.
- Score exibido reflete a **mesma escala** que o tooltip e o prompt da IA.
- Nenhuma faixa do próprio usuário aparece como vizinha.

---

**Próximo passo:** quer que eu execute as Ondas 1+2 (são as que mais movem o ponteiro de coerência e são auto-contidas)? Ou prefere atacar primeiro a Onda 3 (cobertura BR) que é mais lenta porque depende de importar áudio?
