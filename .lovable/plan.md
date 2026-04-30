# Tolerância de ±1 dB no True Peak

## Contexto

Hoje o True Peak é avaliado de forma rígida em `−1 dBTP`:
- `≤ −1 dBTP` → OK
- `> −1 dBTP` → reprovado / sugere ajuste
- `> 0 dBTP` → crítico (clipping)

A regra nova introduz uma **zona de tolerância de ±1 dB** em torno do alvo de `−1 dBTP`, ou seja, valores entre `−2 dBTP` e `0 dBTP` são considerados aceitáveis (com aviso quando passam de `−1`), e só viram reprovação acima de `0 dBTP`.

## Nova régua de avaliação

| Faixa de True Peak (dBTP) | Status | Mensagem |
|---|---|---|
| `≤ −1` | OK ✓ | Dentro do alvo seguro (≤ −1 dBTP). |
| `> −1` e `≤ 0` | OK com ressalva (tolerância ±1 dB) | Acima do alvo, mas dentro da tolerância de ±1 dB. Monitore o limiter. |
| `> 0` | Crítico | Clipping após normalização. Reduzir ceiling do limiter. |

A constante `TRUE_PEAK_TOLERANCE_DB = 1` será centralizada em `src/lib/audioAnalysis.ts` e reutilizada em todos os pontos abaixo.

## Arquivos afetados

1. **`src/lib/audioAnalysis.ts`** (≈ linha 700)
   - Substituir o `if/else` binário por três faixas (OK / tolerância / crítico) usando a constante.

2. **`src/components/MasterAnalyzerModal.tsx`** (linhas 127-130 e 240)
   - `isSpotifyReady`: aceitar `truePeak ≤ 0` (alvo `−1` + tolerância `1`) em vez de `≤ −1`.
   - Quando `truePeak` estiver em `(−1, 0]`, mostrar badge "Dentro da tolerância" (sem bloquear o upload), mantendo crítico apenas para `> 0`.
   - Ajustar `RadialGauge` do True Peak para refletir a zona de tolerância visualmente (target continua `−1`, mas o "limite vermelho" passa a ser `0`).

3. **`src/components/music-dna/MusicDNAAnalyzer.tsx`** (linhas 296-300)
   - `status` "Pronta para streaming" passa a aceitar `truePeak ≤ 0` (em vez de `≤ −1`).
   - "Precisa revisão técnica" continua disparando apenas com `truePeak > 0` (já era o caso) ou `dynamicRange < 5`.

4. **`src/hooks/useMusicDNA.ts`** (linhas 196-200)
   - Reescrever `tpStatus` em três níveis:
     - `> 0` → CRÍTICO (mantém texto atual sobre clipping pós-normalização)
     - `> −1` e `≤ 0` → "Dentro da tolerância de ±1 dB. Acima do alvo (−1 dBTP) mas seguro para a maioria dos codecs. Monitore o ceiling do limiter."
     - `≤ −1` → OK (texto atual)

5. **`src/pages/Projects.tsx`** (linha 755)
   - Cor do valor do Peak: `success` quando `≤ −1`, `warning` quando `> −1` e `≤ 0`, `destructive` quando `> 0`.

## Detalhe técnico

```ts
// src/lib/audioAnalysis.ts
export const TRUE_PEAK_TARGET_DBTP = -1;
export const TRUE_PEAK_TOLERANCE_DB = 1;
export const TRUE_PEAK_MAX_DBTP = TRUE_PEAK_TARGET_DBTP + TRUE_PEAK_TOLERANCE_DB; // 0

export type TruePeakStatus = "ok" | "tolerance" | "critical";
export function evaluateTruePeak(dbtp: number): TruePeakStatus {
  if (dbtp > TRUE_PEAK_MAX_DBTP) return "critical";
  if (dbtp > TRUE_PEAK_TARGET_DBTP) return "tolerance";
  return "ok";
}
```

Todos os pontos acima passam a importar `evaluateTruePeak` em vez de duplicar comparações com literais `-1` / `0`.

## Fora do escopo

- Não altera a medição de True Peak no edge function `audio-analyze` (apenas a interpretação do valor).
- Não muda a tolerância de LUFS nem de Dynamic Range.
- Não toca em benchmarks históricos nem em `music_reference_tracks`.

## Plano de validação

- Mock manual de três valores no `MasterAnalyzerModal`: `−1.5` (OK verde), `−0.4` (warning amarelo, upload liberado), `+0.6` (crítico vermelho, upload bloqueado/aviso).
- Conferir que o resumo executivo do `MusicDNAAnalyzer` muda de "Pronta para streaming" para o estado intermediário e não mais para "Precisa revisão técnica" no caso de `−0.4 dBTP`.
- Conferir cor do badge na lista de projetos (`Projects.tsx`).
