import type { AudioFeatures, Genre } from "@/hooks/useMusicDNA";

export interface MusicDnaArtistReference {
  artist: string;
  territories: string[];
  tags: string[];
}

export const MUSIC_DNA_ARTIST_REFERENCES: MusicDnaArtistReference[] = [
  { artist: "Tim Bernardes", territories: ["mpb", "indie", "folk"], tags: ["intimista", "acústico", "composição"] },
  { artist: "Rubel", territories: ["mpb", "indie", "folk"], tags: ["voz", "violão", "orgânico"] },
  { artist: "Liniker", territories: ["mpb", "soul", "r&b"], tags: ["voz", "soul", "brass"] },
  { artist: "Céu", territories: ["mpb", "reggae", "eletrônica"], tags: ["groove", "textura", "dub"] },
  { artist: "Marina Sena", territories: ["pop", "mpb"], tags: ["vocal", "pop alternativo", "brilho"] },
  { artist: "Ana Frango Elétrico", territories: ["mpb", "indie", "rock"], tags: ["arranjo", "lo-fi", "experimental"] },
  { artist: "Tuyo", territories: ["indie", "mpb", "eletrônica"], tags: ["atmosférico", "minimal", "vocal"] },
  { artist: "Terno Rei", territories: ["indie", "rock"], tags: ["dream pop", "guitarras", "nostalgia"] },
  { artist: "Boogarins", territories: ["rock", "psicodélico", "indie"], tags: ["psicodelia", "guitarras", "textura"] },
  { artist: "Anavitória", territories: ["pop", "folk", "mpb"], tags: ["dueto", "acústico", "melódico"] },
  { artist: "Clarice Falcão", territories: ["mpb", "indie", "folk"], tags: ["minimal", "letra", "voz"] },
  { artist: "Mônica Salmaso", territories: ["mpb", "samba"], tags: ["voz", "acústico", "sofisticação"] },
  { artist: "Criolo", territories: ["rap", "mpb", "samba"], tags: ["letra", "grave", "híbrido"] },
  { artist: "Emicida", territories: ["rap", "soul", "mpb"], tags: ["flow", "arranjo", "brasilidade"] },
  { artist: "Djonga", territories: ["rap", "trap"], tags: ["densidade", "voz", "grave"] },
  { artist: "BK'", territories: ["rap", "r&b", "trap"], tags: ["flow", "atmosfera", "808"] },
  { artist: "Baco Exu do Blues", territories: ["rap", "r&b", "mpb"], tags: ["dramático", "melódico", "subgrave"] },
  { artist: "Matuê", territories: ["trap", "pop"], tags: ["808", "melodia", "energia"] },
  { artist: "Don L", territories: ["rap", "soul"], tags: ["narrativa", "sample", "groove"] },
  { artist: "Flora Matos", territories: ["rap", "r&b"], tags: ["flow", "vocal", "groove"] },
  { artist: "Rincon Sapiência", territories: ["rap", "afrobeat", "samba"], tags: ["percussão", "flow", "dançante"] },
  { artist: "Anitta", territories: ["pop", "funk"], tags: ["club", "vocal", "grave"] },
  { artist: "IZA", territories: ["pop", "r&b", "soul"], tags: ["voz", "groove", "brilho"] },
  { artist: "Duda Beat", territories: ["pop", "forró", "eletrônica"], tags: ["sofrência", "beat", "synth"] },
  { artist: "Pabllo Vittar", territories: ["pop", "forró", "eletrônica"], tags: ["dance", "vocal", "energia"] },
  { artist: "Luísa Sonza", territories: ["pop", "funk", "r&b"], tags: ["vocal", "produção", "brilho"] },
  { artist: "Jão", territories: ["pop", "rock"], tags: ["refrão", "synth", "dramático"] },
  { artist: "Marília Mendonça", territories: ["sertanejo"], tags: ["voz", "sofrência", "refrão"] },
  { artist: "Maiara & Maraisa", territories: ["sertanejo"], tags: ["dueto", "refrão", "voz"] },
  { artist: "Almir Sater", territories: ["sertanejo", "folk"], tags: ["viola", "orgânico", "raiz"] },
  { artist: "João Gomes", territories: ["forró", "piseiro"], tags: ["grave", "voz", "dançante"] },
  { artist: "Zé Vaqueiro", territories: ["forró", "piseiro"], tags: ["beat", "refrão", "grave"] },
  { artist: "Dominguinhos", territories: ["forró", "mpb"], tags: ["sanfona", "orgânico", "groove"] },
  { artist: "Cartola", territories: ["samba", "mpb"], tags: ["harmonia", "voz", "composição"] },
  { artist: "Beth Carvalho", territories: ["samba"], tags: ["roda", "percussão", "coro"] },
  { artist: "Zeca Pagodinho", territories: ["samba", "pagode"], tags: ["cavaquinho", "roda", "groove"] },
  { artist: "Ferrugem", territories: ["pagode", "r&b"], tags: ["vocal", "harmonia", "refrão"] },
  { artist: "Ivete Sangalo", territories: ["axé", "pop"], tags: ["energia", "percussão", "refrão"] },
  { artist: "BaianaSystem", territories: ["axé", "reggae", "eletrônica"], tags: ["grave", "percussão", "sound system"] },
  { artist: "Pitty", territories: ["rock"], tags: ["guitarras", "voz", "energia"] },
  { artist: "Fresno", territories: ["rock", "pop"], tags: ["emocore", "refrão", "guitarras"] },
  { artist: "Scalene", territories: ["rock", "alternativo"], tags: ["dinâmica", "guitarras", "peso"] },
  { artist: "Far From Alaska", territories: ["rock", "alternativo"], tags: ["peso", "riff", "energia"] },
  { artist: "Engenheiros do Hawaii", territories: ["rock", "pop"], tags: ["letra", "baixo", "refrão"] },
  { artist: "Bon Iver", territories: ["folk", "indie", "eletrônica"], tags: ["camadas", "falsete", "textura"] },
  { artist: "Novo Amor", territories: ["folk", "indie"], tags: ["ambiental", "falsete", "acústico"] },
  { artist: "Phoebe Bridgers", territories: ["folk", "indie"], tags: ["intimista", "guitarras", "ambiência"] },
  { artist: "Sufjan Stevens", territories: ["folk", "indie", "mpb"], tags: ["arranjo", "acústico", "orquestral"] },
  { artist: "Billie Eilish", territories: ["pop", "eletrônica"], tags: ["subgrave", "minimal", "vocal próximo"] },
  { artist: "Lorde", territories: ["pop", "indie"], tags: ["minimal", "refrão", "synth"] },
  { artist: "James Blake", territories: ["eletrônica", "r&b", "soul"], tags: ["subgrave", "voz", "espaço"] },
  { artist: "SZA", territories: ["r&b", "soul", "pop"], tags: ["vocal", "groove", "harmonia"] },
  { artist: "Kendrick Lamar", territories: ["rap", "jazz", "soul"], tags: ["flow", "dinâmica", "narrativa"] },
  { artist: "Frank Ocean", territories: ["r&b", "soul", "pop"], tags: ["vocal", "harmonia", "minimal"] },
  { artist: "Tyler, The Creator", territories: ["rap", "soul", "pop"], tags: ["baixo", "synth", "arranjo"] },
  { artist: "Kaytranada", territories: ["eletrônica", "house", "r&b"], tags: ["groove", "sidechain", "baixo"] },
  { artist: "Disclosure", territories: ["eletrônica", "house", "pop"], tags: ["club", "groove", "kick"] },
  { artist: "Tame Impala", territories: ["indie", "rock", "eletrônica"], tags: ["psicodelia", "synth", "drums"] },
  { artist: "Arctic Monkeys", territories: ["rock", "indie"], tags: ["guitarras", "groove", "voz"] },
  { artist: "The Weeknd", territories: ["pop", "r&b", "eletrônica"], tags: ["synth", "vocal", "grave"] },
  { artist: "Rosalía", territories: ["pop", "flamenco", "eletrônica"], tags: ["percussão", "vocal", "experimental"] },
  { artist: "Bad Bunny", territories: ["reggaeton", "trap", "pop"], tags: ["dembow", "grave", "melodia"] },
  { artist: "Bob Marley", territories: ["reggae"], tags: ["skank", "baixo", "orgânico"] },
  { artist: "Gilberto Gil", territories: ["mpb", "reggae", "samba"], tags: ["groove", "violão", "brasilidade"] },
  { artist: "Caetano Veloso", territories: ["mpb", "pop"], tags: ["voz", "harmonia", "composição"] },
  { artist: "Elis Regina", territories: ["mpb", "samba"], tags: ["interpretação", "dinâmica", "voz"] },
  { artist: "João Gilberto", territories: ["bossa", "mpb"], tags: ["violão", "voz", "dinâmica"] },
  { artist: "Tom Jobim", territories: ["bossa", "mpb", "jazz"], tags: ["harmonia", "piano", "sofisticação"] },
  { artist: "Jorge Ben Jor", territories: ["samba", "funk", "mpb"], tags: ["groove", "violão", "dançante"] },
  { artist: "Seu Jorge", territories: ["samba", "soul", "mpb"], tags: ["voz", "groove", "baixo"] },
  { artist: "Nação Zumbi", territories: ["rock", "manguebeat", "eletrônica"], tags: ["percussão", "peso", "grave"] },
  { artist: "Chico Science", territories: ["manguebeat", "rock", "rap"], tags: ["percussão", "baixo", "híbrido"] },
  { artist: "Planet Hemp", territories: ["rap", "rock"], tags: ["riff", "flow", "energia"] },
  { artist: "Racionais MC's", territories: ["rap"], tags: ["narrativa", "sample", "peso"] },
];

export const ALL_REFERENCE_ARTISTS = MUSIC_DNA_ARTIST_REFERENCES.map((reference) => reference.artist);

const genreTerritories: Partial<Record<Genre, string[]>> = {
  "MPB Contemporânea": ["mpb", "indie", "soul"],
  "Bossa Nova": ["bossa", "mpb", "jazz"],
  Samba: ["samba", "mpb"],
  Pagode: ["pagode", "samba", "r&b"],
  "Funk Carioca": ["funk", "pop"],
  "Forró / Piseiro": ["forró", "piseiro"],
  "Sertanejo Raiz": ["sertanejo", "folk"],
  "Sertanejo Universitário": ["sertanejo", "pop"],
  "Pop Brasileiro": ["pop", "funk", "r&b"],
  "Indie BR": ["indie", "mpb", "rock"],
  "Rock Alternativo BR": ["rock", "alternativo", "indie"],
  "Rap BR": ["rap", "soul"],
  "Trap BR": ["trap", "rap", "pop"],
  "R&B / Soul": ["r&b", "soul", "pop"],
  "Reggae BR": ["reggae", "mpb", "samba"],
  "Axé / Pop Bahia": ["axé", "pop", "reggae"],
  "Lo-Fi Hip Hop": ["rap", "soul", "eletrônica"],
  "Eletrônica / House": ["eletrônica", "house", "pop"],
  "Indie Folk": ["folk", "indie", "mpb"],
  "Pop Internacional": ["pop", "r&b", "eletrônica"],
};

function inferTerritories(features: AudioFeatures): string[] {
  const territories = new Set<string>();
  if (features.acousticness > 0.62) territories.add("mpb").add("folk").add("bossa");
  if (features.danceability > 0.72 && features.energy > 0.65) territories.add("pop").add("funk").add("house");
  if (features.energy > 0.72 && features.acousticness < 0.25) territories.add("rock").add("trap").add("eletrônica");
  if (features.instrumentalness > 0.55) territories.add("eletrônica").add("house");
  if (features.valence > 0.62 && features.danceability > 0.58) territories.add("samba").add("forró").add("axé");
  if (features.valence < 0.42 && features.energy > 0.55) territories.add("rap").add("trap").add("r&b");
  if (territories.size === 0) territories.add("mpb").add("pop").add("indie");
  return Array.from(territories);
}

export function selectReferenceArtists(features: AudioFeatures, genre?: Genre, userReferences: string[] = [], limit = 18): string[] {
  const targetTerritories = new Set([...(genre ? genreTerritories[genre] ?? [] : []), ...inferTerritories(features)]);
  const scored = MUSIC_DNA_ARTIST_REFERENCES
    .map((reference) => ({
      reference,
      score: reference.territories.filter((territory) => targetTerritories.has(territory)).length * 2
        + reference.tags.filter((tag) => targetTerritories.has(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || a.reference.artist.localeCompare(b.reference.artist));

  return Array.from(new Set([...userReferences, ...scored.filter((item) => item.score > 0).map((item) => item.reference.artist), ...ALL_REFERENCE_ARTISTS])).slice(0, limit);
}