/**
 * Acoustic match Web Worker.
 * Computes weighted Euclidean distance between the user's track features
 * and every track in the catalog snapshot, returning top-N tracks plus
 * artist & genre aggregations. MFCC + Chroma dominate the vector.
 *
 * Message in:
 *   { type: "match", query: QueryFeatures, catalog: CatalogTrack[], topN?: number }
 * Message out:
 *   { type: "result", topTracks: ScoredTrack[], topArtists: AggBucket[], topGenres: AggBucket[] }
 *   { type: "error", error: string }
 */

export interface QueryFeatures {
  bpm?: number | null;
  lufs_integrated?: number | null;
  dynamic_range_lu?: number | null;
  spectral_centroid_hz?: number | null;
  spectral_rolloff_hz?: number | null;
  spectral_flatness?: number | null;
  spectral_bandwidth_hz?: number | null;
  zero_crossing_rate?: number | null;
  energy?: number | null;
  danceability?: number | null;
  valence?: number | null;
  acousticness?: number | null;
  instrumentalness?: number | null;
  liveness?: number | null;
  speechiness?: number | null;
  mfcc?: number[] | null;          // 13
  chroma_cens?: number[] | null;   // 12
  key_name?: string | null;        // e.g. "A", "F#"
  mode?: string | null;            // "major" | "minor"
}

export interface CatalogTrack {
  band: string;
  filename: string;
  genre?: string | null;
  tempo_bpm?: number | null;
  key_name?: string | null;
  mode?: string | null;
  lufs_integrated?: number | null;
  dynamic_range_db?: number | null;
  spectral_centroid?: number | null;
  spectral_rolloff?: number | null;
  spectral_flatness?: number | null;
  spectral_bandwidth?: number | null;
  zero_crossing_rate?: number | null;
  energy?: number | null;
  danceability?: number | null;
  valence?: number | null;
  acousticness?: number | null;
  instrumentalness?: number | null;
  liveness?: number | null;
  speechiness?: number | null;
  mfcc?: number[] | null;
  chroma_cens?: number[] | null;
}

export interface ScoredTrack {
  band: string;
  filename: string;
  genre: string | null;
  similarity: number; // 0..1 (1 = identical)
  distance: number;
}

export interface AggBucket {
  label: string;
  similarity: number; // average similarity of top contributors
  count: number;
}

// ── Weights (MFCC + Chroma dominate per user decision) ───────────────────────
const W_MFCC = 2.0;     // per coefficient
const W_CHROMA = 1.5;   // per pitch class
const W_LUFS = 1.0;
const W_DR = 1.0;
const W_CENTROID = 1.0;
const W_ROLLOFF = 0.7;
const W_FLATNESS = 0.7;
const W_BPM = 0.8;
const W_KEY = 0.6;      // circle-of-fifths harmonic compatibility
const W_PERCEPTUAL = 0.3; // each (energy, dance, valence, acous, instr, live, speech)

// When a catalog track has no MFCC/Chroma, boost spectral proxies so the
// remaining features still discriminate timbre meaningfully.
const W_CENTROID_BOOST = 2.5;
const W_ROLLOFF_BOOST = 1.5;
const W_BANDWIDTH = 0.5;
const W_ZCR = 0.3;

// Normalization scales (so all dims are roughly comparable before weighting)
// S_MFCC / S_CHROMA are unused (cosine path now), kept for documentation.
const S_MFCC = 8;       // kept for reference
const S_CHROMA = 0.3;   // kept for reference
const S_LUFS = 6;
const S_DR = 6;
const S_CENTROID = 1500;
const S_ROLLOFF = 2500;
const S_FLATNESS = 0.25;
const S_BANDWIDTH = 1500; // typical spectral bandwidth range in Hz
const S_ZCR = 0.15;       // typical ZCR range for music (fraction of Nyquist crossings)
const S_BPM = 30;       // half/double-time aware below
const S_KEY = 6.5;      // max circle-of-fifths distance + mode penalty

// ── Cosine similarity between two equal-length vectors ───────────────────────
function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? null : dot / denom; // –1 … +1
}

// ── Circle of fifths ─────────────────────────────────────────────────────────
const COF: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5,
  "F#": 6, Gb: 6, Db: 7, "C#": 7, Ab: 8, "G#": 8,
  Eb: 9, "D#": 9, Bb: 10, "A#": 10, F: 11,
};

function keyDistance(
  kA: string | null | undefined, mA: string | null | undefined,
  kB: string | null | undefined, mB: string | null | undefined,
): number | null {
  if (!kA || !kB) return null;
  const posA = COF[kA];
  const posB = COF[kB];
  if (posA == null || posB == null) return null;
  const d = Math.abs(posA - posB);
  const cof = Math.min(d, 12 - d);           // 0 (same key) … 6 (tritone)
  const modePenalty = mA && mB && mA !== mB ? 0.5 : 0;
  return cof + modePenalty;
}

function bpmDistance(a: number, b: number): number {
  return Math.min(
    Math.abs(a - b),
    Math.abs(a - b * 2),
    Math.abs(a - b / 2),
  );
}

function scoreTrack(q: QueryFeatures, t: CatalogTrack): { distance: number; weight: number } | null {
  let sum = 0;
  let weight = 0;

  const addNum = (
    qv: number | null | undefined,
    tv: number | null | undefined,
    scale: number,
    w: number,
  ) => {
    if (qv == null || tv == null || !isFinite(qv) || !isFinite(tv)) return;
    const d = Math.abs(qv - tv) / scale;
    sum += w * d * d;
    weight += w;
  };

  // MFCC — cosine similarity (consistent with SQL find_nearest_reference_tracks)
  // Convert similarity [–1,+1] to a distance contribution [0,+∞] via (1 – cos) / 2
  const hasMfcc = !!(q.mfcc && t.mfcc && q.mfcc.length === t.mfcc.length);
  if (hasMfcc) {
    const cos = cosineSimilarity(q.mfcc!, t.mfcc!);
    if (cos != null) {
      const d = (1 - cos) / 2; // 0 = identical, 1 = opposite
      sum += W_MFCC * d * d;
      weight += W_MFCC;
    }
  }
  // Chroma CENS — cosine similarity
  if (q.chroma_cens && t.chroma_cens && q.chroma_cens.length === t.chroma_cens.length) {
    const cos = cosineSimilarity(q.chroma_cens, t.chroma_cens);
    if (cos != null) {
      const d = (1 - cos) / 2;
      sum += W_CHROMA * d * d;
      weight += W_CHROMA;
    }
  }

  // BPM (half/double-time aware)
  if (q.bpm != null && t.tempo_bpm != null && isFinite(q.bpm) && isFinite(t.tempo_bpm)) {
    const d = bpmDistance(q.bpm, t.tempo_bpm) / S_BPM;
    sum += W_BPM * d * d;
    weight += W_BPM;
  }

  // Key compatibility via circle of fifths.
  // When catalog track has no mfcc this is the primary harmonic signal.
  const kd = keyDistance(q.key_name, q.mode, t.key_name, t.mode);
  if (kd != null) {
    const d = kd / S_KEY;
    sum += W_KEY * d * d;
    weight += W_KEY;
  }

  addNum(q.lufs_integrated, t.lufs_integrated, S_LUFS, W_LUFS);
  addNum(q.dynamic_range_lu, t.dynamic_range_db, S_DR, W_DR);

  // Spectral proxies: boost when MFCC is absent (best remaining timbre signal)
  const wCentroid = hasMfcc ? W_CENTROID : W_CENTROID_BOOST;
  const wRolloff  = hasMfcc ? W_ROLLOFF  : W_ROLLOFF_BOOST;
  addNum(q.spectral_centroid_hz,   t.spectral_centroid,   S_CENTROID,   wCentroid);
  addNum(q.spectral_rolloff_hz,    t.spectral_rolloff,    S_ROLLOFF,    wRolloff);
  addNum(q.spectral_flatness,      t.spectral_flatness,   S_FLATNESS,   W_FLATNESS);
  addNum(q.spectral_bandwidth_hz,  t.spectral_bandwidth,  S_BANDWIDTH,  W_BANDWIDTH);
  addNum(q.zero_crossing_rate,     t.zero_crossing_rate,  S_ZCR,        W_ZCR);

  addNum(q.energy,           t.energy,           1, W_PERCEPTUAL);
  addNum(q.danceability,     t.danceability,     1, W_PERCEPTUAL);
  addNum(q.valence,          t.valence,          1, W_PERCEPTUAL);
  addNum(q.acousticness,     t.acousticness,     1, W_PERCEPTUAL);
  addNum(q.instrumentalness, t.instrumentalness, 1, W_PERCEPTUAL);
  addNum(q.liveness,         t.liveness,         1, W_PERCEPTUAL);
  addNum(q.speechiness,      t.speechiness,      1, W_PERCEPTUAL);

  if (weight === 0) return null;
  return { distance: Math.sqrt(sum / weight), weight };
}

function distanceToSimilarity(d: number): number {
  // Smooth mapping: 1 / (1 + d). d≈0 → 1.0, d≈1 → 0.5, d→∞ → 0
  return 1 / (1 + d);
}

function aggregateBy(
  tracks: ScoredTrack[],
  key: "band" | "genre",
  topPer: number,
  topOut: number,
): AggBucket[] {
  const buckets = new Map<string, number[]>();
  for (const t of tracks) {
    const label = (key === "band" ? t.band : t.genre) || "";
    if (!label) continue;
    const arr = buckets.get(label) ?? [];
    arr.push(t.similarity);
    buckets.set(label, arr);
  }
  const out: AggBucket[] = [];
  for (const [label, sims] of buckets) {
    sims.sort((a, b) => b - a);
    const top = sims.slice(0, topPer);
    const avg = top.reduce((a, b) => a + b, 0) / top.length;
    out.push({ label, similarity: avg, count: sims.length });
  }
  out.sort((a, b) => b.similarity - a.similarity);
  return out.slice(0, topOut);
}

self.addEventListener("message", (event: MessageEvent) => {
  const data = event.data;
  if (!data || data.type !== "match") return;

  try {
    const query = data.query as QueryFeatures;
    const catalog = data.catalog as CatalogTrack[];
    const topN = (data.topN as number) ?? 10;

    if (!Array.isArray(catalog) || catalog.length === 0) {
      throw new Error("Catálogo vazio");
    }

    const scored: ScoredTrack[] = [];
    for (const t of catalog) {
      const res = scoreTrack(query, t);
      if (!res) continue;
      scored.push({
        band: t.band,
        filename: t.filename,
        genre: t.genre ?? null,
        distance: res.distance,
        similarity: distanceToSimilarity(res.distance),
      });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    const topTracks = scored.slice(0, topN);

    // Aggregations use the broader pool (top 60) so artists/genres reflect the catalog
    const pool = scored.slice(0, Math.min(60, scored.length));
    const topArtists = aggregateBy(pool, "band", 3, 5);
    const topGenres = aggregateBy(pool, "genre", 5, 5);

    (self as unknown as Worker).postMessage({
      type: "result",
      topTracks,
      topArtists,
      topGenres,
      scoredCount: scored.length,
    });
  } catch (e) {
    (self as unknown as Worker).postMessage({
      type: "error",
      error: String((e as Error).message ?? e),
    });
  }
});

export {};
