# Plano: precisão da análise de áudio do DNA Musical

## Implementado nesta iteração

1. **Migration** — `music_dna_analyses.full_analysis_jsonb`, `full_analysis_at`, `analysis_confidence` (preview|full|external).
2. **FFT real (`fft.js`)** em `src/lib/audioAnalysis.ts > computeSpectralMetrics`: substitui DFT O(N²) por radix-4 O(N log N) e processa a faixa INTEIRA (Hann 2048, hop 1024).
3. **K-weighting BS.1770** (`computeLufsKWeighted`): pre-filter high-shelf 1681Hz +4dB + RLB HP 38Hz desenhados via biquad cookbook RBJ; janela 400ms/hop 100ms; gating absoluto -70 LUFS + relativo -10 LU.
4. **True Peak 4x oversample** (Catmull-Rom): captura inter-sample peaks; corrige erro típico de +0.5 a +1.5 dB em material limitado.
5. **Bandwidth + ZCR** agora extraídos no `computeSpectralMetrics`.
6. **Confidence no prompt Gemini** (`buildConfidenceBlock` em `supabase/functions/music-dna-analyze/index.ts`): classifica cada métrica como high/medium/low e instrui o modelo a NÃO construir narrativas sobre métricas low. Métricas perceptuais ficam `low` em preview.
7. **Badge UI** `ExecutiveSummary`: "Análise rápida" / "Análise completa" / "Catálogo verificado" com tooltip explicativo.

## Fora desta iteração (planejado, requer decisão/runtime longo)

- **`essentia.js` para features perceptuais treinadas** (Danceability, KeyExtractor, RhythmExtractor2013, LoudnessEBUR128). Bloqueio: licença AGPL — confirmar com o usuário antes de adotar; plano B é `meyda` (MIT) com cobertura menor.
- **Edge function `audio-analyze-full`** com `ffmpeg.wasm` + FFT real rodando a faixa completa no servidor (autoritativo). Os campos `full_analysis_jsonb`/`full_analysis_at`/`analysis_confidence` já existem para receber esse resultado.
- **Script `scripts/calibrate-browser-vs-librosa.ts`** populando offsets reais em `BROWSER_CALIBRATION` comparando extração browser contra o catálogo `music_reference_tracks` já populado por Librosa.

## Como validar agora

1. Reanalisar uma faixa: LUFS deve ficar mais próximo do que ferramentas profissionais (Youlean, ffmpeg loudnorm) reportam — diferença esperada cai de ±1.5 LU para ±0.3 LU.
2. True Peak deve aparecer ≥ Sample Peak (nunca menor); diferença típica 0.2–1.5 dB em masters muito limitados.
3. Centroide espectral agora reflete a faixa inteira, não só os primeiros 7s.
4. Badge "Análise rápida" aparece no resumo executivo.
5. Diagnóstico Gemini deve evitar afirmar "faixa muito dançante" / "claramente feliz" baseando-se em energy/valence sem qualificadores.
