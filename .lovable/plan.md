
# Item 1 — Crest factor no browser para destravar o matching de Dynamic Range

## Objetivo

Hoje `useMusicDNA.ts` envia `dynamic_range_db = null` para a RPC porque a métrica calculada no browser (`dynamic_range_lu`, percentis P95–P10 do LUFS short-term) está em **LU perceptual**, enquanto o catálogo (`music_reference_tracks.dynamic_range_db`) armazena **crest factor em dB** (`peak_dBFS − RMS_dBFS`). Resultado: a dimensão de dinâmica fica fora do cálculo de similaridade.

Solução: calcular **também** o crest factor no browser, em paralelo ao DR perceptual, e usar **apenas o crest factor** para alimentar a RPC. O DR perceptual continua intacto onde já é usado (UI, recomendações de mix, prompt da IA).

Sem migração de banco. Sem alteração no catálogo. Mudança isolada em frontend.

## Mudanças

### 1. `src/lib/audioAnalysis.ts`
- Adicionar função `computeCrestFactorDb(mono, sampleRate)`:
  - `peak_dbfs = 20 * log10(max(abs(mono)))` (sample peak, não true peak — alinha com a forma como o catálogo foi importado a partir do `loudness_lufs` + `alcance_dinamico_db` do CSV Sonara).
  - `rms_dbfs` já existe (`computeRmsDbfs`).
  - `crest_db = peak_dbfs − rms_dbfs`, clamp seguro `[0, 40]`.
- Adicionar campo `crest_factor_db: number` em `RealAudioAnalysis` (logo após `dynamic_range_lu`).
- Popular no objeto `real` em `analyzeAudioFull` (linha ~1177) e na variante interna (linha ~1293/1299).
- Não tocar em `dynamicRange` / `dynamic_range_lu` — continuam servindo a UI e `mixRecommendations`.

### 2. `src/hooks/useMusicDNA.ts` (linhas 758–784)
- Substituir o comentário sobre `dynamic_range_db omitido` por:
  ```ts
  dynamic_range_db: realAnalysis.crest_factor_db,
  ```
- Manter os demais campos.
- Atualizar o trecho do prompt (linha 481) opcionalmente, para mostrar os dois valores (LU perceptual + crest factor dB), deixando claro à IA que o catálogo usa crest.

### 3. `src/workers/acousticMatch.worker.ts`
- Em `toQuery` (`AcousticMatchPanel.tsx`), passar `dynamic_range_lu: analysis.crest_factor_db` para o worker — o catálogo embarcado em `acoustic-catalog/v1.json` usa `dynamic_range_db` (crest), então a comparação fica coerente. Renomear o campo no payload da `QueryFeatures` para `dynamic_range_db` seria mais limpo; alternativa mínima: manter o nome e só trocar o valor enviado.

### 4. Tipos derivados
- `src/types/musicDna.ts` (linha 141): `dynamic_range_db: diagnosis.realAnalysis.crest_factor_db` (em vez de `dynamic_range_lu`), para alinhar `SpotifyFeatures`.
- `src/components/admin/ReferenceTrackIngestor.tsx` (linha 107): trocar para `crest_factor_db` — a ingestão admin passa a gravar a métrica correta no catálogo a partir de análises browser.

### 5. Testes
- Novo teste em `src/lib/__tests__/audioAnalysis.test.ts`:
  - Sinal sintético `sin(2π·440·t) * 0.5` → RMS ≈ −9 dBFS, peak ≈ −6 dBFS → crest ≈ 3 dB.
  - Sinal `[1, 0, 0, ..., 0]` → crest alto (>30 dB), confirma clamp.
- Ajustar `mixRecommendations.test.ts` apenas se algum mock precisar do novo campo.

## Detalhes técnicos

**Por que sample peak e não true peak?**
O catálogo foi importado de um CSV que usa o crest factor convencional `peak_dBFS − RMS_dBFS` (sample peak). Usar `true_peak_dbtp` introduziria 0–1 dB de viés sistemático contra todas as faixas do catálogo.

**Por que manter `dynamic_range_lu`?**
Ele é a métrica certa para feedback ao usuário ("hiperlimitado < 7 LU"), pois reflete percepção. O crest é uma métrica de engenharia útil só para o matching com o catálogo legado.

**Escopo da mudança:** 1 função nova, 1 campo no tipo, 3 sites de uso. Sem SQL, sem edge function, sem migração.

## Validação

1. `npx vitest run src/lib/__tests__/audioAnalysis.test.ts` passa com os novos casos.
2. Análise de uma faixa real: `crest_factor_db` aparece no objeto retornado, valor entre ~6 dB (master moderno) e ~18 dB (clássica/jazz).
3. Inspecionar `track_features.dynamic_range_db` no payload enviado para `music-dna-analyze` (Network tab) — não é mais `null`.
4. `AcousticMatchPanel` continua retornando matches coerentes.

## Próximos passos (fora deste item)

- Item 4 da priorização: adicionar coluna `dynamic_range_lu` perceptual ao catálogo, permitindo no futuro usar **as duas** dimensões (perceptual + crest) no matching.
