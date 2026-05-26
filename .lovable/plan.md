## Refatorar o Mapa Timbral — UMAP + features espectrais clássicas

Hoje o `TimbralMap` carrega `public/data/reference_projection.json` (gerado fora do repo) com PCA 2D sobre 8 features de alto nível (`lufs_integrated`, `dynamic_range_db`, `spectral_centroid`, `tempo_bpm`, `energy`, `danceability`, `valence`, `acousticness`). O componente projeta o usuário aplicando `scaler` + componentes PCA diretamente no navegador.

Este refactor mantém o **componente visual praticamente como está** e foca no **modelo de projeção** e nas **features** que o alimentam.

---

### 1. Novo conjunto de features (espectrais clássicas)

Auditoria atual em `music_reference_tracks` (não quarentenadas, 3.653 linhas):

| Feature | Coverage |
|---|---|
| `lufs_integrated`, `dynamic_range_db`, `spectral_centroid`, `spectral_rolloff` | 3.650 |
| `spectral_bandwidth`, `zero_crossing_rate`, `mfcc` | 2.129 |
| `tempo_bpm` | 2.060 |
| `spectral_flatness`, `spectral_contrast` | 0 (descartadas) |

Features finais que alimentam o modelo (todas escaláveis, log/clip onde indicado):

1. `lufs_integrated` (clip [-30, -5])
2. `dynamic_range_db` (clip [0, 30])
3. `spectral_centroid` (log)
4. `spectral_rolloff` (log)
5. `spectral_bandwidth` (log)
6. `zero_crossing_rate`
7. `tempo_bpm` (clip [50, 200])
8. `mfcc[1..6]` — primeiros 6 coeficientes (timbre macro), descartando o coef. 0 (energia)

Total: ~13 dimensões. Linhas com qualquer feature obrigatória nula são excluídas (≈2.000 faixas restantes — amostra suficiente para UMAP).

Padronização: `StandardScaler` (z-score) sobre o conjunto de referência.

### 2. Trocar PCA → UMAP

- Algoritmo: **UMAP 2D** (`n_neighbors=25`, `min_dist=0.15`, `metric='euclidean'`, `random_state=42`).
- Clustering recalculado por **k-means (k=8)** sobre as coordenadas UMAP, para manter a coluna `c` (cor do cluster) usada hoje.
- Sem t-SNE: UMAP é determinístico (com seed) e mais leve.

### 3. Projeção do ponto do usuário (problema central)

UMAP não tem transformação fechada como o PCA. Estratégia adotada: **k-NN no espaço padronizado de features**, posicionando o usuário pela média ponderada das coordenadas UMAP dos vizinhos.

1. No script: persiste `scaler` (mean/scale por feature) e a matriz `Z` (features padronizadas) das referências no JSON.
2. No cliente: padroniza o vetor do usuário com o mesmo `scaler`, calcula distância euclidiana para todas as Z, pega os top-K (K=15) e calcula `userPoint = Σ wᵢ · UMAPᵢ` com `wᵢ ∝ 1 / (dᵢ + ε)`.

Se faltar qualquer feature obrigatória no usuário, o mapa segue mostrando a nuvem e a mensagem "Faltam features..." (como hoje).

### 4. Novo formato do `reference_projection.json`

```json
{
  "version": 2,
  "method": "umap",
  "scaler": {
    "features": ["lufs_integrated", "...", "mfcc_1", "...", "mfcc_6"],
    "mean": [...],
    "scale": [...]
  },
  "umap": { "n_neighbors": 25, "min_dist": 0.15, "seed": 42 },
  "z": [[...features padronizadas...], ...],   // float16 arredondado a 3 casas
  "points": [{ "x": 1.23, "y": -0.45, "g": "Rock", "c": 3 }, ...],
  "clusters": { "k": 8 }
}
```

Tamanho estimado: ~2.000 pontos × (13 features + 2 coords) ≈ 350–500 KB. Aceitável (lazy-loaded uma vez por sessão).

### 5. Gerador (novo script no repo)

Criar `scripts/build_reference_projection.py`:

- Conecta no banco via `PG*` envs e seleciona faixas não quarentenadas com as features obrigatórias presentes.
- Aplica clip/log/StandardScaler, roda UMAP + KMeans.
- Escreve `public/data/reference_projection.json` (formato acima).
- README curto de execução: `pip install umap-learn scikit-learn psycopg2-binary numpy && python scripts/build_reference_projection.py`.

Execução é **manual / offline** (não é parte do build do Vite). Documentar em `docs/04-banco-de-dados.md` que o JSON é regenerado quando o banco de referências muda significativamente.

### 6. Mudanças no componente `src/components/music-dna/TimbralMap.tsx`

Apenas o necessário para o novo formato + projeção via k-NN. UI inalterada (mesmo card, mesmas cores, mesmo SVG):

- Substituir `projectUser` (PCA) por `projectUserByKNN(user, data, k=15)`.
- Aceitar `version: 2` no JSON; manter fallback que rejeita versão antiga com aviso console.
- Memoizar a padronização do vetor do usuário e o cálculo de distâncias com `useMemo` em cima de `data` + chaves estáveis do `user`.

### 7. Fora de escopo

- Lista textual de vizinhos (usuário pediu para manter como está).
- Mudanças visuais (eixos, legenda, tooltips, zoom).
- Retreinar/recalcular features faltantes em `music_reference_tracks` (ex. preencher `spectral_flatness`).
- Recalcular o JSON automaticamente em produção — fica como script manual.

### 8. Passos de implementação (quando entrar em build mode)

1. Adicionar `scripts/build_reference_projection.py` + breve README.
2. Rodar o script localmente (ou pedir ao usuário para rodar) e substituir `public/data/reference_projection.json`.
3. Atualizar `src/components/music-dna/TimbralMap.tsx` para o formato v2 e k-NN.
4. Documentar regeneração em `docs/04-banco-de-dados.md` (seção do pipeline de referências).
5. Smoke test no preview: abrir uma análise de DNA musical existente, verificar nuvem + ponto vermelho posicionado.

### Riscos

- Coverage de `mfcc`/`bandwidth` (~2.129) reduz a amostra para ~⅔ do que o PCA atual usava (3.650). Mitigação: se a amostra final ficar < 1.500 faixas, cair para um subset sem MFCC e manter `bandwidth` + `zcr` opcionais (decidir após primeira execução do script).
- JSON cresce (~400 KB vs ~70 KB atual). Aceitável dado o lazy-load + cache.
- k-NN no cliente sobre 2.000 × 13 floats é O(n·d) ≈ 26k ops — instantâneo.
