#!/usr/bin/env python3
"""
import_csv_reference_tracks.py

Importa um CSV de análise musical (gerado pelo jsp-audio-analyzer) para a
tabela music_reference_tracks no Supabase.

Uso:
    python scripts/import_csv_reference_tracks.py caminho/para/analise.csv \
        --genre "Jazz" \
        --batch "miles-davis-2026"

    # Ver o que seria inserido sem gravar:
    python scripts/import_csv_reference_tracks.py analise.csv --genre "Jazz" --dry-run

Requer:
    pip install supabase python-dotenv

Variáveis de ambiente (.env):
    SUPABASE_URL            — já configurada no .env do projeto
    SUPABASE_SERVICE_ROLE_KEY  — obtenha em: Supabase dashboard → Project Settings → API → service_role

Atenção sobre o mfcc_media:
    O CSV contém mfcc_media (média escalar). O script armazena como mfcc=[valor],
    mas o build_reference_projection.py usa mfcc[1..6] para o UMAP — pontos
    importados via CSV ficam fora da projeção enquanto você não re-analisar os
    arquivos com librosa para extrair o vetor completo.

Após o import, atualize o Timbral Map:
    python scripts/build_reference_projection.py
"""
from __future__ import annotations

import argparse
import ast
import csv
import json
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # .env já pode estar no ambiente

try:
    from supabase import create_client, Client
except ImportError:
    print("Instale as dependências: pip install supabase python-dotenv", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def parse_key(tom_musical: str) -> tuple[str | None, str | None]:
    """
    'A minor' → ('A', 'minor')
    'C# major' → ('C#', 'major')
    'Bb' → ('Bb', None)
    """
    if not tom_musical:
        return None, None
    parts = tom_musical.strip().rsplit(" ", 1)
    if len(parts) == 2 and parts[1].lower() in ("minor", "major"):
        return parts[0], parts[1].lower()
    return parts[0], None


def parse_chord_sequence(raw: str) -> list[str] | None:
    """
    Converte a string Python de lista para lista de strings.
    "['Gm', 'Dm', 'F']" → ['Gm', 'Dm', 'F']
    """
    if not raw or raw.strip() in ("", "[]", "None"):
        return None
    try:
        result = ast.literal_eval(raw.strip())
        if isinstance(result, list):
            return [str(c) for c in result]
    except (ValueError, SyntaxError):
        pass
    return None


def safe_float(value: str | None) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Row builder
# ---------------------------------------------------------------------------

def build_row(row: dict, genre: str, batch: str) -> dict:
    filename = Path(row.get("arquivo", "")).name or row.get("arquivo", "").strip()
    band = (row.get("artista") or "").strip()
    key_name, mode = parse_key(row.get("tom_musical", ""))
    mfcc_val = safe_float(row.get("mfcc_media"))
    chord_seq = parse_chord_sequence(row.get("sequencia_acordes", ""))

    record: dict = {
        "band": band,
        "filename": filename,
        "genre": genre,
        "source_batch": batch,
        # Ritmo e tonalidade
        "tempo_bpm": safe_float(row.get("bpm")),
        "tempo_confidence": safe_float(row.get("confianca_tom")),
        "key_name": key_name,
        "mode": mode,
        # Características de áudio
        "energy": safe_float(row.get("energia")),
        "danceability": safe_float(row.get("dancabilidade")),
        "valence": safe_float(row.get("sentimento_valence")),
        "acousticness": safe_float(row.get("acousticidade")),
        # Loudness e dinâmica
        "lufs_integrated": safe_float(row.get("loudness_lufs")),
        "lufs_method": "integrated",
        "dynamic_range_db": safe_float(row.get("alcance_dinamico_db")),
        # Espectral
        "spectral_centroid": safe_float(row.get("centroide_espectral_hz")),
        "spectral_rolloff": safe_float(row.get("rolloff_espectral_hz")),
        "zero_crossing_rate": safe_float(row.get("zero_crossing_rate")),
    }

    # mfcc armazenado como array de 1 elemento enquanto o vetor completo
    # não está disponível. O UMAP ignora faixas com mfcc de tamanho < 7.
    if mfcc_val is not None:
        record["mfcc"] = [mfcc_val]

    # sequencia_acordes e dissonancia: não existem na tabela atual.
    # Se você criar uma migration adicionando essas colunas, descomente:
    #
    # if chord_seq:
    #     record["chord_sequence"] = chord_seq  # coluna: text[]
    # dissonance = safe_float(row.get("dissonancia"))
    # if dissonance is not None:
    #     record["dissonance"] = dissonance       # coluna: numeric

    # Remove Nones para não sobrescrever campos existentes com NULL no upsert
    return {k: v for k, v in record.items() if v is not None}


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def detect_separator(path: str) -> str:
    with open(path, encoding="utf-8-sig") as f:
        sample = f.read(4096)
    return ";" if sample.count(";") > sample.count(",") else ","


def read_csv(path: str) -> tuple[list[dict], str]:
    sep = detect_separator(path)
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=sep)
        rows = list(reader)
    # Remove colunas fantasmas (colunas em branco que surgem de trailing `;` ou `,`)
    cleaned = []
    for row in rows:
        cleaned.append({k: v for k, v in row.items() if k and k.strip()})
    return cleaned, sep


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Importa CSV de análise para music_reference_tracks"
    )
    parser.add_argument("csv_path", help="Caminho para o arquivo CSV")
    parser.add_argument(
        "--genre",
        required=True,
        help='Gênero musical das faixas. Ex: "Jazz", "MPB", "Rock", "Samba"',
    )
    parser.add_argument(
        "--batch",
        default="csv-import",
        help="Identificador do lote (source_batch). Útil para rastrear origem.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Exibe os registros que seriam inseridos sem gravar no banco",
    )
    args = parser.parse_args()

    # Conexão
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    # Service role ignora RLS — necessário para INSERT em music_reference_tracks
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not args.dry_run:
        if not url:
            print("SUPABASE_URL não encontrada no .env", file=sys.stderr)
            sys.exit(1)
        if not key:
            print(
                "SUPABASE_SERVICE_ROLE_KEY não encontrada no .env\n"
                "Obtenha em: Supabase Dashboard → Project Settings → API → service_role",
                file=sys.stderr,
            )
            sys.exit(1)

    # Leitura
    rows_raw, sep = read_csv(args.csv_path)
    print(f"Separador detectado: '{sep}' | {len(rows_raw)} linhas lidas")

    # Build
    records = []
    skipped = []
    for i, row in enumerate(rows_raw, start=2):
        band = (row.get("artista") or "").strip()
        filename = Path(row.get("arquivo", "")).name
        if not band or not filename:
            skipped.append((i, band or "(sem artista)", filename or "(sem arquivo)"))
            continue
        records.append(build_row(row, args.genre, args.batch))

    if skipped:
        print(f"\n{len(skipped)} linhas puladas (artista ou arquivo vazios):")
        for lineno, band, fn in skipped[:10]:
            print(f"  linha {lineno}: artista='{band}' arquivo='{fn}'")
        if len(skipped) > 10:
            print(f"  ... e mais {len(skipped) - 10}")

    print(f"\n{len(records)} registros prontos para inserção no genre='{args.genre}' batch='{args.batch}'")

    # Dry run
    if args.dry_run:
        print("\n--- DRY RUN (primeiros 3 registros) ---")
        for r in records[:3]:
            print(json.dumps(r, ensure_ascii=False, indent=2))
        print("\n[Nenhum dado foi gravado]")
        return

    # Insert
    supabase: Client = create_client(url, key)

    CHUNK = 50
    inserted = 0
    errors = 0

    for i in range(0, len(records), CHUNK):
        chunk = records[i : i + CHUNK]
        chunk_num = i // CHUNK + 1
        total_chunks = (len(records) + CHUNK - 1) // CHUNK
        print(f"  Inserindo chunk {chunk_num}/{total_chunks} ({len(chunk)} registros)...", end=" ")
        try:
            resp = (
                supabase.table("music_reference_tracks")
                .upsert(chunk, on_conflict="band,filename")
                .execute()
            )
            count = len(resp.data) if resp.data else 0
            inserted += count
            print(f"ok ({count})")
        except Exception as exc:
            errors += len(chunk)
            print(f"ERRO: {exc}")

    print(f"\nConcluído: {inserted} inseridos/atualizados, {errors} com erro")

    if inserted > 0:
        print(
            "\nPróximos passos:\n"
            "  1. (Opcional) Adicione a coluna genre aos registros se quiser refinar.\n"
            "  2. Regere o Timbral Map:\n"
            "     python scripts/build_reference_projection.py\n"
            "\nNota: faixas com mfcc de tamanho < 7 são ignoradas pelo UMAP.\n"
            "Para incluí-las na projeção, re-analise os arquivos com librosa\n"
            "e atualize a coluna mfcc[] com o vetor completo."
        )


if __name__ == "__main__":
    main()
