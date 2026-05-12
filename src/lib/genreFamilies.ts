// Famílias de gêneros tecnicamente próximos. Pares dentro da mesma família
// NÃO devem disparar o alerta de divergência (GenreMismatchHint), mesmo
// quando a similaridade de cosseno é alta. Heurística inicial — ajustar
// conforme feedback dos produtores.

const FAMILIES: Record<string, string[]> = {
  pop: [
    "Pop", "Pop Brasileiro", "Pop Internacional", "Synth-Pop",
    "Axé / Pop Bahia", "MPB Contemporânea",
  ],
  rock: [
    "Rock", "Rock Alternativo", "Rock Alternativo BR", "Grunge",
    "Punk Rock", "Heavy Metal", "Indie BR", "Indie Folk", "Folk Rock",
  ],
  urban: [
    "Hip-Hop", "Rap BR", "Trap BR", "Lo-Fi Hip Hop",
    "R&B / Soul", "Soul", "Funk",
  ],
  "brazilian-roots": [
    "Samba", "Pagode", "Bossa Nova", "Sertanejo Raiz",
    "Sertanejo Universitário", "Forró / Piseiro", "Reggae BR", "Reggae",
  ],
  electronic: [
    "Eletrônico", "Eletrônica / House", "Synth-Pop", "Ambient",
  ],
  acoustic: [
    "Jazz", "Country", "Bossa Nova", "Folk Rock", "Indie Folk",
  ],
  "funk-br": ["Funk Carioca"],
};

const REGIONAL_SUFFIXES = [
  " brasileiro", " brasileira", " internacional", " carioca",
  " raiz", " universitario", " br",
];

/** Normaliza nomes de gênero: lowercase, sem acento, sem sufixos regionais. */
export function normalizeGenreName(g: string): string {
  let s = (g || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  // Remover sufixos regionais comuns
  for (const suf of REGIONAL_SUFFIXES) {
    if (s.endsWith(suf)) {
      s = s.slice(0, -suf.length).trim();
      break;
    }
  }
  // Tirar tudo após " / " (ex: "Eletrônica / House" → "eletronica")
  const slashIdx = s.indexOf(" / ");
  if (slashIdx > 0) s = s.slice(0, slashIdx).trim();
  return s;
}

// Index reverso: nome normalizado → set de famílias.
const GENRE_TO_FAMILIES: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const [fam, members] of Object.entries(FAMILIES)) {
    for (const member of members) {
      const k = normalizeGenreName(member);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(fam);
    }
  }
  return m;
})();

/** Rótulos pt-BR amigáveis para cada chave de família. */
export const FAMILY_LABELS: Record<string, string> = {
  pop: "Pop",
  rock: "Rock",
  urban: "Urbano",
  "brazilian-roots": "Raízes Brasileiras",
  electronic: "Eletrônico",
  acoustic: "Acústico",
  "funk-br": "Funk BR",
};

/** Retorna as famílias (chaves) de um gênero, ou [] se não estiver mapeado. */
export function getFamilies(genre: string): string[] {
  const k = normalizeGenreName(genre);
  const set = GENRE_TO_FAMILIES.get(k);
  return set ? Array.from(set) : [];
}

/** True se ambos os gêneros compartilham pelo menos uma família. */
export function sameFamily(a: string, b: string): boolean {
  const na = normalizeGenreName(a);
  const nb = normalizeGenreName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const fa = GENRE_TO_FAMILIES.get(na);
  const fb = GENRE_TO_FAMILIES.get(nb);
  if (!fa || !fb) return false;
  for (const f of fa) if (fb.has(f)) return true;
  return false;
}
