#!/usr/bin/env bun
/**
 * regenerate-genre-map.ts — Regenera `genre-counts.generated.ts` a partir da
 * RPC `public.get_genre_taxonomy()` (que agrega `music_reference_tracks`).
 *
 * Uso:
 *   bun scripts/regenerate-genre-map.ts
 *
 * Pré-requisitos (qualquer um destes funciona):
 *   - PG* env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) +
 *     `psql` no PATH  → usado por padrão (mesmo setup do sandbox Lovable).
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  → fallback via REST.
 *
 * O script NÃO toca em `genre-map.ts`. O `DEFINITIONS` lá dentro (catalogLabels,
 * rootLabels, displayNote, forceLevel) continua sob controle humano — apenas
 * as contagens são reciclados automaticamente.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_FILE = join(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "..",
  "supabase",
  "functions",
  "music-dna-analyze",
  "genre-counts.generated.ts",
);

type Row = { label: string; active_count: number };

async function fetchViaPsql(): Promise<Row[]> {
  const raw = execSync(
    `psql -At -F $'\\t' --pset=footer=off -c "SELECT label, active_count FROM public.get_genre_taxonomy() WHERE label IS NOT NULL AND active_count > 0 ORDER BY active_count DESC"`,
    { encoding: "utf8", shell: "/bin/bash" },
  );
  return raw.trim().split("\n").filter(Boolean).map((line) => {
    const [label, count] = line.split("\t");
    return { label, active_count: Number(count) };
  });
}

async function fetchViaRest(): Promise<Row[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltam PG* ou SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/get_genre_taxonomy`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as Array<{ label: string; active_count: number }>;
  return rows.filter((r) => r.label && r.active_count > 0);
}

async function fetchTaxonomy(): Promise<Row[]> {
  if (process.env.PGHOST) {
    try { return await fetchViaPsql(); }
    catch (err) { console.warn("[regen] psql falhou, tentando REST:", err); }
  }
  return await fetchViaRest();
}

function render(rows: Row[]): string {
  const stamp = new Date().toISOString();
  const sorted = [...rows].sort((a, b) => b.active_count - a.active_count);
  const lines = sorted.map((r) => `  ${JSON.stringify(r.label)}: ${r.active_count},`);
  return `// ============================================================================
// genre-counts.generated.ts — AUTO-GERADO. NÃO EDITAR À MÃO.
// ----------------------------------------------------------------------------
// Origem: RPC \`public.get_genre_taxonomy()\` sobre \`music_reference_tracks\`.
// Para regenerar: \`bun scripts/regenerate-genre-map.ts\`.
// ============================================================================

export const GENERATED_AT = ${JSON.stringify(stamp)};

/** Contagens reais de faixas ATIVAS (quarantined=false) por label exato em
 *  \`music_reference_tracks.genre\`. As chaves são as strings literais do banco. */
export const GENERATED_COUNTS: Record<string, number> = {
${lines.join("\n")}
};
`;
}

(async () => {
  console.log("[regen] buscando taxonomia…");
  const rows = await fetchTaxonomy();
  console.log(`[regen] ${rows.length} labels com active_count > 0`);
  const content = render(rows);
  writeFileSync(OUT_FILE, content, "utf8");
  console.log(`[regen] ✓ escrito ${OUT_FILE}`);
  console.log("[regen] revise se os labels novos precisam entrar em DEFINITIONS dentro de genre-map.ts");
})().catch((err) => {
  console.error("[regen] ✗", err);
  process.exit(1);
});
