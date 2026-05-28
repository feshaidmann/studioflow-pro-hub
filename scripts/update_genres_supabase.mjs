#!/usr/bin/env node
/**
 * update_genres_supabase.mjs
 *
 * Lê artista_genero_normalizado.csv e atualiza a coluna genre em
 * music_reference_tracks para cada artista encontrado.
 *
 * Uso:
 *   node scripts/update_genres_supabase.mjs \
 *       --email admin@email.com --password senha \
 *       [--csv /tmp/artista_genero_normalizado.csv] \
 *       [--dry-run]
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
    csv:      { type: "string", default: "/tmp/artista_genero_normalizado.csv" },
    "dry-run": { type: "boolean", default: false },
  },
});

if (!values.email || !values.password) {
  console.error("Uso: node scripts/update_genres_supabase.mjs --email EMAIL --password SENHA [--csv PATH] [--dry-run]");
  process.exit(1);
}

// ── Parse JSON ou CSV ────────────────────────────────────────────────────────
function loadData(path) {
  const text = readFileSync(path, "utf-8");
  // JSON: [{ artista, genero }] ou [{ artista, genero_normalizado }]
  if (path.endsWith(".json")) {
    const arr = JSON.parse(text);
    return arr.map(r => ({
      artista: (r.artista || "").trim().replace(/^﻿/, ""),
      genero_normalizado: (r.genero || r.genero_normalizado || "").trim(),
    }));
  }
  // TSV fallback (tab-separated)
  const lines = text.split("\n").filter(Boolean);
  const header = lines[0].split("\t");
  return lines.slice(1).map(line => {
    const parts = line.split("\t");
    const obj = {};
    header.forEach((h, i) => { obj[h] = (parts[i] || "").trim(); });
    return obj;
  });
}

const rows = loadData(values.csv);
console.log(`📂 ${rows.length} artistas carregados`);

if (values["dry-run"]) {
  console.log("\n── DRY RUN (primeiros 10) ──");
  for (const r of rows.slice(0, 10)) {
    console.log(`  "${r.artista}" → ${r.genero_normalizado}`);
  }
  console.log("\n[Nenhuma alteração feita]");
  process.exit(0);
}

// ── Auth ────────────────────────────────────────────────────────────────────
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
console.log(`✓ Autenticado como: ${auth.user.email}\n`);

// ── Update em lotes ──────────────────────────────────────────────────────────
const CHUNK = 50;
let updated = 0;
let notFound = 0;
let errors = 0;

// Agrupa por gênero para fazer UPDATE em lote por gênero
const byGenre = new Map();
for (const row of rows) {
  const genre = row.genero_normalizado;
  const artist = row.artista;
  if (!genre || !artist) continue;
  if (!byGenre.has(genre)) byGenre.set(genre, []);
  byGenre.get(genre).push(artist);
}

let batchNum = 0;
const totalBatches = [...byGenre.values()].reduce((s, a) => s + Math.ceil(a.length / CHUNK), 0);

for (const [genre, artists] of byGenre) {
  for (let i = 0; i < artists.length; i += CHUNK) {
    const chunk = artists.slice(i, i + CHUNK);
    batchNum++;
    process.stdout.write(`  [${batchNum}/${totalBatches}] genre="${genre}" (${chunk.length} artistas)… `);

    const { data, error } = await supabase
      .from("music_reference_tracks")
      .update({ genre })
      .in("band", chunk)
      .select("band");

    if (error) {
      console.error(`ERRO: ${error.message}`);
      errors += chunk.length;
    } else {
      const found = data?.length ?? 0;
      const missing = chunk.length - found;
      updated += found;
      notFound += missing;
      console.log(`✓ ${found} atualizados${missing ? `, ${missing} não encontrados` : ""}`);
    }
  }
}

console.log(`
──────────────────────────────────────
Atualizados : ${updated}
Não encontrados na tabela: ${notFound}
Erros       : ${errors}
`);

// ── Regenera snapshot acústico ───────────────────────────────────────────────
console.log("Regenerando snapshot acústico…");
const { data: snap, error: snapErr } = await supabase.functions.invoke("export-acoustic-catalog", { body: {} });
if (snapErr) {
  console.warn("Snapshot falhou:", snapErr.message);
  console.warn("→ Gere manualmente em /admin/reference-tracks");
} else {
  console.log(`✓ Snapshot gerado: ${snap.count} faixas → ${snap.public_url}`);
}

console.log("\nPronto. Gêneros atualizados no catálogo.");
