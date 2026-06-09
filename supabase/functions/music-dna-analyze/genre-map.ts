// ============================================================================
// genre-map.ts — Resolução de gênero declarado → rótulos do catálogo
// ----------------------------------------------------------------------------
// Calibrado contra a distribuição REAL de `music_reference_tracks` em produção.
// Snapshot: 2026-06 (Bossa Nova=11519, Samba=8206, MPB Contemporânea=6785, ...).
//
// Pipeline:
//   declaredGenre (string livre)
//     └─► tokenize()           ── split por "/", ",", "(", "com", "feat", "x"
//          └─► normalize()     ── lowercase + sem acento + alias canônico
//               └─► token → entry no GENRE_MAP
//                    └─► resolveGenre() faz o melhor match (maior coverage)
//                         retorna labels[] que batem `genre ILIKE ANY(...)`
// ============================================================================

export type GenreLevel = 'strong' | 'usable' | 'weak' | 'proxy' | 'absent';

export interface GenreEntry {
  /** rótulos exatos da coluna `genre` que serão usados em `ILIKE ANY(...)`. */
  catalogLabels: string[];
  /** chave canônica do pool (para logs). */
  root: string;
  /** união expandida (catálogo + raízes), usada em fallback. */
  rootLabels: string[];
  /** faixas ativas no catálogo (NÃO quarentenadas) que casam `catalogLabels`. */
  count: number;
  /** faixas ativas que casam `rootLabels`. */
  rootCount: number;
  level: GenreLevel;
  displayNote?: string;
}

export interface GenreResolution {
  labels: string[] | null;
  level: GenreLevel;
  strict: boolean;
  displayNote: string | null;
  /** quais tokens do input foram reconhecidos (debug/telemetria). */
  matchedTokens: string[];
  /** tokens que não casaram com nada (debug). */
  unmatchedTokens: string[];
}

// ─────────────────────────── Limiares ────────────────────────────
// Mediana real do catálogo ≈ 200 faixas/gênero. Reduzimos USABLE para 50
// para não desabilitar gêneros pequenos mas legítimos (Pagode, Country).
export const THRESHOLD_STRONG = 300;
export const THRESHOLD_USABLE = 50;

// ──────────────────────── Pools de catálogo ──────────────────────
// Os strings abaixo são EXATAMENTE como aparecem na coluna `genre`.
// Se um label não existe no banco, ele não entra no pool — o ILIKE ANY falharia.
const ROCK_LABELS = [
  "Rock", "Rock Alternativo", "Rock Progressivo", "Rock Psicodélico",
  "Folk Rock", "Heavy Metal", "Grunge", "Punk", "Hard Rock",
  "Britpop", "Shoegaze", "New Wave", "Rockabilly", "Art Rock",
];
const RB_SOUL_LABELS = ["Soul", "R&B / Soul", "R&B", "Soul/Funk"];
const ELETRO_LABELS = ["Eletrônico", "Ambient"];
const MPB_LABELS = ["MPB Contemporânea", "MPB"];
const SAMBA_LABELS = ["Samba", "Pagode"];
const REGGAE_LABELS = ["Reggae", "Reggae BR"];
const FUNK_LABELS = ["Funk", "Funk Carioca", "Soul/Funk"];
const HIP_HOP_LABELS = ["Hip-Hop/Rap"];
const JAZZ_LABELS = ["Jazz", "Jazz/Swing"];
const FOLK_LABELS = ["Folk", "Folk Rock"];

// ───────────────────────────── Mapa ──────────────────────────────
// As contagens (`count` / `rootCount`) e o `level` são DERIVADOS em runtime
// a partir de `GENERATED_COUNTS` (snapshot real do catálogo via RPC).
// Para regenerar o snapshot rode: `bun scripts/regenerate-genre-map.ts`.
import { GENERATED_COUNTS } from "./genre-counts.generated.ts";

interface GenreDefinition {
  catalogLabels: string[];
  root: string;
  rootLabels: string[];
  /** força um nível específico ignorando os thresholds (usar com parcimônia). */
  forceLevel?: GenreLevel;
  displayNote?: string;
}

const DEFINITIONS: Record<string, GenreDefinition> = {
  // ── Pools principais ─────────────────────────────────────────
  "Bossa Nova": { catalogLabels: ["Bossa Nova"], root: "Bossa Nova", rootLabels: ["Bossa Nova", "MPB Contemporânea"] },
  "Samba": { catalogLabels: ["Samba"], root: "Samba", rootLabels: SAMBA_LABELS },
  "MPB": { catalogLabels: MPB_LABELS, root: "MPB", rootLabels: MPB_LABELS },
  "Rock": { catalogLabels: ROCK_LABELS, root: "Rock", rootLabels: ROCK_LABELS },
  "Reggae": { catalogLabels: REGGAE_LABELS, root: "Reggae", rootLabels: REGGAE_LABELS },
  "R&B/Soul": { catalogLabels: RB_SOUL_LABELS, root: "R&B/Soul", rootLabels: RB_SOUL_LABELS },
  "Blues": { catalogLabels: ["Blues"], root: "Blues", rootLabels: ["Blues"] },
  "Hip-Hop": { catalogLabels: HIP_HOP_LABELS, root: "Hip-Hop", rootLabels: HIP_HOP_LABELS },
  "Jazz": { catalogLabels: JAZZ_LABELS, root: "Jazz", rootLabels: JAZZ_LABELS },
  "Folk": { catalogLabels: FOLK_LABELS, root: "Folk", rootLabels: FOLK_LABELS },

  // ── Médios ───────────────────────────────────────────────────
  "Sertanejo": { catalogLabels: ["Sertanejo Raiz"], root: "Sertanejo", rootLabels: ["Sertanejo Raiz"], displayNote: "somente Sertanejo Raiz no catálogo" },
  "Eletrônico": { catalogLabels: ELETRO_LABELS, root: "Eletrônico", rootLabels: ELETRO_LABELS },
  "Metal": { catalogLabels: ["Heavy Metal"], root: "Rock", rootLabels: ROCK_LABELS },
  "Pop": { catalogLabels: ["Pop"], root: "Pop", rootLabels: ["Pop"], displayNote: "pool Pop é raso no catálogo" },
  "Country": { catalogLabels: ["Country"], root: "Country", rootLabels: ["Country"] },

  // ── Específicos com pool herdado ─────────────────────────────
  "Pagode": { catalogLabels: ["Pagode", "Samba"], root: "Samba", rootLabels: SAMBA_LABELS, displayNote: "Pagode específico tem poucas faixas — comparado contra pool Samba" },
  "Funk": { catalogLabels: FUNK_LABELS, root: "Funk", rootLabels: FUNK_LABELS, displayNote: "amostra muito pequena — interpretar com cautela" },
  "Punk": { catalogLabels: ["Punk"], root: "Rock", rootLabels: ROCK_LABELS, displayNote: "comparado contra pool Rock" },

  // ── Aliases e variações comuns ───────────────────────────────
  "Soul": { catalogLabels: ["Soul", "Soul/Funk"], root: "R&B/Soul", rootLabels: RB_SOUL_LABELS },
  "Rock Brasileiro": { catalogLabels: ["Rock Alternativo"], root: "Rock", rootLabels: ROCK_LABELS, displayNote: "BR específico ausente — usando pool Rock Alternativo" },
  "Indie/Alternativo": { catalogLabels: ["Rock Alternativo"], root: "Rock", rootLabels: ROCK_LABELS },
  "Pop Nacional": { catalogLabels: ["Pop"], root: "Pop", rootLabels: ["Pop", "MPB Contemporânea"], forceLevel: 'proxy', displayNote: "Pop brasileiro ausente — comparando com MPB Contemporânea" },
  "Instrumental": { catalogLabels: ["Ambient", "Jazz", "Folk Rock"], root: "Eletrônico", rootLabels: [...ELETRO_LABELS, ...JAZZ_LABELS, ...FOLK_LABELS], displayNote: "instrumental puro ausente — comparando com Ambient + Jazz + Folk Rock" },

  // ── Ausentes de verdade no catálogo ──────────────────────────
  "Forró": { catalogLabels: [], root: "", rootLabels: [], forceLevel: 'absent', displayNote: "Forró ausente no catálogo — posicionamento desabilitado" },
  "Axé": { catalogLabels: [], root: "", rootLabels: [], forceLevel: 'absent', displayNote: "Axé ausente no catálogo — posicionamento desabilitado" },
  "Gospel": { catalogLabels: [], root: "", rootLabels: [], forceLevel: 'absent', displayNote: "Gospel ausente no catálogo — posicionamento desabilitado" },
  "Clássico": { catalogLabels: [], root: "", rootLabels: [], forceLevel: 'absent', displayNote: "Clássico ausente no catálogo — posicionamento desabilitado" },
  "Outros": { catalogLabels: [], root: "", rootLabels: [], forceLevel: 'absent', displayNote: "gênero amplo demais — Módulo 02 desabilitado" },
};

function countLabels(labels: string[]): number {
  let total = 0;
  for (const lbl of labels) total += GENERATED_COUNTS[lbl] ?? 0;
  return total;
}

function deriveLevel(count: number, force?: GenreLevel): GenreLevel {
  if (force) return force;
  if (count >= THRESHOLD_STRONG) return 'strong';
  if (count >= THRESHOLD_USABLE) return 'usable';
  if (count > 0) return 'weak';
  return 'absent';
}

export const GENRE_MAP: Record<string, GenreEntry> = Object.fromEntries(
  Object.entries(DEFINITIONS).map(([key, def]) => {
    const count = countLabels(def.catalogLabels);
    const rootCount = countLabels(def.rootLabels);
    const level = deriveLevel(count > 0 ? count : rootCount, def.forceLevel);
    const note = def.displayNote
      ? (count > 0 ? `${def.displayNote} (${count} faixas)` : def.displayNote)
      : undefined;
    return [key, {
      catalogLabels: def.catalogLabels,
      root: def.root,
      rootLabels: def.rootLabels,
      count, rootCount, level,
      displayNote: note,
    } satisfies GenreEntry];
  }),
);


// ────────────────────── Normalização de tokens ───────────────────
// Espelha public.genre_canonical() em SQL — quando o usuário digitar
// algo equivalente, mapeamos para a chave canônica do GENRE_MAP.
const ALIAS: Record<string, string> = {
  // Hip-hop family
  "hip hop": "Hip-Hop", "hip-hop": "Hip-Hop", "hiphop": "Hip-Hop",
  "rap": "Hip-Hop", "rap br": "Hip-Hop", "rap brasileiro": "Hip-Hop",
  "trap": "Hip-Hop", "trap br": "Hip-Hop", "trap brasileiro": "Hip-Hop",
  "urban": "Hip-Hop", "urban indie": "Hip-Hop", "big beat": "Hip-Hop",
  // Funk family
  "funk carioca": "Funk", "baile funk": "Funk", "brazilian funk": "Funk",
  "funk br": "Funk", "funk brasileiro": "Funk",
  // R&B / Soul
  "r&b": "R&B/Soul", "rnb": "R&B/Soul", "r and b": "R&B/Soul",
  "soul": "Soul", "r&b / soul": "R&B/Soul", "r&b soul": "R&B/Soul",
  // MPB / Bossa
  "mpb contemporanea": "MPB", "mpb contemporânea": "MPB",
  "musica popular brasileira": "MPB", "música popular brasileira": "MPB",
  "bossa": "Bossa Nova", "bossa nova": "Bossa Nova",
  // Pop
  "pop br": "Pop Nacional", "pop brasileiro": "Pop Nacional",
  "pop internacional": "Pop", "pop intl": "Pop", "international pop": "Pop",
  "dance-pop": "Pop", "art pop": "Pop",
  // Sertanejo
  "sertanejo universitario": "Sertanejo", "sertanejo universitário": "Sertanejo",
  "sertanejo raiz": "Sertanejo", "sertanejo de raiz": "Sertanejo",
  "musica caipira": "Sertanejo", "música caipira": "Sertanejo",
  "arrocha": "Sertanejo", "arrocha moderno": "Sertanejo",
  // Samba / Pagode
  "samba de raiz": "Samba", "pagode romantico": "Pagode", "pagode romântico": "Pagode",
  // Forró
  "forro": "Forró", "piseiro": "Forró", "forro pe de serra": "Forró", "forró pé de serra": "Forró",
  // Axé / Bahia
  "axe": "Axé", "pop bahia": "Axé",
  // Reggae
  "reggae br": "Reggae", "reggae brasileiro": "Reggae",
  // Rock
  "rock alternativo": "Rock", "rock alternativo br": "Rock Brasileiro",
  "alternative rock": "Indie/Alternativo", "alternative": "Indie/Alternativo",
  "post-punk": "Rock", "punk rock": "Punk", "hardcore": "Punk",
  "grunge": "Rock", "grunge revival": "Rock", "grunge alternativo": "Rock",
  "heavy metal": "Metal", "nwobhm": "Metal", "alt-metal": "Metal",
  "indie": "Indie/Alternativo", "indie br": "Indie/Alternativo",
  "indie rock": "Indie/Alternativo", "indie pop": "Indie/Alternativo",
  "indie folk": "Folk", "folk alternativo": "Folk", "folk brasileiro": "Folk",
  // Eletrônica
  "eletronica": "Eletrônico", "eletrônica": "Eletrônico",
  "house": "Eletrônico", "electronic": "Eletrônico", "edm": "Eletrônico",
  "drum and bass": "Eletrônico", "dnb": "Eletrônico", "liquid dnb": "Eletrônico",
  "downtempo": "Eletrônico", "melodic house": "Eletrônico",
  "synth pop": "Pop", "synth-pop": "Pop", "synthpop": "Pop",
  "ambient": "Eletrônico", "experimental bass": "Eletrônico",
  // Jazz
  "jazz fusion": "Jazz", "jazz-fusion": "Jazz", "jazz/swing": "Jazz",
  // Instrumental / clássico
  "neoclassical": "Instrumental", "classical": "Clássico",
  "classical solo cello": "Instrumental", "neoclassical instrumental": "Instrumental",
  // Country
  "country": "Country",
  // Blues
  "blues": "Blues",
  // Gospel / sacro
  "gospel": "Gospel", "louvor": "Gospel", "musica crista": "Gospel",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(raw: string): string | null {
  const cleaned = stripAccents(raw.trim().toLowerCase())
    .replace(/\(.*?\)/g, "")        // remove parenteses
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  // Alias direto?
  if (ALIAS[cleaned]) return ALIAS[cleaned];
  // Alias por chave da forma canônica (lowercased)?
  for (const key of Object.keys(GENRE_MAP)) {
    if (stripAccents(key.toLowerCase()) === cleaned) return key;
  }
  // Substring matches (último recurso) — pega o mais específico (mais longo)
  let best: string | null = null;
  for (const [alias, target] of Object.entries(ALIAS)) {
    if (cleaned.includes(alias) && (!best || alias.length > best.length)) {
      best = target;
    }
  }
  return best;
}

/** Tokeniza strings compostas como "Indie Folk / MPB Contemporânea". */
function tokenize(declared: string): string[] {
  return declared
    .split(/[\/,;|]|\s+(?:com|feat|featuring|x|&)\s+/i)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

// ───────────────────────── Resolução ─────────────────────────────
export function resolveGenre(declaredGenre: string): GenreResolution {
  const safe = (declaredGenre ?? "").trim();
  if (!safe) {
    return { labels: null, level: 'absent', strict: false, displayNote: "gênero não informado", matchedTokens: [], unmatchedTokens: [] };
  }

  const tokens = tokenize(safe);
  const matched: { key: string; entry: GenreEntry }[] = [];
  const matchedTokens: string[] = [];
  const unmatchedTokens: string[] = [];

  for (const tok of tokens) {
    const key = normalizeToken(tok);
    if (key && GENRE_MAP[key]) {
      matched.push({ key, entry: GENRE_MAP[key] });
      matchedTokens.push(`${tok}→${key}`);
    } else {
      unmatchedTokens.push(tok);
    }
  }

  // Nenhum token reconhecido → absent
  if (matched.length === 0) {
    return {
      labels: null, level: 'absent', strict: false,
      displayNote: `nenhum gênero reconhecido em "${safe}"`,
      matchedTokens: [], unmatchedTokens,
    };
  }

  // Escolhe o token com MAIOR cobertura (count) — esse vira o "primário".
  // Os secundários (se reconhecidos) contribuem labels adicionais para
  // ampliar o pool sem perder o foco do gênero principal.
  matched.sort((a, b) => b.entry.count - a.entry.count);
  const primary = matched[0];
  const secondaries = matched.slice(1);

  // União de labels (primário + secundários)
  const unionLabels = new Set<string>(primary.entry.catalogLabels);
  for (const s of secondaries) {
    for (const l of s.entry.catalogLabels) unionLabels.add(l);
  }

  const noteParts: string[] = [];
  if (primary.entry.displayNote) noteParts.push(primary.entry.displayNote);
  if (secondaries.length > 0) {
    noteParts.push(`combinando com ${secondaries.map(s => s.key).join(", ")}`);
  }
  if (unmatchedTokens.length > 0) {
    noteParts.push(`tokens ignorados: ${unmatchedTokens.join(", ")}`);
  }

  // Nível 1 — primário tem massa específica suficiente
  if (primary.entry.count >= THRESHOLD_USABLE && unionLabels.size > 0) {
    return {
      labels: Array.from(unionLabels),
      level: primary.entry.level,
      strict: true,
      displayNote: noteParts.length ? noteParts.join(" — ") : null,
      matchedTokens, unmatchedTokens,
    };
  }

  // Nível 2 — fallback para raiz do primário
  if (primary.entry.rootCount >= THRESHOLD_USABLE && primary.entry.rootLabels.length > 0) {
    const rootLevel: GenreLevel = primary.entry.rootCount >= THRESHOLD_STRONG ? 'strong' : 'usable';
    const rootUnion = new Set<string>(primary.entry.rootLabels);
    for (const s of secondaries) for (const l of s.entry.catalogLabels) rootUnion.add(l);
    return {
      labels: Array.from(rootUnion),
      level: rootLevel,
      strict: true,
      displayNote: `comparando com pool ${primary.entry.root}` + (noteParts.length ? ` — ${noteParts.join(" — ")}` : ""),
      matchedTokens, unmatchedTokens,
    };
  }

  // Nível 3 — proxy
  if (primary.entry.level === 'proxy' && primary.entry.catalogLabels.length > 0) {
    return {
      labels: Array.from(unionLabels),
      level: 'proxy',
      strict: true,
      displayNote: noteParts.length ? noteParts.join(" — ") : null,
      matchedTokens, unmatchedTokens,
    };
  }

  // Nível 4 — ausente
  return {
    labels: null, level: 'absent', strict: false,
    displayNote: primary.entry.displayNote ?? `cobertura insuficiente para "${primary.key}"`,
    matchedTokens, unmatchedTokens,
  };
}
