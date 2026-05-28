#!/usr/bin/env node
/**
 * run_import.mjs
 *
 * Autentica como admin no Supabase e chama a edge function
 * import-reference-tracks com o CSV transformado.
 *
 * Uso:
 *   node scripts/run_import.mjs --email seu@email.com --password suasenha \
 *       --csv /tmp/reference_tracks_import.csv
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { parseArgs } from "util";

const SUPABASE_URL = "https://icdedfqsiorzzuhzvfgl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZGVkZnFzaW9yenp1aHp2ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzg5NjMsImV4cCI6MjA5MTc1NDk2M30.e8LhbI_G1zATlWtTxeXAF7sNyzdE99pXErTh8jjsv6c";

const { values } = parseArgs({
  options: {
    email:    { type: "string" },
    password: { type: "string" },
    csv:      { type: "string", default: "/tmp/reference_tracks_import.csv" },
  },
});

if (!values.email || !values.password) {
  console.error("Uso: node scripts/run_import.mjs --email EMAIL --password SENHA [--csv PATH]");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Autenticando…");
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: values.email,
  password: values.password,
});
if (authErr || !auth?.session) {
  console.error("Falha na autenticação:", authErr?.message ?? "sem sessão");
  process.exit(1);
}
console.log(`Autenticado como: ${auth.user.email}`);

const csvText = readFileSync(values.csv, "utf-8");
const lines = csvText.split("\n").length - 1;
console.log(`CSV: ${lines} linhas (${(csvText.length / 1024).toFixed(0)} KB)`);

// Envia em chunks para evitar timeout (edge function aceita até ~5 MB por chamada)
const CHUNK_LINES = 3000;
const allLines = csvText.split("\n");
const header = allLines[0];
const dataLines = allLines.slice(1).filter(Boolean);

const batches = [];
for (let i = 0; i < dataLines.length; i += CHUNK_LINES) {
  batches.push([header, ...dataLines.slice(i, i + CHUNK_LINES)].join("\n"));
}

console.log(`Enviando em ${batches.length} lote(s) de até ${CHUNK_LINES} linhas…\n`);

let totalInserted = 0;
let totalUpdated = 0;
let totalSkipped = 0;
const allGenres = new Set();

for (let b = 0; b < batches.length; b++) {
  const batchCsv = batches[b];
  const blob = new Blob([batchCsv], { type: "text/csv" });
  const fd = new FormData();
  fd.append("file", blob, `batch_${b + 1}.csv`);

  process.stdout.write(`  Lote ${b + 1}/${batches.length}… `);

  const { data, error } = await supabase.functions.invoke("import-reference-tracks", {
    body: fd,
  });

  if (error) {
    console.error(`ERRO: ${error.message}`);
    continue;
  }

  totalInserted += data.inserted ?? 0;
  totalUpdated  += data.updated  ?? 0;
  totalSkipped  += data.skipped  ?? 0;
  for (const g of data.genres_updated ?? []) allGenres.add(g);

  console.log(`✓  ${data.inserted} inseridas, ${data.updated} atualizadas`);

  if (data.errors?.length) {
    for (const e of data.errors.slice(0, 3)) console.warn("    ⚠", e);
  }
}

console.log(`\n──────────────────────────────────────`);
console.log(`Total inseridas : ${totalInserted}`);
console.log(`Total atualizadas: ${totalUpdated}`);
console.log(`Total puladas  : ${totalSkipped}`);
console.log(`Gêneros recalculados: ${[...allGenres].join(", ")}`);

console.log("\nGerando snapshot do catálogo acústico…");
const { data: snap, error: snapErr } = await supabase.functions.invoke("export-acoustic-catalog", { body: {} });
if (snapErr) {
  console.warn("Snapshot falhou:", snapErr.message);
  console.warn("→ Gere manualmente em /admin/reference-tracks");
} else {
  console.log(`✓ Snapshot gerado: ${snap.count} faixas → ${snap.public_url}`);
}

console.log("\nPronto. Acoustic Match agora usa o catálogo atualizado.");
