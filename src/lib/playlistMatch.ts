import { supabase } from "@/integrations/supabase/client";

/**
 * Perfis de "playlists alvo" derivados por clustering offline do banco de
 * `music_reference_tracks`. Cada perfil é um centroide nas features-chave
 * usadas pelo Music DNA. Veja seed em
 * supabase/migrations/...playlist_profiles.
 */
export interface PlaylistProfile {
  id: string;
  slug: string;
  name: string;
  description: string;
  vector: PlaylistFeatureVector;
  feature_ranges: PlaylistFeatureVector;
  sample_tracks: { band: string; filename: string }[];
  size: number;
}

export interface PlaylistFeatureVector {
  lufs_integrated?: number;
  dynamic_range_db?: number;
  spectral_centroid?: number;
  tempo_bpm?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
}

export interface PlaylistMatch {
  profile: PlaylistProfile;
  distance: number;
  /** 0..1, maior = melhor compatibilidade. */
  score: number;
  /** Top 3 features que mais distanciam o usuário do centroide. */
  gaps: Array<{ feature: keyof PlaylistFeatureVector; delta: number; userValue: number; targetValue: number }>;
}

const FEATURE_KEYS: Array<keyof PlaylistFeatureVector> = [
  "lufs_integrated",
  "dynamic_range_db",
  "spectral_centroid",
  "tempo_bpm",
  "energy",
  "danceability",
  "valence",
  "acousticness",
];

// Escalas aproximadas para normalização (mesma ordem de FEATURE_KEYS)
const FEATURE_SCALE: Record<keyof PlaylistFeatureVector, number> = {
  lufs_integrated: 4,
  dynamic_range_db: 8,
  spectral_centroid: 700,
  tempo_bpm: 25,
  energy: 0.1,
  danceability: 0.1,
  valence: 0.12,
  acousticness: 0.13,
};

let cachedProfiles: PlaylistProfile[] | null = null;

export async function loadPlaylistProfiles(): Promise<PlaylistProfile[]> {
  if (cachedProfiles) return cachedProfiles;
  const { data, error } = await supabase
    .from("playlist_profiles")
    .select("id, slug, name, description, vector, feature_ranges, sample_tracks, size");
  if (error) {
    console.error("[playlistMatch] erro carregando perfis", error);
    return [];
  }
  cachedProfiles = (data || []) as unknown as PlaylistProfile[];
  return cachedProfiles;
}

export function matchPlaylists(
  user: PlaylistFeatureVector,
  profiles: PlaylistProfile[],
  topN = 3
): PlaylistMatch[] {
  const matches = profiles.map((profile) => {
    let dist = 0;
    let dims = 0;
    const perFeature: Array<{ feature: keyof PlaylistFeatureVector; delta: number; userValue: number; targetValue: number }> = [];
    for (const key of FEATURE_KEYS) {
      const u = user[key];
      const t = profile.vector[key];
      if (u == null || t == null || Number.isNaN(u) || Number.isNaN(t)) continue;
      const scale = FEATURE_SCALE[key] || 1;
      const delta = (u - t) / scale;
      dist += delta * delta;
      dims += 1;
      perFeature.push({ feature: key, delta: Math.abs(delta), userValue: u, targetValue: t });
    }
    const distance = dims > 0 ? Math.sqrt(dist / dims) : Number.POSITIVE_INFINITY;
    // score em 0..1 — distancia 0 = 1.0; distância 1.5+ ~ 0.1
    const score = Math.max(0, Math.min(1, 1 / (1 + distance)));
    const gaps = perFeature.sort((a, b) => b.delta - a.delta).slice(0, 3);
    return { profile, distance, score, gaps } satisfies PlaylistMatch;
  });
  return matches.sort((a, b) => a.distance - b.distance).slice(0, topN);
}

export const FEATURE_LABELS: Record<keyof PlaylistFeatureVector, string> = {
  lufs_integrated: "Loudness (LUFS)",
  dynamic_range_db: "Dinâmica (dB)",
  spectral_centroid: "Brilho (Hz)",
  tempo_bpm: "Andamento (BPM)",
  energy: "Energia",
  danceability: "Dançabilidade",
  valence: "Valência",
  acousticness: "Acústico",
};
