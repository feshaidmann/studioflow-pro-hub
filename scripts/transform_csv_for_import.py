#!/usr/bin/env python3
"""
transform_csv_for_import.py

Transforma o CSV do jsp-audio-analyzer (colunas em PT-BR) para o formato
esperado pela edge function import-reference-tracks (colunas em inglês,
campos band / filename / genre obrigatórios).

Uso:
    python scripts/transform_csv_for_import.py \
        /Users/fernandoshaidmann/jsp-audio-analyzer/diagnostico_sonara_artistas.csv \
        --output /tmp/reference_tracks_import.csv

Após gerar o arquivo, faça upload em: /admin/reference-tracks
"""
from __future__ import annotations

import argparse
import ast
import csv
import os
import sys
from pathlib import Path

csv.field_size_limit(10_000_000)

# ---------------------------------------------------------------------------
# Mapeamento artista → gênero
# Cobre os ~100 artistas mais frequentes no CSV.
# Artistas não listados recebem o gênero DEFAULT_GENRE.
# ---------------------------------------------------------------------------
DEFAULT_GENRE = "Rock"

ARTIST_GENRE: dict[str, str] = {
    # ── Rock / Classic Rock ──────────────────────────────────────────────
    "Led Zeppelin": "Rock",
    "Jethro Tull": "Rock",
    "Yes": "Rock",
    "R.E.M": "Rock",
    "Rush": "Rock",
    "Pink Floyd": "Rock",
    "Jefferson Starship": "Rock",
    "Jefferson Airplane": "Rock",
    "Robert Plant": "Rock",
    "Jimi Hendrix": "Rock",
    "George Harrison": "Rock",
    "Wilco": "Rock",
    "Elvis Costello": "Rock",
    "Genesis": "Rock",
    "Neil Young": "Rock",
    "Moose": "Rock",
    "Pixies": "Rock",
    "U2": "Rock",
    "Lou Reed": "Rock",
    "Red Hot Chili Peppers": "Rock",
    "Paul McCartney": "Rock",
    "Paul McCartney & The Wings": "Rock",
    "Jimmy Page": "Rock",
    "John Lennon": "Rock",
    "Blur": "Rock",
    "Elvis Presley": "Rock",
    "XTC": "Rock",
    "Jeff Beck": "Rock",
    "Mission Of Burma": "Rock",
    "Leonard Cohen": "Folk Rock",
    "Captain Beefheart & His Magic Band": "Rock",
    "Nick Cave & The Bad Seeds": "Rock",
    "Ronnie Von": "Rock",
    "Cheap Trick": "Rock",
    "Morrissey": "Rock",
    "Coldplay": "Rock",
    "Radiohead": "Rock",
    "Blake Babies": "Rock",
    "Steely Dan": "Rock",
    "Elton John": "Pop",
    "Paul Simon": "Folk Rock",
    "Simon & Garfunkel": "Folk Rock",
    "Bob Dylan": "Folk Rock",
    "Joni Mitchell": "Folk Rock",
    "Carl Perkins": "Rock",
    "Hank Williams": "Country",
    "Roy Orbison": "Rock",
    "Merle Travis": "Country",
    "Johnny Cash": "Country",
    # ── Grunge / Alternative ─────────────────────────────────────────────
    "Sonic Youth": "Rock",
    "Mudhoney": "Rock",
    "Meat Puppets": "Rock",
    "Stone Temple Pilots": "Rock",
    "My Bloody Valentine": "Rock",
    "Cocteau Twins": "Rock",
    "Beck": "Rock",
    "Green Day": "Rock",
    "Minutemen": "Rock",
    "As Mercenárias": "Rock",
    "Grunge": "Rock",
    # ── Heavy Metal ──────────────────────────────────────────────────────
    "Sepultura": "Heavy Metal",
    "Metallica": "Heavy Metal",
    "Heavy Metal": "Heavy Metal",
    # ── Hip-Hop ──────────────────────────────────────────────────────────
    "Beastie Boys": "Hip-Hop",
    "Public Enemy": "Hip-Hop",
    "Ice Cube": "Hip-Hop",
    "Eminem": "Hip-Hop",
    # ── Jazz ─────────────────────────────────────────────────────────────
    "Relative Pitch": "Jazz",
    "George Martin": "Jazz",
    "Jazz": "Jazz",
    "Les Paul": "Jazz",
    "Ella Fitzgerald": "Jazz",
    "Oscar Peterson": "Jazz",
    "Miles Davis": "Jazz",
    "Norah Jones": "Jazz",
    "Eddie Lang _ Joe Venuti": "Jazz",
    "Gershon Kingsley": "Jazz",
    # ── Soul / R&B ───────────────────────────────────────────────────────
    "Stax-Volt Singles": "Soul",
    "Motown": "Soul",
    "Stevie Wonder": "Soul",
    "Billy Preston": "Soul",
    "Stevie Ray Vaughan": "Blues",
    "Muddy Waters": "Blues",
    "Elmore James": "Blues",
    # ── Electronic ───────────────────────────────────────────────────────
    "Kraftwerk": "Eletrônico",
    "Ladytron": "Eletrônico",
    "Synth-Pop": "Eletrônico",
    "Ambient": "Ambient",
    # ── MPB / Brasil ─────────────────────────────────────────────────────
    "CHITÃOZINHO E XORORÓ": "Sertanejo Raiz",
    "Elis Regina": "MPB Contemporânea",
    "Os Mutantes": "MPB Contemporânea",
    "Sérgio Dias": "MPB Contemporânea",
    "Made In Brazil": "MPB Contemporânea",
    "Rita Lee": "MPB Contemporânea",
    "Antonio Barra": "MPB Contemporânea",
    "Ronnie Von": "MPB Contemporânea",
    # ── Outros ───────────────────────────────────────────────────────────
    "Psychology": "Rock",
    "Literature & English Language": "Rock",
    "Religion & Theology": "Rock",
    "Professional": "Rock",
    "Various Artists": "Rock",
    "Japan Tradicional": "Rock",
}


def parse_key(tom_musical: str) -> tuple[str, str]:
    """'A minor' → ('A', 'minor') | 'C# major' → ('C#', 'major')"""
    parts = tom_musical.strip().split()
    if len(parts) >= 2 and parts[-1].lower() in ("minor", "major"):
        return " ".join(parts[:-1]), parts[-1].lower()
    return tom_musical.strip(), ""


def safe_float(v: str) -> str:
    """Retorna string numérica válida ou vazio."""
    try:
        f = float(v)
        if not (f == f):  # NaN check
            return ""
        return str(f)
    except (ValueError, TypeError):
        return ""


def transform(src: str, dst: str) -> None:
    skipped_status = 0
    skipped_empty = 0
    written = 0
    genre_counts: dict[str, int] = {}

    out_fields = [
        "band", "filename", "genre",
        "tempo_bpm", "tempo_confidence",
        "key_name", "mode",
        "energy", "danceability", "valence", "acousticness",
        "lufs_integrated", "dynamic_range_db",
        "spectral_centroid", "spectral_rolloff", "zero_crossing_rate",
    ]

    with open(src, encoding="utf-8-sig") as fin, \
         open(dst, "w", encoding="utf-8", newline="") as fout:

        reader = csv.DictReader(fin)
        writer = csv.DictWriter(fout, fieldnames=out_fields, extrasaction="ignore")
        writer.writeheader()

        for raw in reader:
            status = raw.get("status_analise", "").strip()
            if status == "falha_total":
                skipped_status += 1
                continue

            artista = raw.get("artista", "").strip()
            arquivo = raw.get("arquivo", "").strip()
            if not artista or not arquivo:
                skipped_empty += 1
                continue

            filename = Path(arquivo).name
            genre = ARTIST_GENRE.get(artista, DEFAULT_GENRE)
            key_name, mode = parse_key(raw.get("tom_musical", ""))

            row = {
                "band": artista,
                "filename": filename,
                "genre": genre,
                "tempo_bpm": safe_float(raw.get("bpm", "")),
                "tempo_confidence": safe_float(raw.get("confianca_tom", "")),
                "key_name": key_name,
                "mode": mode,
                "energy": safe_float(raw.get("energia", "")),
                "danceability": safe_float(raw.get("dancabilidade", "")),
                "valence": safe_float(raw.get("sentimento_valence", "")),
                "acousticness": safe_float(raw.get("acousticidade", "")),
                "lufs_integrated": safe_float(raw.get("loudness_lufs", "")),
                "dynamic_range_db": safe_float(raw.get("alcance_dinamico_db", "")),
                "spectral_centroid": safe_float(raw.get("centroide_espectral_hz", "")),
                "spectral_rolloff": safe_float(raw.get("rolloff_espectral_hz", "")),
                "zero_crossing_rate": safe_float(raw.get("zero_crossing_rate", "")),
            }
            writer.writerow(row)
            written += 1
            genre_counts[genre] = genre_counts.get(genre, 0) + 1

    print(f"\n✓ Concluído: {written} faixas escritas")
    print(f"  Pulados (falha_total): {skipped_status}")
    print(f"  Pulados (artista/arquivo vazio): {skipped_empty}")
    print(f"\n  Distribuição por gênero:")
    for g, n in sorted(genre_counts.items(), key=lambda x: -x[1]):
        print(f"    {n:5d}  {g}")
    print(f"\n  Arquivo gerado: {dst}")
    print(f"\n  Próximo passo: faça upload em /admin/reference-tracks")


def main() -> None:
    parser = argparse.ArgumentParser(description="Transforma CSV de análise para o formato de import")
    parser.add_argument("input", help="Caminho do CSV de entrada (diagnostico_sonara_artistas.csv)")
    parser.add_argument("--output", default="/tmp/reference_tracks_import.csv",
                        help="Caminho do CSV de saída (padrão: /tmp/reference_tracks_import.csv)")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Arquivo não encontrado: {args.input}", file=sys.stderr)
        sys.exit(1)

    transform(args.input, args.output)


if __name__ == "__main__":
    main()
