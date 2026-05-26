# Corrigir "Faltam features para posicionar a faixa no mapa"

## Causa raiz

O `TimbralMap` consome um modelo UMAP de **13 dimensões** (definidas no `reference_projection.json`):
`lufs_integrated, dynamic_range_db, spectral_centroid, spectral_rolloff, spectral_bandwidth, zero_crossing_rate, tempo_bpm, mfcc_1..6`.

`buildUserVector` retorna `null` se **qualquer** dessas features estiver faltando — e duas coisas conspiram para isso acontecer sempre:

1. **`MusicDNAAnalyzer.tsx` (linhas 1691–1699)** só envia 4 das 13 features ao `<TimbralMap user={…}>`, mesmo quando o `realAnalysis` já contém `mfcc` e `spectral_rolloff_hz`.
2. **Cliente Web Audio não extrai** `spectral_bandwidth` nem `zero_crossing_rate`.

Resultado: 100% das análises caem no fallback "Faltam features".

## Mudanças

### 1. Repassar todas as features disponíveis (`MusicDNAAnalyzer.tsx`)

No `<TimbralMap user={…}>`, adicionar `mfcc`, `spectral_rolloff` e (quando o servidor retornar) `spectral_bandwidth` e `zero_crossing_rate`:

```ts
<TimbralMap
  user={{
    lufs_integrated: realAnalysis.lufs_integrated,
    dynamic_range_db: realAnalysis.dynamic_range_lu,
    spectral_centroid: realAnalysis.spectral_centroid_hz,
    spectral_rolloff: realAnalysis.spectral_rolloff_hz,
    spectral_bandwidth: realAnalysis.spectral_bandwidth_hz, // se existir
    zero_crossing_rate: realAnalysis.zero_crossing_rate,    // se existir
    tempo_bpm: typeof realAnalysis.bpm === "number" ? realAnalysis.bpm : undefined,
    mfcc: realAnalysis.mfcc, // array de 13 coeficientes
  }}
/>
```

### 2. Imputação por média no `buildUserVector` (`TimbralMap.tsx`)

Em vez de retornar `null` na primeira feature ausente, imputar com a **média do scaler** (`data.scaler.mean[i]`) — assim o valor padronizado vira `0` (centro do dataset) e não distorce a projeção. Definir um **mínimo de cobertura** (ex.: ≥ 8 das 13 features presentes) para evitar projetar faixas sem nenhuma informação:

```ts
function buildUserVector(user, features, mean) {
  const out = []; let present = 0;
  for (let i = 0; i < features.length; i++) {
    const name = features[i];
    let v = /* extração + clip/log atual */;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      v = mean[i]; // imputação → z = 0
    } else {
      present++;
    }
    out.push(v);
  }
  return present >= 8 ? out : null;
}
```

Atualizar `userPoint` para passar `data.scaler.mean` e ajustar o fallback de UI para diferenciar:
- **0 features** → "Faltam features para posicionar a faixa no mapa." (mantém)
- **Parcial mas imputado** → ponto exibido com um aviso discreto: *"Projeção aproximada — algumas features não foram extraídas."*

### 3. (Opcional, fora deste plano) Cobertura completa

Para extrair `spectral_bandwidth` e `zero_crossing_rate` no cliente seria necessário ampliar `src/lib/audioAnalysis.ts`. Como `bandwidth` é trivial (segundo momento do espectro) e `ZCR` é trivial (cruzamentos por zero do sinal no tempo), pode virar uma issue separada — não bloqueia o fix acima.

## Arquivos

- `src/components/music-dna/MusicDNAAnalyzer.tsx` — completar `user` do `TimbralMap`
- `src/components/music-dna/TimbralMap.tsx` — imputação por média + ajuste do fallback de UI

## Fora de escopo

- Re-treinar/regerar `reference_projection.json`
- Adicionar bandwidth/ZCR ao extractor cliente
- Mexer em outras seções da análise
