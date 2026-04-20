import type { DiagnosisResult } from "@/hooks/useMusicDNA";

export interface SpotifyFeatures {
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export interface MusicDnaBenchmark {
  genero: string;
  total_faixas: number;
  avg_danceability: number | null;
  avg_energy: number | null;
  avg_loudness_db: number | null;
  avg_speechiness: number | null;
  avg_acousticness: number | null;
  avg_instrumentalness: number | null;
  avg_liveness: number | null;
  avg_valence: number | null;
  avg_tempo_bpm: number | null;
  avg_lufs: number | null;
  top_keys: Record<string, number> | null;
}

export const LUFS_TARGETS = {
  Spotify: -14,
  "Apple Music": -16,
  YouTube: -14,
  Deezer: -15,
  "Amazon Music": -14,
} as const;

export const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const FEATURE_DESCRIPTIONS: Record<keyof SpotifyFeatures, string> = {
  danceability: "Quão adequada para dançar",
  energy: "Intensidade e atividade",
  key: "Tonalidade",
  loudness: "Loudness médio (dB)",
  mode: "Modo (maior/menor)",
  speechiness: "Presença de fala",
  acousticness: "Confiança de acústico",
  instrumentalness: "Ausência de voz",
  liveness: "Gravação ao vivo",
  valence: "Positividade musical",
  tempo: "BPM",
  duration_ms: "Duração",
  time_signature: "Compasso",
};

export function spotifyFeaturesFromDiagnosis(diagnosis: DiagnosisResult): SpotifyFeatures {
  const analysis = diagnosis.realAnalysis;
  const keyIndex = Math.max(0, KEY_NAMES.findIndex((key) => analysis.key?.startsWith(key)));
  const mode = /minor|menor|m\b/i.test(analysis.key ?? "") ? 0 : 1;

  return {
    danceability: analysis.danceability,
    energy: analysis.energy,
    key: keyIndex,
    loudness: analysis.rms_dbfs,
    mode,
    speechiness: analysis.speechiness,
    acousticness: analysis.acousticness,
    instrumentalness: analysis.instrumentalness,
    liveness: analysis.liveness,
    valence: analysis.valence,
    tempo: analysis.bpm,
    duration_ms: Math.round(analysis.duration_sec * 1000),
    time_signature: 4,
  };
}

export function musicDnaColumnsFromDiagnosis(diagnosis: DiagnosisResult) {
  const features = spotifyFeaturesFromDiagnosis(diagnosis);
  return {
    danceability: features.danceability,
    energy: features.energy,
    key_number: features.key,
    key_name: KEY_NAMES[features.key] ?? "C",
    loudness_db: features.loudness,
    mode_number: features.mode,
    mode_name: features.mode === 1 ? "major" : "minor",
    speechiness: features.speechiness,
    acousticness: features.acousticness,
    instrumentalness: features.instrumentalness,
    liveness: features.liveness,
    valence: features.valence,
    tempo_bpm: features.tempo,
    duration_ms: features.duration_ms,
    time_signature: features.time_signature,
    lufs_integrated: diagnosis.realAnalysis.lufs_integrated,
    dynamic_range_db: diagnosis.realAnalysis.dynamic_range_lu,
    fonte_analise: "web_audio",
  };
}