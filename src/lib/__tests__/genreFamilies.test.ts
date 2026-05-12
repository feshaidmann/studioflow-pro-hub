import { describe, it, expect } from "vitest";
import { normalizeGenreName, sameFamily, getFamilies } from "@/lib/genreFamilies";

describe("normalizeGenreName", () => {
  it.each([
    ["Pop Brasileiro", "pop"],
    ["Pop Internacional", "pop"],
    ["Sertanejo Universitário", "sertanejo"],
    ["Sertanejo Raiz", "sertanejo"],
    ["Funk Carioca", "funk"],
    ["Reggae BR", "reggae"],
    ["Eletrônica / House", "eletronica"],
    ["  ROCK  ", "rock"],
  ])("normaliza %s → %s", (input, expected) => {
    expect(normalizeGenreName(input)).toBe(expected);
  });
});

describe("sameFamily — pares que NÃO devem alertar", () => {
  it.each([
    ["Pop", "Pop Brasileiro"],
    ["Pop Brasileiro", "Synth-Pop"],
    ["Rock", "Grunge"],
    ["Rock Alternativo BR", "Indie BR"],
    ["Sertanejo Raiz", "Sertanejo Universitário"],
    ["Hip-Hop", "Trap BR"],
    ["Samba", "Pagode"],
    ["Bossa Nova", "Jazz"],
    ["Pop", "Synth-Pop"],
  ])("%s ↔ %s", (a, b) => {
    expect(sameFamily(a, b)).toBe(true);
  });
});

describe("sameFamily — divergências reais que DEVEM alertar", () => {
  it.each([
    ["Pop", "Heavy Metal"],
    ["Bossa Nova", "Trap BR"],
    ["Funk Carioca", "Country"],
    ["Sertanejo Universitário", "Hip-Hop"],
    ["Forró / Piseiro", "Heavy Metal"],
  ])("%s ↮ %s", (a, b) => {
    expect(sameFamily(a, b)).toBe(false);
  });
});

describe("getFamilies", () => {
  it("retorna famílias mapeadas para gêneros conhecidos", () => {
    expect(getFamilies("Pop Brasileiro")).toContain("pop");
    expect(getFamilies("Grunge")).toContain("rock");
    expect(getFamilies("Sertanejo Universitário")).toContain("brazilian-roots");
  });

  it("retorna [] para gêneros desconhecidos", () => {
    expect(getFamilies("Gênero Inexistente XYZ")).toEqual([]);
    expect(getFamilies("")).toEqual([]);
  });
});
