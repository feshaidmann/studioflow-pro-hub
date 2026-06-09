import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeFeatures,
  classifyGenre,
  mergeProfiles,
  HARDCODED_GENRE_PROFILES,
  type RawTrackFeatures,
  type BenchmarkRow,
} from "../genreClassifier";

const BASE_FEATURES: RawTrackFeatures = {
  tempo_bpm: 120,
  danceability: 0.8,
  energy: 0.7,
  acousticness: 0.1,
  instrumentalness: 0.05,
  valence: 0.6,
  speechiness: 0.08,
  loudness_rms_db: -6,
};

describe("normalizeFeatures", () => {
  it("normalizes valid features to 0-1 range", () => {
    const result = normalizeFeatures(BASE_FEATURES);
    expect(result).not.toBeNull();
    for (const v of Object.values(result!)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("returns null when tempo_bpm is missing", () => {
    expect(normalizeFeatures({ ...BASE_FEATURES, tempo_bpm: null })).toBeNull();
  });

  it("returns null when both loudness fields are missing", () => {
    const f: RawTrackFeatures = { ...BASE_FEATURES, loudness_rms_db: null, lufs_integrated: null };
    expect(normalizeFeatures(f)).toBeNull();
  });

  it("uses lufs_integrated as fallback for loudness", () => {
    const f: RawTrackFeatures = { ...BASE_FEATURES, loudness_rms_db: null, lufs_integrated: -9 };
    const result = normalizeFeatures(f);
    expect(result).not.toBeNull();
    expect(result!.loudness).toBeGreaterThan(0);
  });

  it("clamps out-of-range values to 0-1", () => {
    const f: RawTrackFeatures = { ...BASE_FEATURES, danceability: 5, energy: -2 };
    const result = normalizeFeatures(f);
    expect(result!.danceability).toBe(1);
    expect(result!.energy).toBe(0);
  });

  it("normalizes 50 BPM (minimum) to ~0", () => {
    const result = normalizeFeatures({ ...BASE_FEATURES, tempo_bpm: 50 });
    expect(result!.tempo).toBe(0);
  });

  it("normalizes 200 BPM (maximum) to ~1", () => {
    const result = normalizeFeatures({ ...BASE_FEATURES, tempo_bpm: 200 });
    expect(result!.tempo).toBe(1);
  });
});

describe("classifyGenre", () => {
  it("returns null for features missing tempo", () => {
    const result = classifyGenre({ tempo_bpm: null, loudness_rms_db: -6 }, HARDCODED_GENRE_PROFILES);
    expect(result).toBeNull();
  });

  it("returns null when profiles is empty", () => {
    const result = classifyGenre(BASE_FEATURES, {});
    expect(result).toBeNull();
  });

  it("returns a ClassifierResult with all expected fields", () => {
    const result = classifyGenre(BASE_FEATURES, HARDCODED_GENRE_PROFILES);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("detected");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("scorePct");
    expect(result).toHaveProperty("gapPct");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("top3");
  });

  it("score is between 0 and 1", () => {
    const result = classifyGenre(BASE_FEATURES, HARDCODED_GENRE_PROFILES);
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(1);
  });

  it("scorePct is between 0 and 100", () => {
    const result = classifyGenre(BASE_FEATURES, HARDCODED_GENRE_PROFILES);
    expect(result!.scorePct).toBeGreaterThanOrEqual(0);
    expect(result!.scorePct).toBeLessThanOrEqual(100);
  });

  it("top3 has at most 3 items", () => {
    const result = classifyGenre(BASE_FEATURES, HARDCODED_GENRE_PROFILES);
    expect(result!.top3.length).toBeLessThanOrEqual(3);
  });

  it("confidence is 'alta' when gap >= 10", () => {
    // Use a profile with only one genre to force gap = 100
    const singleProfile = { "Pop Internacional": HARDCODED_GENRE_PROFILES["Pop Internacional"] };
    const result = classifyGenre(BASE_FEATURES, singleProfile);
    expect(result!.confidence).toBe("alta");
    expect(result!.gapPct).toBe(100);
  });

  it("detects Funk Carioca for high danceability + high speechiness + high energy", () => {
    const funkFeatures: RawTrackFeatures = {
      tempo_bpm: 140,
      danceability: 0.95,
      energy: 0.90,
      acousticness: 0.04,
      instrumentalness: 0.01,
      valence: 0.62,
      speechiness: 0.24,
      loudness_rms_db: -3,
    };
    const result = classifyGenre(funkFeatures, HARDCODED_GENRE_PROFILES);
    expect(result!.detected).toBe("Funk Carioca");
  });

  it("detects Ambient for low tempo + high acousticness + high instrumentalness", () => {
    const ambientFeatures: RawTrackFeatures = {
      tempo_bpm: 65,
      danceability: 0.18,
      energy: 0.15,
      acousticness: 0.88,
      instrumentalness: 0.82,
      valence: 0.45,
      speechiness: 0.03,
      loudness_rms_db: -24,
    };
    const result = classifyGenre(ambientFeatures, HARDCODED_GENRE_PROFILES);
    expect(result!.detected).toBe("Ambient");
  });

  it("top3 items are sorted by descending score", () => {
    const result = classifyGenre(BASE_FEATURES, HARDCODED_GENRE_PROFILES);
    for (let i = 0; i < result!.top3.length - 1; i++) {
      expect(result!.top3[i].score).toBeGreaterThanOrEqual(result!.top3[i + 1].score);
    }
  });
});

describe("mergeProfiles", () => {
  const minimalBenchmark: BenchmarkRow = {
    genero: "Test Genre",
    total_faixas: 25,
    avg_tempo_bpm: 120,
    avg_danceability: 0.7,
    avg_energy: 0.7,
    avg_acousticness: 0.2,
    avg_instrumentalness: 0.1,
    avg_valence: 0.6,
    avg_speechiness: 0.1,
    avg_loudness_db: -8,
  };

  it("adds new genre from benchmark", () => {
    const merged = mergeProfiles(HARDCODED_GENRE_PROFILES, [minimalBenchmark]);
    expect(merged).toHaveProperty("Test Genre");
  });

  it("skips benchmark with fewer tracks than minTracks", () => {
    const sparse: BenchmarkRow = { ...minimalBenchmark, total_faixas: 5 };
    const merged = mergeProfiles(HARDCODED_GENRE_PROFILES, [sparse]);
    expect(merged).not.toHaveProperty("Test Genre");
  });

  it("skips benchmark with null total_faixas", () => {
    const noCount: BenchmarkRow = { ...minimalBenchmark, total_faixas: null };
    const merged = mergeProfiles(HARDCODED_GENRE_PROFILES, [noCount]);
    expect(merged).not.toHaveProperty("Test Genre");
  });

  it("skips benchmark with missing required audio features", () => {
    const noTempo: BenchmarkRow = { ...minimalBenchmark, avg_tempo_bpm: null };
    const merged = mergeProfiles(HARDCODED_GENRE_PROFILES, [noTempo]);
    expect(merged).not.toHaveProperty("Test Genre");
  });

  it("does not mutate the original hardcoded profiles object", () => {
    const original = { ...HARDCODED_GENRE_PROFILES };
    mergeProfiles(HARDCODED_GENRE_PROFILES, [minimalBenchmark]);
    expect(HARDCODED_GENRE_PROFILES).toEqual(original);
  });

  it("overrides existing genre when benchmark has enough tracks", () => {
    const override: BenchmarkRow = { ...minimalBenchmark, genero: "Pop", avg_energy: 0.99 };
    const merged = mergeProfiles(HARDCODED_GENRE_PROFILES, [override]);
    // Energy 0.99 is already within 0-1, clamped
    expect(merged["Pop"].energy).toBeCloseTo(0.99, 1);
  });
});
