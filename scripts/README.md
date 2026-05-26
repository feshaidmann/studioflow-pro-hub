# scripts/

Scripts utilitários executados manualmente (não fazem parte do build).

## `build_reference_projection.py`

Regenera `public/data/reference_projection.json` (alimenta o `TimbralMap` do
DNA Musical) a partir de `public.music_reference_tracks`.

- Algoritmo: UMAP 2D + KMeans (k=8) sobre features espectrais clássicas
  (LUFS, dynamic range, centroid, rolloff, bandwidth, ZCR, BPM, MFCC[1..6]).
- Saída: JSON v2 com `scaler`, matriz `z` padronizada das referências, e
  pontos `{x, y, g, c}`. O cliente projeta o ponto do usuário via k-NN no
  espaço padronizado (UMAP não tem transformação fechada como o PCA).

Execução:

```bash
python -m pip install --no-cache-dir umap-learn scikit-learn psycopg2-binary numpy
python scripts/build_reference_projection.py
```

Requer `SUPABASE_DB_URL` (ou variáveis `PG*` padrão) no ambiente. Rodar
sempre que houver mudanças significativas no banco de referências.
