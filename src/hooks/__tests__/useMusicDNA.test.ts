import { describe, it, expect, vi } from "vitest";
import {
  calcDistance,
  getAveragePreset,
  toRadarData,
  calibrateForCatalog,
  detectProductionTier,
  filterValidReferences,
  repairJsonString,
  GENRE_PRESETS,
  FEATURE_KEYS,
  FEATURE_LABELS,
  BROWSER_CALIBRATION,
} from "../useMusicDNA";
import type { AudioFeatures, ReferenceMatch, CatalogNeighbor } from "../useMusicDNA";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ trackAppEvent: vi.fn() }));
vi.mock("@/lib/audioAnalysis", () => ({ analyzeAudioFull: vi.fn() }));
vi.mock("@/lib/instrumentDetection", () => ({ detectInstruments: vi.fn() }));
vi.mock("@/lib/musicDnaLookup", () => ({ lookupMusicDnaReferences: vi.fn() }));
vi.mock("@/lib/musicDnaReferences", () => ({
  ALL_REFERENCE_ARTISTS: [],
  selectReferenceArtists: vi.fn().mockReturnValue([]),
}));
vi.mock("@/types/musicDna", () => ({ KEY_NAMES: [] }));
vi.mock("@/lib/genreClassifier", () => ({
  classifyGenre: vi.fn(),
  HARDCODED_GENRE_PROFILES: {},
  mergeProfiles: vi.fn().mockReturnValue({}),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFeatures(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    energy: 0.5,
    danceability: 0.5,
    acousticness: 0.5,
    valence: 0.5,
    instrumentalness: 0.5,
    liveness: 0.5,
    ...overrides,
  };
}

function makeNeighbor(band: string, similarity_score: number): CatalogNeighbor {
  return {
    band,
    filename: "track.mp3",
    genre: "Pop",
    similarity_score,
    tempo_bpm: null,
    lufs_integrated: null,
    key_name: null,
    mode: null,
    energy: null,
    danceability: null,
    valence: null,
    acousticness: null,
    instrumentalness: null,
    dynamic_range_db: null,
    spectral_centroid: null,
  };
}

function makeRef(artista: string): ReferenceMatch {
  return { artista, similaridade: "alta", motivo: "timbre similar" };
}

// ── calcDistance ──────────────────────────────────────────────────────────────

describe("calcDistance", () => {
  it("returns 0 for identical features", () => {
    const f = makeFeatures();
    expect(calcDistance(f, f)).toBe(0);
  });

  it("returns 1 when all features differ by 1 (all-zeros vs all-ones)", () => {
    const zeros = makeFeatures({ energy: 0, danceability: 0, acousticness: 0, valence: 0, instrumentalness: 0, liveness: 0 });
    const ones  = makeFeatures({ energy: 1, danceability: 1, acousticness: 1, valence: 1, instrumentalness: 1, liveness: 1 });
    expect(calcDistance(zeros, ones)).toBeCloseTo(1.0);
  });

  it("returns sqrt(1/6) when only one feature differs by 1", () => {
    const a = makeFeatures({ energy: 0, danceability: 0, acousticness: 0, valence: 0, instrumentalness: 0, liveness: 0 });
    const b = makeFeatures({ energy: 1, danceability: 0, acousticness: 0, valence: 0, instrumentalness: 0, liveness: 0 });
    expect(calcDistance(a, b)).toBeCloseTo(Math.sqrt(1 / 6));
  });

  it("returns 0.5 when all features differ uniformly by 0.5", () => {
    const zeros = makeFeatures({ energy: 0, danceability: 0, acousticness: 0, valence: 0, instrumentalness: 0, liveness: 0 });
    const halfs = makeFeatures({ energy: 0.5, danceability: 0.5, acousticness: 0.5, valence: 0.5, instrumentalness: 0.5, liveness: 0.5 });
    expect(calcDistance(zeros, halfs)).toBeCloseTo(0.5);
  });

  it("is symmetric: calcDistance(a, b) === calcDistance(b, a)", () => {
    const a = makeFeatures({ energy: 0.3, valence: 0.8 });
    const b = makeFeatures({ energy: 0.7, valence: 0.2 });
    expect(calcDistance(a, b)).toBeCloseTo(calcDistance(b, a));
  });

  it("uses all 6 FEATURE_KEYS in the computation", () => {
    // Two features identical on all but liveness — only liveness contributes
    const a = makeFeatures({ liveness: 0 });
    const b = makeFeatures({ liveness: 1 });
    expect(calcDistance(a, b)).toBeCloseTo(Math.sqrt(1 / 6));
  });
});

// ── getAveragePreset ──────────────────────────────────────────────────────────

describe("getAveragePreset", () => {
  it("returns an object with all 6 feature keys", () => {
    const avg = getAveragePreset();
    for (const k of FEATURE_KEYS) {
      expect(avg).toHaveProperty(k);
    }
  });

  it("each value is a finite number between 0 and 1", () => {
    const avg = getAveragePreset();
    for (const k of FEATURE_KEYS) {
      expect(avg[k]).toBeGreaterThanOrEqual(0);
      expect(avg[k]).toBeLessThanOrEqual(1);
    }
  });

  it("energy average lies within the range of GENRE_PRESETS energy values", () => {
    const energies = Object.values(GENRE_PRESETS).map((g) => g.energy);
    const min = Math.min(...energies);
    const max = Math.max(...energies);
    const avg = getAveragePreset().energy;
    expect(avg).toBeGreaterThan(min);
    expect(avg).toBeLessThan(max);
  });

  it("is deterministic — same result on repeated calls", () => {
    expect(getAveragePreset()).toEqual(getAveragePreset());
  });
});

// ── toRadarData ───────────────────────────────────────────────────────────────

describe("toRadarData", () => {
  it("returns exactly 6 items (one per FEATURE_KEY)", () => {
    expect(toRadarData(makeFeatures(), makeFeatures())).toHaveLength(FEATURE_KEYS.length);
  });

  it("each item has subject, Faixa, Referência, fullMark", () => {
    const rows = toRadarData(makeFeatures(), makeFeatures());
    for (const row of rows) {
      expect(row).toHaveProperty("subject");
      expect(row).toHaveProperty("Faixa");
      expect(row).toHaveProperty("Referência");
      expect(row).toHaveProperty("fullMark");
    }
  });

  it("fullMark is always 100", () => {
    const rows = toRadarData(makeFeatures(), makeFeatures());
    for (const row of rows) {
      expect(row.fullMark).toBe(100);
    }
  });

  it("Faixa and Referência are rounded integers in [0, 100]", () => {
    const track = makeFeatures({ energy: 0.75 });
    const ref   = makeFeatures({ energy: 0.333 });
    const rows  = toRadarData(track, ref);
    const energy = rows.find((r) => r.subject === FEATURE_LABELS.energy)!;
    expect(energy.Faixa).toBe(75);
    expect(energy.Referência).toBe(33);
  });

  it("subject values match FEATURE_LABELS", () => {
    const subjects = toRadarData(makeFeatures(), makeFeatures()).map((r) => r.subject);
    for (const label of Object.values(FEATURE_LABELS)) {
      expect(subjects).toContain(label);
    }
  });
});

// ── calibrateForCatalog ───────────────────────────────────────────────────────

describe("calibrateForCatalog", () => {
  const input = {
    lufs_integrated: -14,
    spectral_centroid_hz: 2000,
    spectral_rolloff: 4000,
    spectral_flatness: 0.02,
    spectral_bandwidth_hz: 1500,
  };

  it("passes through non-null values with current identity calibration", () => {
    const r = calibrateForCatalog(input);
    expect(r.lufs_integrated).toBeCloseTo(-14 + BROWSER_CALIBRATION.lufs_offset_db);
    expect(r.spectral_centroid_hz).toBeCloseTo(2000 * BROWSER_CALIBRATION.centroid_scale);
    expect(r.spectral_rolloff).toBeCloseTo(4000 * BROWSER_CALIBRATION.rolloff_scale);
    expect(r.spectral_flatness).toBeCloseTo(0.02 + BROWSER_CALIBRATION.flatness_offset);
    expect(r.spectral_bandwidth_hz).toBe(1500);
  });

  it("returns null for all nullable fields when inputs are null", () => {
    const r = calibrateForCatalog({ lufs_integrated: null, spectral_centroid_hz: null, spectral_rolloff: null, spectral_flatness: null, spectral_bandwidth_hz: null });
    expect(r.lufs_integrated).toBeNull();
    expect(r.spectral_centroid_hz).toBeNull();
    expect(r.spectral_rolloff).toBeNull();
    expect(r.spectral_flatness).toBeNull();
    expect(r.spectral_bandwidth_hz).toBeNull();
  });

  it("passes spectral_bandwidth_hz through unchanged (no calibration constant for it)", () => {
    const r = calibrateForCatalog({ ...input, spectral_bandwidth_hz: 999 });
    expect(r.spectral_bandwidth_hz).toBe(999);
  });
});

// ── detectProductionTier ──────────────────────────────────────────────────────

describe("detectProductionTier", () => {
  const base = { lufs_integrated: -14, dynamic_range_lu: 9, true_peak_dbtp: -2, spectral_centroid_hz: 2500 };

  it("pro-leaning: lufs >= -10 AND dr < 7", () => {
    expect(detectProductionTier({ ...base, lufs_integrated: -9, dynamic_range_lu: 6 })).toBe("pro-leaning");
  });

  it("pro-leaning: boundary lufs = -10 with dr = 6.9", () => {
    expect(detectProductionTier({ ...base, lufs_integrated: -10, dynamic_range_lu: 6.9 })).toBe("pro-leaning");
  });

  it("pro-leaning: lufs >= -11 AND tp >= -2 AND dr < 9 AND centroid > 2000", () => {
    expect(detectProductionTier({ lufs_integrated: -11, dynamic_range_lu: 8, true_peak_dbtp: -2, spectral_centroid_hz: 2001 })).toBe("pro-leaning");
  });

  it("NOT pro-leaning when centroid equals exactly 2000 (must be strictly greater)", () => {
    const result = detectProductionTier({ lufs_integrated: -11, dynamic_range_lu: 8, true_peak_dbtp: -2, spectral_centroid_hz: 2000 });
    expect(result).not.toBe("pro-leaning");
  });

  it("bedroom: lufs < -18", () => {
    expect(detectProductionTier({ ...base, lufs_integrated: -19 })).toBe("bedroom");
  });

  it("bedroom: lufs < -16 AND dr > 11", () => {
    expect(detectProductionTier({ ...base, lufs_integrated: -17, dynamic_range_lu: 12 })).toBe("bedroom");
  });

  it("bedroom: lufs < -16 AND liveness > 0.3", () => {
    expect(detectProductionTier({ ...base, lufs_integrated: -17, liveness: 0.4 })).toBe("bedroom");
  });

  it("bedroom: lufs < -16 AND tp < -3", () => {
    expect(detectProductionTier({ ...base, lufs_integrated: -17, true_peak_dbtp: -4 })).toBe("bedroom");
  });

  it("bedroom: dr > 14 AND centroid < 2000 AND lufs < -14", () => {
    expect(detectProductionTier({ lufs_integrated: -15, dynamic_range_lu: 15, true_peak_dbtp: -5, spectral_centroid_hz: 1999 })).toBe("bedroom");
  });

  it("liveness defaults to 0 when undefined — does not trigger bedroom alone", () => {
    const result = detectProductionTier({ lufs_integrated: -17, dynamic_range_lu: 8, true_peak_dbtp: -2, spectral_centroid_hz: 2000 });
    expect(result).toBe("mid");
  });

  it("mid: typical well-recorded home studio track", () => {
    expect(detectProductionTier({ lufs_integrated: -14, dynamic_range_lu: 9, true_peak_dbtp: -2, spectral_centroid_hz: 2500 })).toBe("mid");
  });
});

// ── filterValidReferences ─────────────────────────────────────────────────────

describe("filterValidReferences", () => {
  it("returns [] when rawRefs is empty", () => {
    expect(filterValidReferences([], [makeNeighbor("Artist A", 0.9)])).toEqual([]);
  });

  it("returns [] when no neighbors meet the floor", () => {
    const refs = [makeRef("Artist A")];
    const neighbors = [makeNeighbor("Artist A", 0.5)];
    expect(filterValidReferences(refs, neighbors)).toEqual([]);
  });

  it("keeps a ref whose artista matches a neighbor with score >= floor", () => {
    const refs = [makeRef("Artist A")];
    const neighbors = [makeNeighbor("Artist A", 0.8)];
    expect(filterValidReferences(refs, neighbors)).toEqual(refs);
  });

  it("drops a ref whose artista is not in the valid neighbor set", () => {
    const refs = [makeRef("Unknown Band")];
    const neighbors = [makeNeighbor("Artist A", 0.9)];
    expect(filterValidReferences(refs, neighbors)).toEqual([]);
  });

  it("matching is case-insensitive", () => {
    const refs = [makeRef("Artist A")];
    const neighbors = [makeNeighbor("artist a", 0.9)];
    expect(filterValidReferences(refs, neighbors)).toHaveLength(1);
  });

  it("custom floor of 0.5 accepts neighbors that the default 0.7 would reject", () => {
    const refs = [makeRef("Artist A")];
    const neighbors = [makeNeighbor("Artist A", 0.6)];
    expect(filterValidReferences(refs, neighbors, 0.5)).toHaveLength(1);
    expect(filterValidReferences(refs, neighbors, 0.7)).toHaveLength(0);
  });

  it("filters out refs with empty artista", () => {
    const refs = [makeRef("")];
    const neighbors = [makeNeighbor("", 0.9)];
    expect(filterValidReferences(refs, neighbors)).toEqual([]);
  });
});

// ── repairJsonString ──────────────────────────────────────────────────────────

describe("repairJsonString", () => {
  it("returns valid JSON string unchanged", () => {
    const valid = '{"key": "value", "num": 42}';
    expect(repairJsonString(valid)).toBe(valid);
  });

  it("adds double-quotes to unquoted object keys", () => {
    const broken = '{key: "value"}';
    const result = repairJsonString(broken);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("removes trailing comma before closing brace", () => {
    const broken = '{"key": "value",}';
    const result = repairJsonString(broken);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("removes trailing comma before closing bracket", () => {
    const broken = '{"arr": [1, 2, 3,]}';
    const result = repairJsonString(broken);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ arr: [1, 2, 3] });
  });

  it("repairs both unquoted keys and trailing commas together", () => {
    const broken = '{key: "value", name: "test",}';
    const result = repairJsonString(broken);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ key: "value", name: "test" });
  });

  it("does not re-quote already-quoted keys", () => {
    const input = '{"already": "quoted", unquoted: "not"}';
    const result = repairJsonString(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ already: "quoted", unquoted: "not" });
  });

  it("does not corrupt colon-containing string values", () => {
    const broken = '{motivo: "patamar: bedroom, label: indie"}';
    const result = repairJsonString(broken);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ motivo: "patamar: bedroom, label: indie" });
  });

  it("handles nested string values with commas and colons safely", () => {
    const broken = '{artista: "Ana Vilela", descricao: "tempo: 120 bpm, energia: alta"}';
    const result = repairJsonString(broken);
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.artista).toBe("Ana Vilela");
    expect(parsed.descricao).toBe("tempo: 120 bpm, energia: alta");
  });
});
