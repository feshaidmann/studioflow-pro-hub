// ============================================================================
// genre-map.test.ts — Deno tests para tokenização/normalização/resolução.
// Roda com: `supabase--test_edge_functions` ou `deno test --allow-env`.
// ----------------------------------------------------------------------------
// Estes testes garantem que strings compostas e variantes ("Indie Folk / MPB",
// "trap br", "Rock'n'Roll com feat") sempre caem na taxonomia certa do
// `GENRE_MAP`, espelhando o comportamento esperado de `public.genre_canonical()`.
// ============================================================================
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GENRE_MAP, resolveGenre } from "./genre-map.ts";

// ─────────────────── Helpers ─────────────────────
function expectMatch(input: string, expectedKey: string) {
  const res = resolveGenre(input);
  assert(res.labels && res.labels.length > 0, `"${input}" → sem labels (level=${res.level})`);
  assertEquals(
    res.matchedTokens.some((t) => t.endsWith(`→${expectedKey}`)),
    true,
    `"${input}" devia ter casado em "${expectedKey}", veio: ${res.matchedTokens.join(", ")}`,
  );
  assert(res.level !== "absent", `"${input}" não devia ser absent (level=${res.level})`);
}

function expectAbsent(input: string) {
  const res = resolveGenre(input);
  assertEquals(res.level, "absent", `"${input}" devia ser absent, veio level=${res.level}`);
  assertEquals(res.labels, null);
}

// ─────────────────── Strings simples ─────────────────────
Deno.test("resolveGenre: canônicas diretas", () => {
  expectMatch("Bossa Nova", "Bossa Nova");
  expectMatch("Samba", "Samba");
  expectMatch("MPB", "MPB");
  expectMatch("Rock", "Rock");
  expectMatch("Reggae", "Reggae");
  expectMatch("Blues", "Blues");
  expectMatch("Jazz", "Jazz");
  expectMatch("Folk", "Folk");
  expectMatch("Country", "Country");
  expectMatch("Pop", "Pop");
});

Deno.test("resolveGenre: insensível a caixa e acento", () => {
  expectMatch("bossa nova", "Bossa Nova");
  expectMatch("BOSSA NOVA", "Bossa Nova");
  expectMatch("eletronico", "Eletrônico");
  expectMatch("ELETRÔNICO", "Eletrônico");
  expectMatch("Sertanejo", "Sertanejo");
});

// ─────────────────── Aliases (espelho do genre_canonical) ─────────────────────
Deno.test("resolveGenre: aliases de Hip-Hop / Rap / Trap", () => {
  expectMatch("rap", "Hip-Hop");
  expectMatch("rap brasileiro", "Hip-Hop");
  expectMatch("hip-hop", "Hip-Hop");
  expectMatch("hiphop", "Hip-Hop");
  expectMatch("trap", "Hip-Hop");
  expectMatch("trap br", "Hip-Hop");
});

Deno.test("resolveGenre: aliases de Eletrônica/EDM/House", () => {
  expectMatch("edm", "Eletrônico");
  expectMatch("house", "Eletrônico");
  expectMatch("ambient", "Eletrônico");
  expectMatch("drum and bass", "Eletrônico");
  expectMatch("synth-pop", "Pop");
});

Deno.test("resolveGenre: aliases de R&B/Soul", () => {
  expectMatch("r&b", "R&B/Soul");
  expectMatch("rnb", "R&B/Soul");
  expectMatch("R&B Soul", "R&B/Soul");
  expectMatch("soul", "Soul");
});

Deno.test("resolveGenre: aliases de Sertanejo", () => {
  expectMatch("sertanejo universitario", "Sertanejo");
  expectMatch("sertanejo universitário", "Sertanejo");
  expectMatch("sertanejo raiz", "Sertanejo");
  expectMatch("arrocha", "Sertanejo");
});

Deno.test("resolveGenre: aliases de Indie/Alternativo", () => {
  expectMatch("indie", "Indie/Alternativo");
  expectMatch("indie rock", "Indie/Alternativo");
  expectMatch("alternative rock", "Indie/Alternativo");
});

Deno.test("resolveGenre: aliases de Pop Nacional vs Internacional", () => {
  expectMatch("pop brasileiro", "Pop Nacional");
  expectMatch("pop internacional", "Pop");
  expectMatch("international pop", "Pop");
});

// ─────────────────── Strings compostas ─────────────────────
Deno.test("resolveGenre: composta com '/' usa token de maior cobertura como primário", () => {
  // MPB Contemporânea (6791) > Indie/Alternativo (226) → primário = MPB
  const res = resolveGenre("Indie Folk / MPB Contemporânea");
  assertExists(res.labels);
  assertEquals(res.level !== "absent", true);
  // Tem que ter casado nos dois
  assertEquals(res.matchedTokens.length, 2);
  // Primário deve ser MPB (sai primeiro nos labels)
  assert(res.labels!.some((l) => l.includes("MPB")), `labels não contém MPB: ${res.labels!.join(", ")}`);
});

Deno.test("resolveGenre: composta com vírgula", () => {
  const res = resolveGenre("Rock, Blues");
  assertExists(res.labels);
  assertEquals(res.matchedTokens.length, 2);
  // Rock (4158) > Blues (578) → Rock é o primário
  assert(res.labels!.includes("Rock"));
});

Deno.test("resolveGenre: composta com separador 'com' / 'feat' / 'x'", () => {
  expectMatch("Bossa Nova com Jazz", "Bossa Nova");
  expectMatch("Samba feat Pagode", "Samba");
  expectMatch("Rock x Punk", "Rock");
});

Deno.test("resolveGenre: composta com tokens parcialmente desconhecidos", () => {
  const res = resolveGenre("Trap BR / Funk Remix");
  // "Trap BR" → Hip-Hop; "Funk Remix" cai em Funk via substring match
  assert(res.matchedTokens.length >= 1, "esperava ao menos 1 match");
  assertEquals(res.level !== "absent", true);
});

Deno.test("resolveGenre: parênteses são ignorados na normalização", () => {
  expectMatch("Rock (alternativo)", "Rock");
  expectMatch("Bossa Nova (instrumental)", "Bossa Nova");
});

// ─────────────────── Absents declarados ─────────────────────
Deno.test("resolveGenre: gêneros realmente ausentes ficam absent", () => {
  expectAbsent("Forró");
  expectAbsent("Axé");
  expectAbsent("Gospel");
  expectAbsent("Clássico");
});

Deno.test("resolveGenre: input vazio e ruído viram absent", () => {
  expectAbsent("");
  expectAbsent("   ");
  expectAbsent("xyzwabc123");
});

// ─────────────────── Coerência do GENRE_MAP ─────────────────────
Deno.test("GENRE_MAP: todas as entradas têm root e níveis coerentes", () => {
  for (const [key, entry] of Object.entries(GENRE_MAP)) {
    assert(entry.catalogLabels !== undefined, `${key} sem catalogLabels`);
    assert(entry.rootLabels !== undefined, `${key} sem rootLabels`);
    assert(["strong", "usable", "weak", "proxy", "absent"].includes(entry.level), `${key} level inválido: ${entry.level}`);
    if (entry.level === "absent") {
      assertEquals(entry.catalogLabels.length, 0, `${key} marcado absent mas tem catalogLabels`);
    } else if (entry.level !== "weak") {
      assert(entry.count > 0 || entry.rootCount > 0, `${key} (${entry.level}) sem cobertura`);
    }
  }
});

Deno.test("GENRE_MAP: gêneros principais reais permanecem >= usable", () => {
  const mustBeUsableOrBetter = ["Bossa Nova", "Samba", "MPB", "Rock", "Reggae", "Blues", "Hip-Hop", "Jazz", "Folk"];
  for (const key of mustBeUsableOrBetter) {
    const e = GENRE_MAP[key];
    assertExists(e, `${key} ausente do GENRE_MAP`);
    assert(["strong", "usable"].includes(e.level), `${key} deveria ser strong/usable, está ${e.level}`);
  }
});

Deno.test("resolveGenre: tokens não reconhecidos vão para unmatchedTokens (telemetria)", () => {
  const res = resolveGenre("Bossa Nova / GeneroQueNaoExiste");
  assertEquals(res.matchedTokens.length, 1);
  assertEquals(res.unmatchedTokens.length, 1);
  assertEquals(res.unmatchedTokens[0], "GeneroQueNaoExiste");
});
