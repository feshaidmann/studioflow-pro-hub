#!/usr/bin/env python3
"""
Gera public/data/reference_projection.json para o componente TimbralMap.

Pipeline:
  1. Lê faixas não-quarentenadas de public.music_reference_tracks com features
     espectrais clássicas (lufs, dynamic range, centroid, rolloff, bandwidth,
     zcr, tempo, mfcc[1..6]).
  2. Aplica clip/log onde indicado e padroniza (z-score).
  3. Roda UMAP 2D (determinístico via random_state).
  4. Roda KMeans (k=8) sobre as coords UMAP para colorir clusters.
  5. Persiste scaler + matriz Z padronizada + pontos UMAP no JSON v2.

Como executar:
    python -m pip install --no-cache-dir umap-learn scikit-learn psycopg2-binary numpy
    python scripts/build_reference_projection.py

Conexão: usa $SUPABASE_DB_URL ou os PG* envs padrão.
"""
from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import psycopg2
import psycopg2.extras
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import umap

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "reference_projection.json"

# Ordem das features no vetor de saída. mfcc_1..6 são preenchidos depois.
SCALAR_FEATURES = [
    ("lufs_integrated",    {"clip": (-30, -5)}),
    ("dynamic_range_db",   {"clip": (0, 30)}),
    ("spectral_centroid",  {"log": True}),
    ("spectral_rolloff",   {"log": True}),
    ("spectral_bandwidth", {"log": True}),
    ("zero_crossing_rate", {}),
    ("tempo_bpm",          {"clip": (50, 200)}),
]
MFCC_COEFS = list(range(1, 7))  # mfcc[1..6], descarta coef 0 (energia)
N_CLUSTERS = 8
UMAP_PARAMS = dict(n_neighbors=25, min_dist=0.15, metric="euclidean", random_state=42)


def get_conn():
    # client_encoding explicito porque o pooler do Supabase (modo transaction)
    # não retorna o parâmetro no startup e o psycopg2 rejeita a conexão.
    url = os.environ.get("SUPABASE_DB_URL")
    if url:
        return psycopg2.connect(url, client_encoding="UTF8")
    return psycopg2.connect(client_encoding="UTF8")


def fetch_rows():
    sql = """
        SELECT band, genre,
               lufs_integrated, dynamic_range_db,
               spectral_centroid, spectral_rolloff, spectral_bandwidth,
               zero_crossing_rate, tempo_bpm, mfcc
          FROM public.music_reference_tracks
         WHERE quarantined = false
           AND lufs_integrated   IS NOT NULL
           AND dynamic_range_db  IS NOT NULL
           AND spectral_centroid IS NOT NULL
           AND spectral_rolloff  IS NOT NULL
           AND spectral_bandwidth IS NOT NULL
           AND zero_crossing_rate IS NOT NULL
           AND tempo_bpm         IS NOT NULL
           AND mfcc              IS NOT NULL
           AND array_length(mfcc, 1) >= 7
    """
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.execute(sql)
        return cur.fetchall()


def build_feature_matrix(rows):
    feature_names: list[str] = []
    for name, _ in SCALAR_FEATURES:
        feature_names.append(name)
    for c in MFCC_COEFS:
        feature_names.append(f"mfcc_{c}")

    X = np.zeros((len(rows), len(feature_names)), dtype=np.float64)
    genres: list[str] = []

    for i, r in enumerate(rows):
        col = 0
        for name, opts in SCALAR_FEATURES:
            v = float(r[name])
            if "clip" in opts:
                lo, hi = opts["clip"]
                v = max(lo, min(hi, v))
            if opts.get("log"):
                v = math.log(max(v, 1.0))
            X[i, col] = v
            col += 1
        mfcc = r["mfcc"]
        for c in MFCC_COEFS:
            X[i, col] = float(mfcc[c])
            col += 1
        genres.append(r["genre"] or "")
    return feature_names, X, genres


def main():
    print("Carregando faixas...", flush=True)
    rows = fetch_rows()
    print(f"  {len(rows)} faixas elegíveis", flush=True)
    if len(rows) < 100:
        print("Amostra muito pequena para UMAP confiável. Abortando.", file=sys.stderr)
        sys.exit(1)

    feature_names, X, genres = build_feature_matrix(rows)
    print(f"Features ({len(feature_names)}): {feature_names}", flush=True)

    scaler = StandardScaler()
    Z = scaler.fit_transform(X)

    print("Rodando UMAP...", flush=True)
    reducer = umap.UMAP(**UMAP_PARAMS)
    coords = reducer.fit_transform(Z)

    print(f"Rodando KMeans (k={N_CLUSTERS})...", flush=True)
    km = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
    clusters = km.fit_predict(coords)

    points = [
        {
            "x": round(float(coords[i, 0]), 3),
            "y": round(float(coords[i, 1]), 3),
            "g": genres[i],
            "c": int(clusters[i]),
        }
        for i in range(len(rows))
    ]

    z_compact = [[round(float(v), 3) for v in row] for row in Z]

    payload = {
        "version": 2,
        "method": "umap",
        "scaler": {
            "features": feature_names,
            "mean": [round(float(m), 6) for m in scaler.mean_.tolist()],
            "scale": [round(float(s), 6) for s in scaler.scale_.tolist()],
        },
        "umap": {
            "n_neighbors": UMAP_PARAMS["n_neighbors"],
            "min_dist": UMAP_PARAMS["min_dist"],
            "seed": UMAP_PARAMS["random_state"],
        },
        "clusters": {"k": N_CLUSTERS},
        "z": z_compact,
        "points": points,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"OK: {OUTPUT_PATH} ({size_kb:.1f} KB, {len(points)} pontos)", flush=True)


if __name__ == "__main__":
    main()
