import { describe, it, expect } from "vitest";
import { trackSlug } from "../trackSlug";
import { cleanTrackName } from "../trackName";

describe("trackSlug", () => {
  it("returns fallback for empty input", () => {
    expect(trackSlug("")).toBe("faixa-sem-nome");
    expect(trackSlug("   ")).toBe("faixa-sem-nome");
  });

  it("lowercases and strips extension", () => {
    expect(trackSlug("Ondas.wav")).toBe("ondas");
    expect(trackSlug("Minha Faixa.mp3")).toBe("minha-faixa");
  });

  it("removes accents", () => {
    expect(trackSlug("Canção")).toBe("cancao");
    expect(trackSlug("Coração Partido")).toBe("coracao-partido");
  });

  it("strips parenthetical content", () => {
    expect(trackSlug("Ondas (master)")).toBe("ondas");
    expect(trackSlug("Faixa [v2 demo]")).toBe("faixa");
  });

  it("removes version markers: v1, v2, demo, mix, master, final", () => {
    expect(trackSlug("Ondas v1")).toBe("ondas");
    expect(trackSlug("Ondas v2")).toBe("ondas");
    expect(trackSlug("Ondas demo")).toBe("ondas");
    expect(trackSlug("Ondas mix")).toBe("ondas");
    expect(trackSlug("Ondas master")).toBe("ondas");
    expect(trackSlug("Ondas final")).toBe("ondas");
  });

  it("removes mastered/remix/edit variants", () => {
    expect(trackSlug("Ondas mastered")).toBe("ondas");
    expect(trackSlug("Ondas remix")).toBe("ondas");
    expect(trackSlug("Ondas edit")).toBe("ondas");
  });

  it("groups versions of the same song to the same slug", () => {
    const slug1 = trackSlug("Ondas v1.wav");
    const slug2 = trackSlug("ondas-demo-mix");
    const slug3 = trackSlug("Ondas (master)");
    expect(slug1).toBe(slug2);
    expect(slug2).toBe(slug3);
  });

  it("replaces underscores and hyphens between words with hyphens", () => {
    expect(trackSlug("minha_faixa")).toBe("minha-faixa");
    expect(trackSlug("minha-faixa")).toBe("minha-faixa");
  });

  it("strips short dot-extensions (treated as file extension)", () => {
    // The function treats any .XY to .XXXXX suffix as a file extension and removes it
    expect(trackSlug("minha.faixa")).toBe("minha");
    expect(trackSlug("musica.ogg")).toBe("musica");
  });

  it("collapses multiple spaces/separators", () => {
    expect(trackSlug("Ondas  demo  final")).toBe("ondas");
  });

  it("removes leading and trailing separators", () => {
    const slug = trackSlug("  -Ondas-  ");
    expect(slug).not.toMatch(/^-/);
    expect(slug).not.toMatch(/-$/);
  });
});

describe("cleanTrackName", () => {
  it("returns empty string for null/undefined", () => {
    expect(cleanTrackName(null)).toBe("");
    expect(cleanTrackName(undefined)).toBe("");
    expect(cleanTrackName("")).toBe("");
  });

  it("removes audio file extensions", () => {
    expect(cleanTrackName("Minha Faixa.wav")).toBe("Minha Faixa");
    expect(cleanTrackName("Minha Faixa.mp3")).toBe("Minha Faixa");
    expect(cleanTrackName("Minha Faixa.flac")).toBe("Minha Faixa");
    expect(cleanTrackName("Minha Faixa.aiff")).toBe("Minha Faixa");
  });

  it("removes leading numeric track numbers", () => {
    expect(cleanTrackName("01 - Canção")).toBe("Canção");
    expect(cleanTrackName("02. Chuva")).toBe("Chuva");
    expect(cleanTrackName("3) Vento")).toBe("Vento");
  });

  it("removes technical terms: master, mix, demo, bounce, final", () => {
    expect(cleanTrackName("Chuva master")).toBe("Chuva");
    expect(cleanTrackName("Chuva mix")).toBe("Chuva");
    expect(cleanTrackName("Chuva demo")).toBe("Chuva");
    expect(cleanTrackName("Chuva bounce")).toBe("Chuva");
    expect(cleanTrackName("Chuva final")).toBe("Chuva");
  });

  it("removes version tokens like v1, v2", () => {
    expect(cleanTrackName("Chuva v1")).toBe("Chuva");
    expect(cleanTrackName("Chuva v23")).toBe("Chuva");
  });

  it("removes 8-digit date-like numbers", () => {
    expect(cleanTrackName("Chuva 20240101")).toBe("Chuva");
  });

  it("normalizes underscores and hyphens to spaces", () => {
    expect(cleanTrackName("minha_faixa")).toBe("minha faixa");
    expect(cleanTrackName("minha-faixa")).toBe("minha faixa");
  });

  it("preserves accented characters", () => {
    expect(cleanTrackName("Canção")).toBe("Canção");
    expect(cleanTrackName("Coração.wav")).toBe("Coração");
  });

  it("trims extra whitespace", () => {
    expect(cleanTrackName("  Chuva  ")).toBe("Chuva");
  });

  it("handles complex real-world filename", () => {
    const result = cleanTrackName("01 - Ondas_v2_master_20240115.wav");
    expect(result).toBe("Ondas");
  });
});
