import { KEY_NAMES, type SpotifyFeatures } from "@/types/musicDna";

export type MusicDnaSource = "acousticbrainz" | "deezer" | "web_audio";

export interface MusicDnaLookupResult {
  features: Partial<SpotifyFeatures>;
  fonte: MusicDnaSource;
  mbid?: string;
  deezerId?: number;
  previewUrl?: string;
}

export function parseArtistTitle(trackName: string) {
  const parts = trackName.split(/\s[-–—]\s/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { artista: parts[0], titulo: parts.slice(1).join(" - ") };
  return { titulo: trackName.trim() };
}

async function buscarMBID(artista: string, titulo: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${titulo} artist:${artista}`);
    const response = await fetch(`https://musicbrainz.org/ws/2/recording?query=${query}&fmt=json&limit=1`, {
      headers: { "User-Agent": "StudioFlowPro/2.0 (suporte@jamsessionproject.com.br)" },
    });
    const data = await response.json();
    return data.recordings?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function buscarAcousticBrainz(mbid: string): Promise<Partial<SpotifyFeatures> | null> {
  try {
    const [hl, ll] = await Promise.all([
      fetch(`https://acousticbrainz.org/${mbid}/high-level`).then((r) => r.json()),
      fetch(`https://acousticbrainz.org/${mbid}/low-level`).then((r) => r.json()),
    ]);
    if (hl.error || ll.error) return null;

    const key = ll?.tonal?.key_key ?? "C";
    const keyIndex = KEY_NAMES.indexOf(key as (typeof KEY_NAMES)[number]);
    const scale = ll?.tonal?.key_scale ?? "major";
    const probability = (path: string[], fallback: number) => {
      const value = path.reduce<any>((acc, item) => acc?.[item], hl);
      return typeof value === "number" ? Math.max(0, Math.min(1, value > 1 ? value / 100 : value)) : fallback;
    };

    return {
      tempo: Number(ll?.rhythm?.bpm ?? 0),
      key: keyIndex >= 0 ? keyIndex : 0,
      mode: scale === "major" ? 1 : 0,
      loudness: Number(ll?.lowlevel?.average_loudness ?? -14),
      danceability: probability(["highlevel", "danceability", "all", "danceable"], 0.5),
      valence: probability(["highlevel", "mood_happy", "all", "happy"], 0.5),
      instrumentalness: probability(["highlevel", "voice_instrumental", "all", "instrumental"], 0.3),
      acousticness: probability(["highlevel", "mood_acoustic", "all", "acoustic"], 0.5),
      energy: 0.5,
      speechiness: 0.05,
      liveness: 0.1,
      duration_ms: 0,
      time_signature: 4,
    };
  } catch {
    return null;
  }
}

async function buscarDeezer(artista: string | undefined, titulo: string): Promise<MusicDnaLookupResult | null> {
  try {
    const query = encodeURIComponent([titulo, artista].filter(Boolean).join(" "));
    const response = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);
    const data = await response.json();
    const track = data.data?.[0];
    if (!track) return null;

    return {
      fonte: "deezer",
      deezerId: track.id ?? undefined,
      previewUrl: track.preview ?? undefined,
      features: {
        tempo: Number(track.bpm ?? 0),
        duration_ms: Number(track.duration ?? 0) * 1000,
      },
    };
  } catch {
    return null;
  }
}

export async function lookupMusicDnaReferences(trackName: string): Promise<MusicDnaLookupResult | null> {
  const { artista, titulo } = parseArtistTitle(trackName);
  return lookupMusicDnaByMetadata({ artista, titulo });
}

export async function lookupMusicDnaByMetadata(input: { artista?: string; titulo?: string }): Promise<MusicDnaLookupResult | null> {
  const { artista, titulo } = input;
  if (!titulo?.trim()) return null;
  if (artista && titulo) {
    const mbid = await buscarMBID(artista, titulo);
    if (mbid) {
      const features = await buscarAcousticBrainz(mbid);
      if (features) return { features, fonte: "acousticbrainz", mbid };
    }
  }
  return buscarDeezer(artista, titulo);
}