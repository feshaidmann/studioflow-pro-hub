#!/usr/bin/env python3
"""
normalize_artist_genres.py

Lê artistas_generos_enriquecido_2.csv, mescla genero_musical + genero_api,
normaliza gêneros para pt-BR e gera:

  1. /tmp/artista_genero_normalizado.csv  — referência completa
  2. Imprime o dicionário ARTIST_GENRE atualizado para copiar em
     scripts/transform_csv_for_import.py
  3. Imprime SQL UPDATE para atualizar music_reference_tracks no Supabase

Uso:
    python scripts/normalize_artist_genres.py \
        /Users/fernandoshaidmann/Desktop/artistas_generos_enriquecido_2.csv \
        [--output /tmp/artista_genero_normalizado.csv]
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

csv.field_size_limit(10_000_000)

# ─── Status a pular ────────────────────────────────────────────────────────────
SKIP_STATUS = {"❌ Não encontrado"}

# ─── Tags a ignorar (categorias que não são gêneros musicais) ──────────────────
SKIP_TAGS: set[str] = {
    "podcast", "radio show", "ear training", "hemi-sync",
    "cd", "remaster", "other", "music", "projecto y",
    "notes make the man", "1* part of it all",
    # nomes de bandas / artistas já tratados abaixo
}

# ─── Artistas-como-tag → gênero real ───────────────────────────────────────────
ARTIST_TAG_MAP: dict[str, str] = {
    "jimmy page":               "Rock",
    "led zeppelin":             "Rock",
    "led zeppelin out takes":   "Rock",
    "jethro tull":              "Rock",
    "robert plant":             "Rock",
    "john paul jones":          "Rock",
    "rush":                     "Rock Progressivo",
    "yes":                      "Rock Progressivo",
    "r.e.m.":                   "Rock Alternativo",
    "r.e.m":                    "Rock Alternativo",
    "os mutantes":              "MPB",
    "sérgio dias":              "MPB",
    "jefferson airplane":       "Rock Psicodélico",
    "sinatra":                  "Jazz/Swing",
    "ttc":                      "Hip-Hop",
}

# ─── Normalização de tokens brutos → gênero pt-BR ──────────────────────────────
# Chave: token em minúsculas (sem espaços extras). Valor: gênero canônico.
GENRE_NORM: dict[str, str] = {
    # Rock
    "rock":                     "Rock",
    "hardrock":                 "Hard Rock",
    "hard rock":                "Hard Rock",
    "alternative":              "Rock Alternativo",
    "alternative rock":         "Rock Alternativo",
    "alternativerock":          "Rock Alternativo",
    "indie rock":               "Rock Alternativo",
    "indierock":                "Rock Alternativo",
    "prog-rock":                "Rock Progressivo",
    "progressive rock":         "Rock Progressivo",
    "progressiverock":          "Rock Progressivo",
    "progressive":              "Rock Progressivo",
    "art rock":                 "Art Rock",
    "artrock":                  "Art Rock",
    "krautrock":                "Krautrock",
    "psychedelic":              "Rock Psicodélico",
    "psychedelic rock":         "Rock Psicodélico",
    "blues-rock":               "Blues Rock",
    "blues rock":               "Blues Rock",
    "bluesrock":                "Blues Rock",
    "shoegaze":                 "Shoegaze",
    "grunge":                   "Grunge",
    "britpop":                  "Britpop",
    "punk":                     "Punk",
    "punk rock":                "Punk",
    "rockabilly":               "Rockabilly",
    "psychobilly":              "Rockabilly",
    "surf":                     "Rock",
    "garage":                   "Rock",
    "indie":                    "Indie",
    "alternative indie":        "Indie",
    "new wave":                 "New Wave",
    "post-punk":                "New Wave",
    "freakbeat":                "Rock",
    "mod":                      "Rock",
    "beat":                     "Rock",
    # Heavy
    "heavy metal":              "Heavy Metal",
    "metal":                    "Heavy Metal",
    "hardcore":                 "Punk",
    # Blues
    "blues":                    "Blues",
    "rnb":                      "R&B",
    "r&b":                      "R&B",
    "soul":                     "Soul",
    "funk":                     "Soul/Funk",
    "motown":                   "Soul",
    "stax":                     "Soul",
    # Jazz
    "jazz":                     "Jazz",
    "jazz pop":                 "Jazz",
    "bossa nova":               "Bossa Nova",
    "swing":                    "Jazz/Swing",
    # Pop
    "pop":                      "Pop",
    "disco":                    "Disco",
    "dance":                    "Eletrônico",
    "synthpop":                 "Eletrônico",
    "synth":                    "Eletrônico",
    "synth-pop":                "Eletrônico",
    "easy listening":           "Easy Listening",
    "oldies":                   "Oldies",
    # Hip-Hop
    "hip-hop":                  "Hip-Hop",
    "hip hop":                  "Hip-Hop",
    "rap":                      "Hip-Hop/Rap",
    # Eletrônico
    "electronic":               "Eletrônico",
    "electroacoustic":          "Eletrônico",
    "electronica":              "Eletrônico",
    "experimental":             "Experimental",
    "experimental electronic":  "Eletrônico",
    "ambient":                  "Ambient",
    "chillout":                 "Ambient",
    "house":                    "House",
    "techno":                   "Eletrônico",
    "jungle":                   "Eletrônico",
    "historia musica eletronica": "Eletrônico",
    # Folk / Country
    "folk":                     "Folk",
    "singer/songwriter":        "Singer/Songwriter",
    "folk rock":                "Folk",
    "acoustic":                 "Instrumental",
    "fingerstyle":              "Instrumental",
    "guitar":                   "Instrumental",
    "bass":                     "Instrumental",
    "instrumental":             "Instrumental",
    "orchestral":               "Clássico",
    "composer":                 "Clássico",
    "classical":                "Clássico",
    "country":                  "Country",
    "countrypop":               "Country",
    # Reggae / World
    "reggae":                   "Reggae",
    "world":                    "World Music",
    "african":                  "World Music",
    "latin":                    "World Music",
    "raga":                     "Música Indiana",
    "qawwali":                  "Música Sufi",
    "sufi":                     "Música Sufi",
    "tropicalia":               "MPB",
    "tropicália":               "MPB",
    # Brasil
    "brasil":                   "MPB",
    "brazil":                   "",     # indicador de país, não gênero
    "brazilian":                "",     # indicador de país, não gênero
    "mpb":                      "MPB",
    "sertanejas":               "Sertanejo",
    "sertanejo":                "Sertanejo",
    # Soundtrack / especial
    "soundtrack":               "Trilha Sonora",
    "game":                     "Trilha Sonora",
    "japanese":                 "Trilha Sonora",
    # Décadas (sem gênero específico → usa genero_api para refinar)
    "50's":                     "Oldies",
    "70's":                     "",          # resolver via api
    "90's":                     "",          # resolver via api
    # Países como tag (usar api)
    "french":                   "Chanson Francesa",
    "chanson":                  "Chanson Francesa",
    "french chanson":           "Chanson Francesa",
    "frança":                   "Chanson Francesa",
    "italia":                   "Rock Progressivo",   # contexto prog-rock italiano
    "italian":                  "Rock Progressivo",
    # Misc
    "slowcore":                 "Rock Alternativo",
    "sadcore":                  "Rock Alternativo",
    "experimental rock":        "Rock Alternativo",
    "canadian":                 "",   # não é gênero — ignorar
    "british":                  "",
    "american":                 "",
    "australian":               "",
    "usa":                      "",
    "legend":                   "",
    "everything":               "",
    "tzadik":                   "",
    "educational":              "",
    "science":                  "",
    "vocal":                    "",
    "pop, jazz pop, singer/songwriter": "Singer/Songwriter",
    "oldies; swing; crooners":  "Jazz/Swing",
    "crooners":                 "Jazz/Swing",
}

# ─── Prioridade de gênero: quando há múltiplos, prefere-se este ────────────────
GENRE_PRIORITY = [
    # Gêneros específicos têm prioridade sobre os genéricos
    # Brasileiros específicos
    "Sertanejo", "Bossa Nova",
    # Regional único (deve vencer Jazz/Blues para artistas como Piaf, Fela, etc.)
    "Chanson Francesa", "Música Indiana", "Música Sufi", "Reggae",
    # Blues e raízes
    "Blues", "Blues Rock",
    # Jazz
    "Jazz", "Jazz/Swing",
    # Soul / R&B / Funk
    "Soul", "Soul/Funk", "R&B", "Motown",
    # Hip-Hop
    "Hip-Hop/Rap",
    # World genérico
    "World Music",
    # Rock subgêneros (do mais específico ao mais genérico)
    "Heavy Metal", "Hard Rock", "Grunge", "Punk", "Rockabilly",
    "Rock Psicodélico", "Shoegaze", "Krautrock", "Art Rock",
    "Rock Progressivo", "New Wave", "Britpop",
    "Blues Rock", "Rock Alternativo", "Indie",
    # Eletrônico
    "Eletrônico", "House", "Ambient", "Experimental",
    # Rock genérico
    "Rock",
    # MPB (após rock, para não sobrepor Heavy Metal ou Punk de artistas brasileiros)
    "MPB",
    # Pop e geral
    "Disco", "Pop", "Country", "Folk", "Singer/Songwriter",
    # Instrumental / Clássico
    "Clássico", "Instrumental",
    # Trilha e outros
    "Trilha Sonora", "Easy Listening", "Oldies",
]
PRIORITY_INDEX = {g: i for i, g in enumerate(GENRE_PRIORITY)}


def normalize_token(token: str) -> str:
    """Normaliza um token bruto para gênero pt-BR canônico, ou '' se deve ser ignorado."""
    t = token.strip().lower()
    if not t or t in SKIP_TAGS:
        return ""
    # Tenta artista-como-tag primeiro
    if t in ARTIST_TAG_MAP:
        return ARTIST_TAG_MAP[t]
    # Tenta normalização direta
    if t in GENRE_NORM:
        return GENRE_NORM[t]
    # Tenta sem espaços extras / variações de capitalização
    for key, val in GENRE_NORM.items():
        if key == t:
            return val
    return ""


def parse_col(raw: str) -> list[str]:
    """Divide coluna por ';', normaliza cada token e retorna gêneros válidos únicos."""
    if not raw or not raw.strip():
        return []
    result: list[str] = []
    seen: set[str] = set()
    for part in raw.split(";"):
        g = normalize_token(part)
        if g and g not in seen:
            result.append(g)
            seen.add(g)
    return result


def best_genre(genres: list[str]) -> str:
    """Escolhe o gênero mais específico pela tabela de prioridade."""
    if not genres:
        return ""
    ranked = sorted(genres, key=lambda g: PRIORITY_INDEX.get(g, 999))
    return ranked[0]


def process(src: str, dst: str) -> dict[str, str]:
    """Processa o CSV e retorna dict artista→gênero."""
    artist_genre: dict[str, str] = {}
    written = 0
    skipped = 0
    fallback = 0

    out_fields = ["artista", "genero_normalizado", "tags_normalizadas",
                  "genero_musical_raw", "genero_api_raw", "status"]

    with open(src, encoding="utf-8-sig") as fin, \
         open(dst, "w", encoding="utf-8", newline="") as fout:

        reader = csv.DictReader(fin, delimiter=";")
        writer = csv.DictWriter(fout, fieldnames=out_fields, extrasaction="ignore")
        writer.writeheader()

        for row in reader:
            status = row.get("status_comparacao", "").strip()
            if status in SKIP_STATUS:
                skipped += 1
                continue

            artista = row.get("artista", "").strip()
            if not artista:
                skipped += 1
                continue

            gm_raw = row.get("genero_musical", "").strip()
            api_raw = row.get("genero_api", "").strip()

            gm_genres = parse_col(gm_raw)
            api_genres = parse_col(api_raw)

            # Merge: preferência para genero_musical, depois api
            all_tags: list[str] = []
            seen: set[str] = set()
            for g in gm_genres + api_genres:
                if g not in seen:
                    all_tags.append(g)
                    seen.add(g)

            genero = best_genre(all_tags)
            if not genero:
                genero = "Rock"   # fallback padrão
                fallback += 1

            artist_genre[artista] = genero
            writer.writerow({
                "artista": artista,
                "genero_normalizado": genero,
                "tags_normalizadas": " | ".join(all_tags),
                "genero_musical_raw": gm_raw,
                "genero_api_raw": api_raw,
                "status": status,
            })
            written += 1

    print(f"\n✓ {written} artistas processados  |  {skipped} pulados  |  {fallback} com fallback Rock")
    return artist_genre


def print_artist_genre_dict(ag: dict[str, str]) -> None:
    """Imprime o dicionário Python pronto para colar em transform_csv_for_import.py."""
    print("\n" + "─" * 70)
    print("# ARTIST_GENRE — cole em scripts/transform_csv_for_import.py")
    print("─" * 70)
    print("ARTIST_GENRE: dict[str, str] = {")

    # Agrupa por gênero
    from collections import defaultdict
    by_genre: dict[str, list[str]] = defaultdict(list)
    for artist, genre in sorted(ag.items()):
        by_genre[genre].append(artist)

    for genre in GENRE_PRIORITY:
        artists = by_genre.get(genre, [])
        if not artists:
            continue
        print(f"    # ── {genre} {'─' * max(1, 50 - len(genre))}")
        for a in sorted(artists):
            print(f"    {a!r}: {genre!r},")

    # Gêneros fora da prioridade (caso haja)
    leftover = {g: v for g, v in by_genre.items() if g not in PRIORITY_INDEX}
    if leftover:
        print("    # ── Outros ──────────────────────────────────────────")
        for genre, artists in sorted(leftover.items()):
            for a in sorted(artists):
                print(f"    {a!r}: {genre!r},")

    print("}")


def print_sql(ag: dict[str, str]) -> None:
    """Imprime UPDATE SQL para music_reference_tracks."""
    print("\n" + "─" * 70)
    print("-- SQL UPDATE — execute no Supabase SQL Editor")
    print("─" * 70)
    for artist, genre in sorted(ag.items()):
        safe_a = artist.replace("'", "''")
        safe_g = genre.replace("'", "''")
        print(f"UPDATE music_reference_tracks SET genre = '{safe_g}' WHERE band = '{safe_a}';")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normaliza gêneros artista→pt-BR")
    parser.add_argument("input", nargs="?",
                        default="/Users/fernandoshaidmann/Desktop/artistas_generos_enriquecido_2.csv")
    parser.add_argument("--output", default="/tmp/artista_genero_normalizado.csv")
    parser.add_argument("--sql", action="store_true", help="Imprime SQL UPDATE ao final")
    parser.add_argument("--dict", action="store_true", help="Imprime dicionário Python ao final")
    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"Arquivo não encontrado: {args.input}", file=sys.stderr)
        sys.exit(1)

    ag = process(args.input, args.output)
    print(f"  Arquivo gerado: {args.output}")

    # Distribuição de gêneros
    from collections import Counter
    dist = Counter(ag.values())
    print("\n  Distribuição por gênero:")
    for g, n in dist.most_common():
        print(f"    {n:5d}  {g}")

    if args.dict:
        print_artist_genre_dict(ag)

    if args.sql:
        print_sql(ag)


if __name__ == "__main__":
    main()
