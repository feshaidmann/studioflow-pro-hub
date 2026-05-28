#!/usr/bin/env node
/**
 * consolidate_genres_supabase.mjs
 *
 * Consolida gêneros duplicados/inconsistentes em music_reference_tracks
 * (ex: "Rap" → "Hip-Hop/Rap", "Electronic" → "Eletrônico").
 *
 * Uso:
 *   node scripts/consolidate_genres_supabase.mjs --email EMAIL --password SENHA
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "util";

const SUPABASE_URL = "https://icdedfqsiorzzuhzvfgl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZGVkZnFzaW9yenp1aHp2ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzg5NjMsImV4cCI6MjA5MTc1NDk2M30.e8LhbI_G1zATlWtTxeXAF7sNyzdE99pXErTh8jjsv6c";

// Mapa: gênero antigo → gênero canônico pt-BR
const CONSOLIDATE = {
  // Inglês → pt-BR
  "Electronic":               "Eletrônico",
  "Alternative":              "Rock Alternativo",
  "Alternative Rock":         "Rock Alternativo",
  "Metal":                    "Heavy Metal",
  "Rap":                      "Hip-Hop/Rap",
  "Alt-Country":              "Country",
  "Folk Rock":                "Folk",
  "Industrial":               "Rock",
  "Big Beat":                 "Eletrônico",
  "Dance And Electronica":    "Eletrônico",
  "Brazilian":                "MPB",
  "MPB Contemporânea":        "MPB",
  // Tags que viraram nomes de bandas (artist-as-tag não tratado)
  "10CC":                     "Rock",
  "2 Pac":                    "Hip-Hop/Rap",
  "Special Purpose Artist":   "Rock",
  "N/A":                      "Unknown",
};

// Updates por band (artistas que ficaram Unknown ou com gênero incorreto)
const BAND_OVERRIDES = {
  "Stax-Volt Singles":                  "Soul",
  "Relative Pitch":                     "Jazz",
  "Best Of Moog":                       "Eletrônico",
  "Afrika Bambaata":                    "Hip-Hop/Rap",
  "Brian Jackson_Gil Scott-Heron":      "Soul/Funk",
  "Astor Piazzola And Gary Burton":     "Jazz",
  "Lindolpho Gaya e Rogério Duprat":    "MPB",
  "Chet Atkins_Tommy Emmanuel":         "Instrumental",
  "Beyonce Feat Andre 3000":            "R&B",
  "Antonio Barra":                      "Sertanejo",
  "Chinese Ancient Music":              "World Music",
  "Andrew Kazdin & Thomas Z. Shepard":  "Clássico",
};

const { values } = parseArgs({
  options: {
    email:    { type: "string" },
    password: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

if (!values.email || !values.password) {
  console.error("Uso: node scripts/consolidate_genres_supabase.mjs --email EMAIL --password SENHA [--dry-run]");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Autenticando…");
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: values.email,
  password: values.password,
});
if (authErr || !auth?.session) {
  console.error("Falha:", authErr?.message);
  process.exit(1);
}
console.log(`✓ ${auth.user.email}\n`);

let totalUpdated = 0;

for (const [oldGenre, newGenre] of Object.entries(CONSOLIDATE)) {
  process.stdout.write(`  "${oldGenre}" → "${newGenre}": `);

  if (values["dry-run"]) {
    const { count } = await supabase
      .from("music_reference_tracks")
      .select("*", { count: "exact", head: true })
      .eq("genre", oldGenre);
    console.log(`${count ?? 0} faixas afetadas (dry-run)`);
    continue;
  }

  const { data, error } = await supabase
    .from("music_reference_tracks")
    .update({ genre: newGenre })
    .eq("genre", oldGenre)
    .select("id");

  if (error) {
    console.log(`ERRO: ${error.message}`);
  } else {
    const n = data?.length ?? 0;
    totalUpdated += n;
    console.log(`✓ ${n} atualizadas`);
  }
}

// ── Overrides por band ──────────────────────────────────────────────────────
console.log(`\n── Overrides por band ──`);
for (const [band, newGenre] of Object.entries(BAND_OVERRIDES)) {
  process.stdout.write(`  "${band}" → "${newGenre}": `);

  if (values["dry-run"]) {
    const { count } = await supabase
      .from("music_reference_tracks")
      .select("*", { count: "exact", head: true })
      .eq("band", band);
    console.log(`${count ?? 0} faixas (dry-run)`);
    continue;
  }

  const { data, error } = await supabase
    .from("music_reference_tracks")
    .update({ genre: newGenre })
    .eq("band", band)
    .select("id");

  if (error) {
    console.log(`ERRO: ${error.message}`);
  } else {
    const n = data?.length ?? 0;
    totalUpdated += n;
    console.log(`✓ ${n} atualizadas`);
  }
}

console.log(`\n──────────────────────────────`);
console.log(`Total consolidado: ${totalUpdated} faixas\n`);

if (!values["dry-run"]) {
  console.log("Regenerando snapshot acústico…");
  const { data: snap, error: snapErr } = await supabase.functions.invoke("export-acoustic-catalog", { body: {} });
  if (snapErr) {
    console.warn("Snapshot falhou:", snapErr.message);
  } else {
    console.log(`✓ Snapshot: ${snap.count} faixas`);
  }
}
