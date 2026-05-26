
# Revisão e refino do analisador de áudio

Após auditar `src/lib/audioAnalysis.ts` (~1.134 linhas), `src/lib/genreClassifier.ts`, `src/hooks/useMusicDNA.ts` e `supabase/functions/audio-analyze` + `music-dna-analyze`, encontrei pontos frágeis nos 3 focos escolhidos. O objetivo é tornar os números mais fiéis ao que o catálogo Python/Librosa produz e ao que o usuário ouve — sem aumentar custo nem tempo de análise perceptivelmente.

## Diagnóstico (o que está fraco hoje)

**1. Features estilo Spotify (`computeSpotifyFeatures`)**
- `valence` é só `centroid×0.4 + energy×0.3 + dance×0.3` — não usa harmonia (modo maior/menor, chroma) nem variação tonal. Sai quase igual em qualquer faixa.
- `danceability` assume centro em 115 BPM — penaliza injustamente Sertanejo Raiz (~70), Bossa (~80), Funk Carioca (~130), Forró (~140+).
- `speechiness` usa `ZCR/10000` e `instrumentalness = 1 − speechiness×1.5` — inversamente acoplados, sem detecção real de voz. Resultado: instrumentais detectados como vocais e vice-versa.
- `energy` ignora a banda grave (sub/kick), peso forte do gênero BR.
- Cálculo single-shot na faixa inteira: sem agregação por frames, ignora variação interna.

**2. BPM (`detectBPM`)**
- Autocorrelação cortada em `n=2000` amostras de envelope (~20 s) — favorece o início.
- Sem checagem de "octave error" (60→120, 70→140). Sertanejo cai em meio-tempo errado.
- Sem interpolação parabólica no pico → resolução cai a ±1.5 BPM.
- Envelope só com energia bruta; sem flux espectral, perde batidas em material denso/limited.

**3. Key (`detectKey`)**
- Chroma feito sobre magnitudes FFT cruas com bins lineares; baixas frequências dominam.
- Normalização por máximo (não L1/L2) → instável.
- Krumhansl-Kessler aplicado sem peso de duração — funciona, mas score raramente confiável; UI hoje não mostra confiança.
- Sem detecção robusta de modo (maior/menor) — frequentemente erra modo.

**4. Seções (`detectSections`)**
- Janelas fixas de 8 s, sem detectar fronteiras reais (novelty curve / SSM).
- Centroide por DFT naive em UMA janela de 2048 amostras no meio do segmento — custo O(N²) e ruidoso.
- Labels (`chorus`, `verse`, `bridge`) atribuídos por thresholds `1.15×avg` em energia + centroide — sem agrupamento; identifica qualquer pico como refrão.
- Não há detecção de drop/quebra (relevante para Funk/Eletrônica/Trap).

**5. Classificador de gênero (`genreClassifier.ts`)**
- Os 16 perfis hardcoded ficam todos no intervalo 0.45–0.70 em quase todas as dimensões — colapso de variância. Cosine entre faixa e perfis sai sempre ~0.96–0.99: o "score" e a "lacuna runner-up" perderam significado.
- Faltam perfis BR (Sertanejo, Forró, Pagode, Funk Carioca, Pisadinha, Trap BR) — só entram via `music_dna_benchmarks` se o catálogo já tiver ≥20 faixas do gênero.
- Ignora MFCC e Chroma, que são os melhores discriminadores de timbre e harmonia já computados.
- Loudness normalizado em 60 dB de faixa (irreal — RMS típico vive entre −20 e −5 dBFS); a feature fica saturada.

**6. Matching de referência no catálogo (`music-dna-analyze` / RPC)**
- Já usa MFCC + Chroma — bom. Mas: o cliente envia MFCC com offset SKIP_SAMPLES=2 s; faixas < 6 s caem no fallback `computeMfccChromaFromOffset` single-frame (sem CMS), o que faz a similaridade com o catálogo (multi-frame normalizado) colapsar.
- Não há pré-filtro por BPM/key antes do cosine — vizinhos de gênero totalmente diferente aparecem no topo quando o timbre coincide por acaso.

**7. Edge function `audio-analyze` (pública)**
- LUFS simplificado SEM K-weighting; True Peak SEM oversampling. Resultado diverge do cliente em ~1–3 dB, o que confunde quando o mesmo arquivo é medido por dois caminhos.

---

## Mudanças propostas

### Fase A — Features Spotify-like (impacto alto, baixo risco)

`src/lib/audioAnalysis.ts → computeSpotifyFeatures`
- Receber também `chroma`, `mfcc`, `bandwidth` e os `sections` para usar variação inter-seção.
- **valence**: combinar (a) sinal do modo (maior/menor pelo `detectKey`) → +0.15 se maior, −0.15 se menor; (b) brilho relativo (centroid/rolloff); (c) variabilidade de RMS entre seções (faixas alegres têm contraste). Resultado normalizado 0–1.
- **danceability**: substituir BPM-centro fixo por kernel triangular com 3 pivôs (75, 100, 130) cobrindo ranges BR; somar peso de "regularidade de pulso" (autocorrelação do envelope no lag detectado / energia total) e contraste de sub-band (banda 50–120 Hz).
- **energy**: passar a ser `0.45·rmsNorm + 0.25·subBandEnergy + 0.20·centroidNorm + 0.10·onsetDensity`.
- **speechiness**: usar razão entre flux espectral em 300–3 400 Hz (banda da voz) e energia total + ZCR — com piso baseado em `instrumentalness`. Decoupling claro de `instrumentalness`.
- **instrumentalness**: detectar presença de formantes via pico no centroid em torno de 500–2 500 Hz + flatness alta na banda da voz = sem voz. Independente de `speechiness`.
- **liveness**: descartar a fórmula atual (proxy ruim); usar variação de RMS por janela de 1 s e razão side/mid quando estéreo — público de show varia mais.
- Adicionar campo `_featureConfidence: Record<keyof features, "low"|"medium"|"high">` na saída (sem alterar contrato existente) para a UI poder atenuar exibições incertas no futuro.

`src/types/musicDna.ts` — sem mudança no schema persistido. Apenas funções `spotifyFeaturesFromDiagnosis` continuam idênticas.

### Fase B — BPM, key e seções

**BPM**
- Trocar envelope de energia simples por **spectral flux** (somar magnitudes positivas inter-frame em FFT 1024/hop 512) — captura batidas em material limitado.
- Autocorrelação sobre toda a faixa (envelope ~10 kB, não 2 000).
- Após pico inicial, comparar com pico em 2× e 0.5× lag: escolher o que (a) maximiza autocorr, (b) cai na faixa 65–180 BPM (zona típica de produção comercial).
- Interpolação parabólica nos 3 pontos ao redor do pico para precisão ±0.3 BPM.
- Expor `bpm_confidence` (razão pico/segundo-pico).

**Key**
- Chroma já existe (CENS multi-frame); usar **esse** chroma em vez de recomputar em `detectKey`.
- L2-normalizar antes de correlacionar com Krumhansl-Kessler.
- Reportar `key_confidence` = (corr_max − corr_runnerUp) / corr_max.
- Modo (maior/menor): comparar correlação maior vs. menor da MESMA tônica; reportar só se gap > 5%.

**Seções**
- Implementar **novelty curve** simples sobre matriz de auto-similaridade dos MFCC frame-a-frame (kernel 8×8) → picos = fronteiras candidatas.
- Filtrar para mínimo de 6 s entre fronteiras; máximo 12 seções.
- Após segmentar, **agrupar por k-medoids (k=4)** sobre [energy, centroide, onset density] → mapear cluster mais alto de energia+brilho → `chorus`, mais baixo no início → `intro`, etc. Labels mais estáveis que thresholds atuais.
- Substituir DFT naive interna por reuso do `computeSpectralMetrics` aplicado por segmento (FFT real O(N log N)).
- Detectar **drop**: queda > 6 dB de RMS por > 1 s seguida de retomada > 6 dB em < 2 s → label `drop` para Funk/Eletrônica/Trap.

### Fase C — Classificador de gênero

`src/lib/genreClassifier.ts`
- **Adicionar 8 perfis BR** calibrados a partir dos campos existentes em `GENRE_PRESETS` (`useMusicDNA.ts` linhas 170-192): Funk Carioca, Sertanejo Universitário, Sertanejo Raiz, Forró/Piseiro, Pagode, Trap BR, Rap BR, MPB Contemporânea — copiando os valores do preset e mapeando para o formato `GenreFeatureProfile`.
- **Recalibrar normalização**: spread real dos perfis precisa ficar entre 0.1 e 0.9 nas dimensões discriminadoras (energy, acousticness, instrumentalness, tempo). Hoje todos vivem em 0.45–0.70.
- Trocar **cosine** por **distância Mahalanobis simplificada** (Euclidiana com pesos inversos à variância empírica dos perfis). Features que variam pouco entre gêneros recebem peso menor; tempo e acousticness ganham mais voz.
- **Incorporar MFCC + Chroma**: somar um termo `0.3 × (1 − cosine(mfcc, perfil_mfcc))` quando o perfil tiver vetor de timbre. Inicialmente só os 8 BRs terão `mfcc_centroid`/`chroma_centroid` derivados de `music_reference_tracks`; demais ficam com peso 1.0 só nas features clássicas.
- Score final retornado em escala 0–100 com gap interpretável (≥15 pontos = classificação confiável; < 5 = "indefinido").

`src/hooks/useGenreProfiles.ts` — passar a buscar também `avg_mfcc_centroid` e `avg_chroma_centroid` quando existirem (campos a serem agregados via SQL no merge, sem migração nova nesta fase).

### Fase D — Matching de referência no catálogo

`src/hooks/useMusicDNA.ts` (lógica de neighbors) + `supabase/functions/music-dna-analyze`
- Garantir que MFCC enviado **sempre** vem do pipeline multi-frame (`computeMfccChromaMultiframe`), mesmo para faixas curtas — adaptar fallback para frames sintéticos quando < 6 s, e marcar `mfcc_source: "single_frame"` para a RPC penalizar peso.
- Adicionar pré-filtro: na RPC de vizinhos, descartar candidatos com |Δ BPM| > 20 OU key diferente (a menos que vizinhança fique < 10 faixas, então relaxa).
- Re-ranqueamento: similaridade final = `0.5·cosine(mfcc) + 0.25·cosine(chroma) + 0.15·1/(1+|ΔBPM|/10) + 0.10·1/(1+|ΔLUFS|/3)`.

### Fase E — Edge function `audio-analyze` (público)

`supabase/functions/audio-analyze/index.ts`
- Portar o **K-weighting BS.1770** (ITU/EBU) do cliente para a função (mesmos coeficientes de high-shelf + RLB calculados via bilinear) → LUFS convergente.
- Portar **True Peak com 4× oversampling Catmull-Rom** → também convergente (±0.3 dB).
- Manter saída JSON compatível; só os valores mudam (mais corretos).
- Sem novos secrets, sem novas dependências.

### Fase F — Testes e calibração

- Criar `src/lib/__tests__/audioAnalysis.calibration.test.ts` com 4–6 fixtures sintéticas (seno 1 kHz a −14 LUFS, ruído branco, click train 120 BPM, acorde C maior/menor) para travar valores esperados de LUFS, BPM, key e features.
- Criar `src/lib/__tests__/genreClassifier.test.ts` testando: tracks claramente Funk (BPM 130, energy 0.85, acousticness 0.05) → classificado como Funk Carioca com gap ≥ 15 pts; track ambígua → "indefinido".
- Adicionar `console.debug` opcional gated por `localStorage.musicDnaDebug === "1"` exibindo confiança de cada feature (sem poluir produção).

## Detalhes técnicos

Arquivos tocados:
```
src/lib/audioAnalysis.ts           — Fases A, B (maior diff)
src/lib/genreClassifier.ts          — Fase C
src/hooks/useGenreProfiles.ts       — Fase C (query)
src/hooks/useMusicDNA.ts            — integração: passa novos campos ao classifier e à RPC
supabase/functions/music-dna-analyze/index.ts — Fase D (re-rank)
supabase/functions/audio-analyze/index.ts     — Fase E (K-weighting + TP oversampling)
src/lib/__tests__/audioAnalysis.calibration.test.ts  — novo
src/lib/__tests__/genreClassifier.test.ts            — novo
```

Sem migrações de banco nesta passada. Sem novos secrets. Sem mudança de UI (a menos que você queira expor `key_confidence` / `bpm_confidence` — fica para passada seguinte).

## Ordem de implementação sugerida

1. Fase F (fixtures) — para travar baseline antes de mudar nada
2. Fase A (features Spotify-like)
3. Fase B (BPM/key/seções)
4. Fase C (classificador)
5. Fase D (matching de catálogo)
6. Fase E (edge function pública)

Cada fase pode ser entregue/validada em separado.

## Riscos

- Mudança em `computeSpotifyFeatures` altera valores persistidos em `music_dna_results` — análises antigas não serão recalculadas. Sem migração; convivem dois "regimes" no histórico (aceitável: features são sempre re-extraídas no rerun).
- Edge function `audio-analyze`: usuários públicos podem ter integrações lendo o JSON; valores LUFS/TP mudarão por ~1–3 dB (mais corretos). Documentar em `docs/06-edge-functions.md`.
- Re-rank de vizinhos pode "esconder" matches timbralmente bons mas em BPM/key diferentes — por isso o relax automático quando vizinhança < 10.
