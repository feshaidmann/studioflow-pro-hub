## Objetivo

Exibir, no card "Mapa timbral (UMAP do banco de referência)", a lista das 13 features usadas para projetar a faixa, para que o usuário entenda o que está sendo comparado.

## Mudança

Arquivo: `src/components/music-dna/TimbralMap.tsx`

- Após o `<svg>`, adicionar um bloco discreto (texto pequeno, `text-muted-foreground`) com a lista de dimensões obtidas de `data.scaler.features`.
- Traduzir os nomes técnicos para rótulos legíveis em pt-BR via um pequeno mapa local:
  - `lufs_integrated` → "LUFS integrado"
  - `dynamic_range_db` → "Faixa dinâmica (dB)"
  - `spectral_centroid` → "Centroide espectral"
  - `spectral_rolloff` → "Rolloff espectral"
  - `spectral_bandwidth` → "Largura de banda"
  - `zero_crossing_rate` → "Zero-crossing rate"
  - `tempo_bpm` → "Andamento (BPM)"
  - `mfcc_1..mfcc_6` → "MFCC 1–6" (agrupados em um único chip)
- Quando houver features imputadas (`userResult.missing`), marcar visualmente esses rótulos (ex.: opacidade reduzida + título "imputado") para reforçar a mensagem já existente.
- Renderizar como chips/badges leves (sem novos componentes pesados, apenas `span` com classes Tailwind do design system).

Sem mudanças em lógica de projeção, dados, schema ou em outros componentes.

## Fora de escopo

- Alterar o pipeline Python (`scripts/build_reference_projection.py`).
- Mudar pesos/projeção/UMAP.
- Adicionar tooltip explicativo por dimensão (pode entrar depois se necessário).