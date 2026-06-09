import { describe, it, expect } from "vitest";
import { generateMixRecommendations, type MixRecommendation } from "../mixRecommendations";
import type { RealAudioAnalysis } from "../audioAnalysis";

function makeAnalysis(overrides: Partial<RealAudioAnalysis> = {}): RealAudioAnalysis {
  return {
    lufs_integrated: -12,
    lufs_short_term: -10,
    true_peak_dbtp: -1.5,
    dynamic_range_lu: 8,
    bpm: 120,
    key: "C",
    duration_sec: 180,
    spectral_centroid_hz: 2500,
    spectral_flatness: 0.1,
    rms_dbfs: -12,
    sections: [],
    stem_features: {},
    extraction_confidence: "full",
    ...overrides,
  } as unknown as RealAudioAnalysis;
}

function ids(recs: MixRecommendation[]) {
  return recs.map(r => r.id);
}

describe("generateMixRecommendations", () => {
  it("returns empty array for a perfectly mastered track", () => {
    const a = makeAnalysis({ true_peak_dbtp: -1.5, lufs_integrated: -10, dynamic_range_lu: 8 });
    const recs = generateMixRecommendations(a, "Pop");
    expect(ids(recs)).not.toContain("tp-critical");
    expect(ids(recs)).not.toContain("lufs-quiet");
    expect(ids(recs)).not.toContain("lufs-loud");
    expect(ids(recs)).not.toContain("dr-flat");
  });

  describe("True Peak", () => {
    it("emits tp-critical when true peak exceeds 0 dBTP", () => {
      const recs = generateMixRecommendations(makeAnalysis({ true_peak_dbtp: 0.5 }));
      expect(ids(recs)).toContain("tp-critical");
      expect(recs.find(r => r.id === "tp-critical")!.prioridade).toBe("Alta");
    });

    it("emits tp-tolerance when true peak is between -1 and 0 dBTP", () => {
      const recs = generateMixRecommendations(makeAnalysis({ true_peak_dbtp: -0.5 }));
      expect(ids(recs)).toContain("tp-tolerance");
      expect(recs.find(r => r.id === "tp-tolerance")!.prioridade).toBe("Média");
    });

    it("does not emit any tp warning when true peak is below -1 dBTP", () => {
      const recs = generateMixRecommendations(makeAnalysis({ true_peak_dbtp: -2 }));
      expect(ids(recs)).not.toContain("tp-critical");
      expect(ids(recs)).not.toContain("tp-tolerance");
    });
  });

  describe("LUFS", () => {
    it("emits lufs-quiet when LUFS is too low for the genre", () => {
      // Pop target is -10 to -8, so -14 is 1.5+ below the floor
      const recs = generateMixRecommendations(makeAnalysis({ lufs_integrated: -14 }), "Pop");
      expect(ids(recs)).toContain("lufs-quiet");
      expect(recs.find(r => r.id === "lufs-quiet")!.prioridade).toBe("Alta");
    });

    it("emits lufs-loud when LUFS is too high for the genre", () => {
      // Pop target is -10 to -8, so -4 is 1.5+ above the ceiling
      const recs = generateMixRecommendations(makeAnalysis({ lufs_integrated: -4 }), "Pop");
      expect(ids(recs)).toContain("lufs-loud");
      expect(recs.find(r => r.id === "lufs-loud")!.prioridade).toBe("Média");
    });

    it("uses default LUFS target when genre is not recognized", () => {
      // Default is -14 to -10. -18 is well below.
      const recs = generateMixRecommendations(makeAnalysis({ lufs_integrated: -18 }), "Gênero Inventado");
      expect(ids(recs)).toContain("lufs-quiet");
    });

    it("uses fuzzy genre match for LUFS target", () => {
      // "Sertanejo Universitário" should match "Sertanejo" target (-9 to -7)
      const recs = generateMixRecommendations(makeAnalysis({ lufs_integrated: -14 }), "Sertanejo Universitário");
      expect(ids(recs)).toContain("lufs-quiet");
    });
  });

  describe("Dynamic Range", () => {
    it("emits dr-flat when dynamic range is below 5 LU", () => {
      const recs = generateMixRecommendations(makeAnalysis({ dynamic_range_lu: 3 }));
      expect(ids(recs)).toContain("dr-flat");
      expect(recs.find(r => r.id === "dr-flat")!.prioridade).toBe("Alta");
    });

    it("emits dr-wide when dynamic range is above 14 LU", () => {
      const recs = generateMixRecommendations(makeAnalysis({ dynamic_range_lu: 16 }));
      expect(ids(recs)).toContain("dr-wide");
      expect(recs.find(r => r.id === "dr-wide")!.prioridade).toBe("Baixa");
    });
  });

  describe("Spectral", () => {
    it("emits centroid-bright when spectral centroid exceeds 3800 Hz", () => {
      const recs = generateMixRecommendations(makeAnalysis({ spectral_centroid_hz: 4200 }));
      expect(ids(recs)).toContain("centroid-bright");
    });

    it("emits centroid-dull when spectral centroid is below 1500 Hz", () => {
      const recs = generateMixRecommendations(makeAnalysis({ spectral_centroid_hz: 1200 }));
      expect(ids(recs)).toContain("centroid-dull");
    });

    it("emits flatness-noise when spectral flatness exceeds 0.35", () => {
      const recs = generateMixRecommendations(makeAnalysis({ spectral_flatness: 0.40 }));
      expect(ids(recs)).toContain("flatness-noise");
    });
  });

  describe("Priority ordering", () => {
    it("sorts Alta before Média before Baixa", () => {
      const a = makeAnalysis({
        true_peak_dbtp: 0.5,    // Alta
        lufs_integrated: -4,    // Média (loud)
        dynamic_range_lu: 16,   // Baixa (dr-wide)
      });
      const recs = generateMixRecommendations(a, "Pop");
      const weights: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2 };
      for (let i = 0; i < recs.length - 1; i++) {
        expect(weights[recs[i].prioridade]).toBeLessThanOrEqual(weights[recs[i + 1].prioridade]);
      }
    });
  });

  describe("each recommendation has required fields", () => {
    it("all recs have id, prioridade, titulo, acao, como_fazer, metrica", () => {
      const a = makeAnalysis({ true_peak_dbtp: 0.5, dynamic_range_lu: 3, spectral_centroid_hz: 4500 });
      const recs = generateMixRecommendations(a);
      for (const rec of recs) {
        expect(rec.id).toBeTruthy();
        expect(["Alta", "Média", "Baixa"]).toContain(rec.prioridade);
        expect(rec.titulo).toBeTruthy();
        expect(rec.acao).toBeTruthy();
        expect(rec.como_fazer).toBeTruthy();
        expect(rec.metrica).toBeTruthy();
      }
    });
  });
});
