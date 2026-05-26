import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

async function logError(fnName: string, message: string, details?: unknown) {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await admin.from("function_logs").insert({
      function_name: fnName,
      level: "error",
      message: String(message),
      details: details ? JSON.parse(JSON.stringify(details, Object.getOwnPropertyNames(details))) : null,
    });
  } catch (_) { /* best-effort */ }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Parse WAV header and extract PCM samples */
function parseWav(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  // RIFF header
  const riff = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (riff !== "RIFF") throw new Error("Not a WAV file");

  const numChannels = dv.getUint16(22, true);
  const sampleRate = dv.getUint32(24, true);
  const bitsPerSample = dv.getUint16(34, true);

  // Find data chunk
  let offset = 12;
  while (offset < buf.byteLength - 8) {
    const chunkId = String.fromCharCode(
      dv.getUint8(offset), dv.getUint8(offset + 1),
      dv.getUint8(offset + 2), dv.getUint8(offset + 3),
    );
    const chunkSize = dv.getUint32(offset + 4, true);
    if (chunkId === "data") {
      offset += 8;
      break;
    }
    offset += 8 + chunkSize;
  }

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor((buf.byteLength - offset) / bytesPerSample);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const pos = offset + i * bytesPerSample;
    if (pos + bytesPerSample > buf.byteLength) break;

    if (bitsPerSample === 16) {
      samples[i] = dv.getInt16(pos, true) / 32768;
    } else if (bitsPerSample === 24) {
      const val = dv.getUint8(pos) | (dv.getUint8(pos + 1) << 8) | (dv.getInt8(pos + 2) << 16);
      samples[i] = val / 8388608;
    } else if (bitsPerSample === 32) {
      samples[i] = dv.getFloat32(pos, true);
    } else {
      // 8-bit unsigned
      samples[i] = (dv.getUint8(pos) - 128) / 128;
    }
  }

  return { samples, numChannels, sampleRate, bitsPerSample, totalSamples, duration: totalSamples / numChannels / sampleRate };
}

/** Compute RMS in dBFS */
function rmsDbfs(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/**
 * True Peak (dBTP) com 4× oversampling Catmull-Rom (alinhado ao cliente).
 * Captura inter-sample peaks que sample-peak puro perde (+0.5 a +1.5 dB típico
 * em material limitado). Aproximação leve da recomendação ITU-R BS.1770.
 */
function truePeak(samples: Float32Array): number {
  let peak = 0;
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  for (let i = 1; i < n - 2; i++) {
    const p0 = samples[i - 1], p1 = samples[i], p2 = samples[i + 1], p3 = samples[i + 2];
    const a0 = 2 * p1;
    const a1 = -p0 + p2;
    const a2 = 2 * p0 - 5 * p1 + 4 * p2 - p3;
    const a3 = -p0 + 3 * p1 - 3 * p2 + p3;
    for (let k = 1; k < 4; k++) {
      const t = k * 0.25;
      const v = 0.5 * (a0 + a1 * t + a2 * t * t + a3 * t * t * t);
      const abs = Math.abs(v);
      if (abs > peak) peak = abs;
    }
  }
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}

// ── K-weighting (ITU-R BS.1770 / EBU R128) — paridade com cliente ──────────
interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number; }

function designHighShelf(fc: number, gainDb: number, q: number, sr: number): Biquad {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * fc / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * q);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;
  const b0 =    A * ((A + 1) + (A - 1) * cosw + sqrtA2alpha);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
  const b2 =    A * ((A + 1) + (A - 1) * cosw - sqrtA2alpha);
  const a0 =        (A + 1) - (A - 1) * cosw + sqrtA2alpha;
  const a1 =    2 * ((A - 1) - (A + 1) * cosw);
  const a2 =        (A + 1) - (A - 1) * cosw - sqrtA2alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function designHighPass(fc: number, q: number, sr: number): Biquad {
  const w0 = 2 * Math.PI * fc / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * q);
  const b0 =  (1 + cosw) / 2;
  const b1 = -(1 + cosw);
  const b2 =  (1 + cosw) / 2;
  const a0 =   1 + alpha;
  const a1 =  -2 * cosw;
  const a2 =   1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function applyBiquad(input: Float32Array, biquad: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const { b0, b1, b2, a1, a2 } = biquad;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

function applyKWeighting(mono: Float32Array, sampleRate: number): Float32Array {
  const preFilter = designHighShelf(1681.974, 3.999, 0.7071752, sampleRate);
  const rlbFilter = designHighPass(38.135, 0.5003270, sampleRate);
  return applyBiquad(applyBiquad(mono, preFilter), rlbFilter);
}

/**
 * LUFS BS.1770 completo: K-weighting → janelas 400ms (hop 100ms) → gating
 * absoluto (-70) e relativo (-10 LU). Paridade com pipeline do cliente.
 */
function estimateLufs(samples: Float32Array, sampleRate: number): number {
  const weighted = applyKWeighting(samples, sampleRate);
  const blockSize = Math.floor(sampleRate * 0.4);
  const hop = Math.floor(sampleRate * 0.1);
  const meanSquares: number[] = [];
  for (let start = 0; start + blockSize <= weighted.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + blockSize; i++) sum += weighted[i] * weighted[i];
    meanSquares.push(sum / blockSize);
  }
  if (meanSquares.length === 0) return -Infinity;

  const blockLoudness = meanSquares.map(ms => -0.691 + 10 * Math.log10(Math.max(ms, 1e-12)));
  const absGated = blockLoudness.filter(l => l > -70);
  if (absGated.length === 0) return -Infinity;

  const ungatedMs = meanSquares.filter((_, i) => blockLoudness[i] > -70);
  const meanUngated = ungatedMs.reduce((a, b) => a + b, 0) / ungatedMs.length;
  const relThresh = -0.691 + 10 * Math.log10(Math.max(meanUngated, 1e-12)) - 10;

  const finalMs = meanSquares.filter((_, i) => blockLoudness[i] > -70 && blockLoudness[i] >= relThresh);
  if (finalMs.length === 0) return -Infinity;
  const meanFinal = finalMs.reduce((a, b) => a + b, 0) / finalMs.length;
  return -0.691 + 10 * Math.log10(meanFinal);
}


/** Compute dynamic range (difference between loud and quiet sections) */
function dynamicRange(samples: Float32Array, sampleRate: number): number {
  const windowSize = Math.floor(sampleRate * 0.4);
  const levels: number[] = [];

  for (let i = 0; i < samples.length - windowSize; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += samples[i + j] * samples[i + j];
    }
    const rms = Math.sqrt(sum / windowSize);
    if (rms > 0) levels.push(20 * Math.log10(rms));
  }

  if (levels.length < 2) return 0;
  levels.sort((a, b) => a - b);

  const top10 = levels.slice(Math.floor(levels.length * 0.9));
  const bottom10 = levels.slice(0, Math.floor(levels.length * 0.1));

  if (top10.length === 0 || bottom10.length === 0) return 0;

  const avgTop = top10.reduce((a, b) => a + b, 0) / top10.length;
  const avgBottom = bottom10.reduce((a, b) => a + b, 0) / bottom10.length;

  return Math.round((avgTop - avgBottom) * 10) / 10;
}

/** Compute stereo width (for stereo files) */
function stereoWidth(samples: Float32Array, numChannels: number): number {
  if (numChannels < 2) return 0;

  let midEnergy = 0;
  let sideEnergy = 0;
  const frameCount = Math.floor(samples.length / numChannels);

  for (let i = 0; i < frameCount; i++) {
    const l = samples[i * numChannels];
    const r = samples[i * numChannels + 1];
    const mid = (l + r) / 2;
    const side = (l - r) / 2;
    midEnergy += mid * mid;
    sideEnergy += side * side;
  }

  const total = midEnergy + sideEnergy;
  if (total === 0) return 0;
  return Math.round((sideEnergy / total) * 100);
}

/** Detect peaks/transients for waveform data */
function waveformPeaks(samples: Float32Array, numBins: number): number[] {
  const binSize = Math.floor(samples.length / numBins);
  const peaks: number[] = [];
  for (let i = 0; i < numBins; i++) {
    let max = 0;
    const start = i * binSize;
    const end = Math.min(start + binSize, samples.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(samples[j]);
      if (abs > max) max = abs;
    }
    peaks.push(Math.round(max * 1000) / 1000);
  }
  return peaks;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST required. Send audio file as multipart/form-data or raw binary with Content-Type: audio/wav" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    let audioBuffer: ArrayBuffer;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return new Response(
          JSON.stringify({ error: "Missing 'file' field in form data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      audioBuffer = await file.arrayBuffer();
    } else {
      // Raw binary upload
      audioBuffer = await req.arrayBuffer();
    }

    if (audioBuffer.byteLength < 44) {
      return new Response(
        JSON.stringify({ error: "File too small to be a valid audio file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse WAV
    const { samples, numChannels, sampleRate, bitsPerSample, duration } = parseWav(audioBuffer);

    // Compute metrics
    const lufs = Math.round(estimateLufs(samples, sampleRate) * 10) / 10;
    const peak = Math.round(truePeak(samples) * 10) / 10;
    const rms = Math.round(rmsDbfs(samples) * 10) / 10;
    const dr = dynamicRange(samples, sampleRate);
    const width = stereoWidth(samples, numChannels);
    const peaks = waveformPeaks(samples, 200);

    const result = {
      format: {
        type: "WAV",
        sampleRate,
        channels: numChannels,
        bitsPerSample,
        duration: Math.round(duration * 100) / 100,
        fileSizeBytes: audioBuffer.byteLength,
      },
      metrics: {
        lufs: isFinite(lufs) ? lufs : null,
        truePeakDbtp: isFinite(peak) ? peak : null,
        rmsDbfs: isFinite(rms) ? rms : null,
        dynamicRangeLu: dr,
        stereoWidthPercent: width,
      },
      waveform: {
        bins: 200,
        peaks,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logError("audio-analyze", message, err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
