// Tipos
export type GenreLevel = 'strong' | 'usable' | 'weak' | 'proxy' | 'absent';

export interface GenreEntry {
  catalogLabels: string[];
  root:          string;
  rootLabels:    string[];
  count:         number;
  rootCount:     number;
  level:         GenreLevel;
  displayNote?:  string;
}

export interface GenreResolution {
  labels:      string[] | null;
  level:       GenreLevel;
  strict:      boolean;
  displayNote: string | null;
}

// Limiares
export const THRESHOLD_STRONG = 300;
export const THRESHOLD_USABLE = 100;

// Pools de raiz
const ROCK_LABELS   = ["Rock Alternativo","Punk Rock","Folk Rock","Heavy Metal","Grunge","Rock Alternativo BR"];
const RB_LABELS     = ["R&B / Soul","Hip-Hop"];
const ELETRO_LABELS = ["Eletrônica / House","Ambient"];
const SERT_LABELS   = ["Sertanejo Raiz","Sertanejo Universitário"];
const WORLD_LABELS  = ["World Music","Reggae"];
const MPB_LABELS    = ["MPB Contemporânea"];
const POP_LABELS    = ["Pop Internacional"];

// Mapa principal
export const GENRE_MAP: Record<string, GenreEntry> = {
  "Rock":             { catalogLabels:ROCK_LABELS,    root:"Rock",        rootLabels:ROCK_LABELS,    count:5790,  rootCount:5790,  level:'strong' },
  "Pop":              { catalogLabels:POP_LABELS,     root:"Pop",         rootLabels:POP_LABELS,     count:21862, rootCount:21862, level:'strong' },
  "R&B/Soul":         { catalogLabels:RB_LABELS,      root:"R&B/Soul",    rootLabels:RB_LABELS,      count:3000,  rootCount:3000,  level:'strong' },
  "Jazz":             { catalogLabels:["Jazz"],       root:"Jazz",        rootLabels:["Jazz"],       count:2033,  rootCount:2033,  level:'strong' },
  "Eletrônico":       { catalogLabels:ELETRO_LABELS,  root:"Eletrônico",  rootLabels:ELETRO_LABELS,  count:2158,  rootCount:2158,  level:'strong' },
  "MPB":              { catalogLabels:MPB_LABELS,     root:"MPB",         rootLabels:MPB_LABELS,     count:662,   rootCount:662,   level:'usable', displayNote:"amostra moderada (662 faixas)" },
  "Country":          { catalogLabels:["Country"],    root:"Country",     rootLabels:["Country"],    count:417,   rootCount:417,   level:'usable' },
  "Sertanejo":        { catalogLabels:SERT_LABELS,    root:"Sertanejo",   rootLabels:SERT_LABELS,    count:105,   rootCount:105,   level:'usable', displayNote:"amostra de 105 faixas" },
  
  "Indie/Alternativo": { catalogLabels:["Rock Alternativo"], root:"Rock", rootLabels:ROCK_LABELS, count:3956, rootCount:5790, level:'strong' },
  "Metal":            { catalogLabels:["Heavy Metal"], root:"Rock", rootLabels:ROCK_LABELS, count:360, rootCount:5790, level:'usable' },
  "Rock Brasileiro":  { catalogLabels:["Rock Alternativo BR"], root:"Rock", rootLabels:ROCK_LABELS, count:38, rootCount:5790, level:'weak' },
  "R&B":              { catalogLabels:["R&B / Soul"], root:"R&B/Soul", rootLabels:RB_LABELS, count:2697, rootCount:3000, level:'strong' },
  "Soul":             { catalogLabels:["R&B / Soul"], root:"R&B/Soul", rootLabels:RB_LABELS, count:2697, rootCount:3000, level:'strong' },
  "Hip-Hop":          { catalogLabels:["Hip-Hop"], root:"R&B/Soul", rootLabels:RB_LABELS, count:303, rootCount:3000, level:'usable' },
  "Reggae":           { catalogLabels:["Reggae"], root:"World", rootLabels:WORLD_LABELS, count:46, rootCount:159, level:'weak' },
  
  "Pop Nacional":     { catalogLabels:POP_LABELS, root:"Pop", rootLabels:POP_LABELS, count:0, rootCount:21862, level:'proxy', displayNote:"referência: Pop Internacional — pop brasileiro ausente" },
  "Bossa Nova":       { catalogLabels:MPB_LABELS, root:"MPB", rootLabels:MPB_LABELS, count:0, rootCount:662, level:'proxy', displayNote:"comparando com MPB (662 faixas)" },
  "Instrumental":     { catalogLabels:["Ambient"], root:"Eletrônico", rootLabels:ELETRO_LABELS, count:0, rootCount:1407, level:'proxy', displayNote:"comparando com Ambient" },
  
  "Funk":    { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Samba":   { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Pagode":  { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Forró":   { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Axé":     { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Gospel":  { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Clássico":{ catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"ausente — posicionamento desabilitado" },
  "Outros":  { catalogLabels:[], root:"", rootLabels:[], count:0, rootCount:0, level:'absent', displayNote:"gênero amplo — Módulo 02 desabilitado" },
};

// Função de resolução
export function resolveGenre(declaredGenre: string): GenreResolution {
  const entry = GENRE_MAP[declaredGenre];

  if (!entry) {
    return { labels: null, level: 'absent', strict: false, displayNote: `gênero desconhecido: ${declaredGenre}` };
  }

  // Nível 1 — específico tem massa suficiente
  if (entry.count >= THRESHOLD_USABLE && entry.catalogLabels.length > 0) {
    return { labels: entry.catalogLabels, level: entry.level, strict: true, displayNote: entry.displayNote ?? null };
  }

  // Nível 2 — fallback para raiz
  if (entry.rootCount >= THRESHOLD_USABLE && entry.rootLabels.length > 0) {
    const note = entry.displayNote ?? `comparando com pool ${entry.root}`;
    const rootLevel: GenreLevel = entry.rootCount >= THRESHOLD_STRONG ? 'strong' : 'usable';
    return { labels: entry.rootLabels, level: rootLevel, strict: true, displayNote: note };
  }

  // Nível 3 — proxy
  if (entry.level === 'proxy' && entry.catalogLabels.length > 0) {
    return { labels: entry.catalogLabels, level: 'proxy', strict: true, displayNote: entry.displayNote ?? null };
  }

  // Nível 4 — ausente
  return { labels: null, level: 'absent', strict: false, displayNote: entry.displayNote ?? null };
}