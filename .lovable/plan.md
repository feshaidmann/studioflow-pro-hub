## Objetivo

Elevar a precisão da análise de áudio do DNA Musical combinando as 5 frentes: FFT real + LUFS K-weighted + True Peak oversampled, features perceptuais com `essentia.js`, calibração com o catálogo Librosa, extração server-side para faixas completas e marcação de confiança no prompt do LLM.

## Arquitetura proposta

```text
[Browser]                                          [Edge Function]
  └─ Análise rápida (preview)                        └─ Análise completa (autoritativa)
       fft.js + K-weight + 4x oversample                  Mesma stack rodando na faixa inteira
       essentia.js (danceability, valence...)             essentia.js WASM no Deno
       Janela: 30s do meio da faixa                       Janela: faixa inteira
       Latência: ~3s                                      Latência: 15-40s
       Marca confidence: "preview"                        Marca confidence: "full"
              │                                                   │
              └──────────────► music_dna_analyze ◄────────────────┘
                                      │
                                      ├─ Aplica BROWSER_CALIBRATION (offsets vs Librosa)
                                      ├─ Adiciona confidence_level por métrica
                                      └─ Injeta no prompt Gemini com tags <low_confidence>
```

## Etapas

### 1. Precisão de métricas no browser (`src/lib/audioAnalysis.ts`)
- Substituir DFT naive por `fft.js` (real FFT O(N log N)) — processa faixa inteira em janelas de 2048 com hop 512.
- Implementar K-weighting ITU-R BS.1770 (stages: shelving HF + RLB high-pass) antes do LUFS gating.
- True Peak com oversample 4x via filtro polyphase (4 taps) — corrige inter-sample peaks.
- BPM: substituir autocorrelação truncada por onset detection (spectral flux) + tempogram.
- Spectral centroid/rolloff/flatness/bandwidth/ZCR já corretos, apenas rodar em todo o áudio.

### 2. Features perceptuais com `essentia.js`
- Adicionar dependência `essentia.js` (WASM).
- Carregar via dynamic import em worker (`src/workers/essentiaExtractor.worker.ts`) para não travar UI.
- Substituir as fórmulas lineares atuais por:
  - `Danceability` (algoritmo Essentia treinado)
  - `KeyExtractor` (Krumhansl) — substitui detecção de tonalidade atual
  - `RhythmExtractor2013` — BPM robusto
  - `LoudnessEBUR128` — LUFS de referência
  - `SpectralContrast`, `MFCC` para preencher campos do catálogo
- Valence/energy: manter heurística mas calibrar contra `music_reference_tracks` (passo 3).

### 3. Calibração browser ↔ Librosa
- Script Node em `scripts/calibrate-browser-vs-librosa.ts`: lê N=50 faixas do bucket `creative-assets`, roda extração browser-side (via headless Chromium ou Node + Web Audio polyfill) e compara com colunas já populadas por Librosa em `music_reference_tracks`.
- Calcula offset médio + desvio padrão por métrica (LUFS, centroid, BPM, energy, danceability, valence).
- Popula `src/lib/audioAnalysis.ts > BROWSER_CALIBRATION` com offsets reais (hoje zerados).
- Salva relatório em `docs/calibration-report.md` com gráficos de dispersão (mermaid scatter).

### 4. Extração server-side (autoritativa)
- Nova edge function `audio-analyze-full` (Deno):
  - Recebe URL do áudio (já uploadado em `creative-assets`).
  - Decodifica MP3/WAV/FLAC via `ffmpeg.wasm` (já disponível no runtime Edge).
  - Roda `essentia.js` WASM no Deno + FFT real na faixa completa.
  - Retorna mesmas chaves do extractor browser + `confidence: "full"`.
- `music-dna-analyze` passa a chamar `audio-analyze-full` quando o usuário clica em "Análise completa" (botão novo) ou automaticamente após save.
- Persiste resultado em nova coluna `music_dna_analyses.full_analysis_jsonb` + `full_analysis_at`.

### 5. Restrições no prompt Gemini (`supabase/functions/music-dna-analyze/index.ts`)
- Para cada métrica, calcular `confidence` (`high` / `medium` / `low`) baseado em:
  - Cobertura temporal (< 30s = low)
  - Variância vs vizinhos do catálogo (outliers = medium)
  - Origem (browser preview = medium, server full = high, AcousticBrainz = high)
- Injetar no prompt blocos como:
  ```
  <metric name="valence" value="0.42" confidence="low" reason="heurística sem modelo treinado">
  ```
- Instruir o modelo: "Não construa narrativas sobre métricas com `confidence=low`. Mencione apenas como 'tendência aparente' ou omita."
- Adicionar few-shot example mostrando como suavizar afirmações em low confidence.

### 6. UI — surface confidence
- `ExecutiveSummary` e `TrackVersionCompare` ganham badge "Análise rápida" / "Análise completa".
- Tooltip por métrica com nível de confiança e fonte (browser/server/AcousticBrainz).
- Botão "Reanalisar com precisão máxima" dispara `audio-analyze-full`.

## Migration

```sql
ALTER TABLE music_dna_analyses
  ADD COLUMN full_analysis_jsonb jsonb,
  ADD COLUMN full_analysis_at timestamptz,
  ADD COLUMN analysis_confidence text CHECK (analysis_confidence IN ('preview','full','external'));
```

## Dependências novas

- `fft.js` (~12KB, MIT)
- `essentia.js` (~3MB WASM, AGPL/commercial — confirmar licença antes)
- `ffmpeg.wasm` na edge function (~25MB, LGPL)

## Riscos

- **Bundle size browser**: +3MB de essentia.js. Mitigação: carregar dinamicamente apenas quando o usuário abrir o DNA Musical.
- **Custo edge function**: ffmpeg.wasm + essentia em Deno consome RAM (~512MB pico). Monitorar timeouts.
- **Licença essentia.js**: AGPL pode ser bloqueio. Plano B: substituir por `meyda` (MIT, menos completo) + manter heurísticas calibradas.

## Ordem de execução sugerida

1. Migration + coluna de confidence (rápido, desbloqueia o resto)
2. fft.js + K-weight + True Peak (ganho imediato sem deps pesadas)
3. Calibração contra Librosa (revela quanto erro ainda resta)
4. essentia.js no browser (decisão sobre licença antes)
5. Edge function server-side
6. Confidence no prompt Gemini + UI

## Fora de escopo

- Treinar modelos próprios de valence/energy.
- Reanálise retroativa de análises antigas (criar job manual em `/admin` depois).
- Substituir AcousticBrainz/Deezer lookup (continua sendo o caminho preferencial quando há ISRC).