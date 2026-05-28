import { type SpotifyFeatures } from "@/types/musicDna";

export type MusicDnaSource = "deezer" | "web_audio";

export interface MusicDnaLookupResult {
  features: Partial<SpotifyFeatures>;
  fonte: MusicDnaSource;
  deezerId?: number;
  previewUrl?: string;
  spotify_id?: string | null;
}

export function parseArtistTitle(trackName: string) {
  const parts = trackName.split(/\s[-–—]\s/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { artista: parts[0], titulo: parts.slice(1).join(" - ") };
  return { titulo: trackName.trim() };
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
  return buscarDeezer(artista, titulo);
}
