/**
 * Advanced audio analysis using Web Audio API.
 * Computes LUFS, True Peak, Dynamic Range, Spectral metrics,
 * BPM, Key, Section segmentation, and Spotify-style features.
 * Runs 100% in the browser — no server required.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * True Peak evaluation thresholds (dBTP).
 * Target is −1 dBTP (industry standard for streaming codecs).
 * A ±1 dB tolerance is applied: values up to 0 dBTP are accepted with a warning,
 * values above 0 dBTP are considered critical (clipping after normalization).
 */
export const TRUE_PEAK_TARGET_DBTP = -1;
export const TRUE_PEAK_TOLERANCE_DB = 1;
export const TRUE_PEAK_MAX_DBTP = TRUE_PEAK_TARGET_DBTP + TRUE_PEAK_TOLERANCE_DB; // 0 dBTP

export type TruePeakStatus = "ok" | "tolerance" | "critical";

/** Classify a True Peak measurement (dBTP) using the ±1 dB tolerance rule. */
export function evaluateTruePeak(dbtp: number): TruePeakStatus {
  if (dbtp > TRUE_PEAK_MAX_DBTP) return "critical";
  if (dbtp > TRUE_PEAK_TARGET_DBTP) return "tolerance";
  return "ok";
}

export interface AnalysisResult {
  lufs: number;
  truePeak: number;
  dynamicRange: number;
}

export interface AudioSection {
  label: string;
  start_sec: number;
  end_sec: number;
  lufs: number;
  rms_dbfs: number;
  spectral_centroid_hz: number;
  energy: number;
  onset_density: number;
}

export interface StemFeatures {
  rms_dbfs: number;
  spectral_centroid_hz: number;
  presence: boolean;
  confidence: number;
}

export interface RealAudioAnalysis {
  // Global
  lufs_integrated: number;
  lufs_short_term: number;
  true_peak_dbtp: number;
  dynamic_range_lu: number;
  bpm: number;
  key: string;
  duration_sec: number;

  // Spectral global
  spectral_centroid_hz: number;
  spectral_rolloff_hz: number;
  spectral_flatness: number;
  rms_dbfs: number;

  // Spotify-style features
  energy: number;
  danceability: number;
  acousticness: number;
  valence: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;

  // Sections
  sections: AudioSection[];

  // Optional (future: Demucs / Essentia)
  stems?: {
    vocals: StemFeatures;
    drums: StemFeatures;
    bass: StemFeatures;
    other: StemFeatures;
  };
  instruments_detected?: string[];
  instrument_confidence?: Record<string, number>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeMono(audioBuffer: AudioBuffer): Float32Array {
  const length = audioBuffer.length;
  const numChannels = audioBuffer.numberOfChannels;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  if (numChannels > 1) {
    for (let i = 0; i < length; i++) mono[i] /= numChannels;
  }
  return mono;
}

// ── Core metrics ─────────────────────────────────────────────────────────────

function computeTruePeak(mono: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < mono.length; i++) {
    const abs = Math.abs(mono[i]);
    if (abs > peak) peak = abs;
  }
  return peak > 0 ? 20 * Math.log10(peak) : -100;
}

function computeRmsDbfs(mono: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < mono.length; i++) sum += mono[i] * mono[i];
  const rms = Math.sqrt(sum / mono.length);
  return rms > 0 ? 20 * Math.log10(rms) : -100;
}

function computeBlockEnergies(mono: Float32Array, sampleRate: number, windowSec: number): number[] {
  const blockSize = Math.floor(sampleRate * windowSec);
  const energies: number[] = [];
  for (let start = 0; start + blockSize <= mono.length; start += blockSize) {
    let sum = 0;
    for (let i = start; i < start + blockSize; i++) sum += mono[i] * mono[i];
    const rms = sum / blockSize;
    if (rms > 0) energies.push(rms);
  }
  return energies;
}

function computeLufs(blockEnergies: number[]): number {
  if (blockEnergies.length === 0) return -70;
  const absoluteThreshold = Math.pow(10, -7);
  const gated = blockEnergies.filter(e => e > absoluteThreshold);
  if (gated.length === 0) return -70;
  const ungatedMean = gated.reduce((a, b) => a + b, 0) / gated.length;
  const relativeThreshold = ungatedMean * Math.pow(10, -1);
  const finalBlocks = gated.filter(e => e >= relativeThreshold);
  if (finalBlocks.length === 0) return -70;
  const meanEnergy = finalBlocks.reduce((a, b) => a + b, 0) / finalBlocks.length;
  return -0.691 + 10 * Math.log10(meanEnergy);
}

function computeDynamicRange(blockEnergies: number[]): number {
  if (blockEnergies.length < 2) return 0;
  const sorted = [...blockEnergies].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  if (p10 > 0 && p95 > 0) return 10 * Math.log10(p95 / p10);
  return 0;
}

function computeShortTermLufs(mono: Float32Array, sampleRate: number): number {
  // 3-second windows, take the max
  const energies = computeBlockEnergies(mono, sampleRate, 3.0);
  if (energies.length === 0) return -70;
  const maxEnergy = Math.max(...energies);
  return maxEnergy > 0 ? -0.691 + 10 * Math.log10(maxEnergy) : -70;
}

// ── Spectral metrics ─────────────────────────────────────────────────────────

interface SpectralResult {
  centroid: number;
  rolloff: number;
  flatness: number;
  magnitudes: Float64Array;
  freqPerBin: number;
}

function computeSpectralMetrics(mono: Float32Array, sampleRate: number): SpectralResult {
  const fftSize = 4096;
  const hopSize = fftSize / 2;
  const binCount = fftSize / 2;
  const freqPerBin = sampleRate / fftSize;
  const numSegments = Math.max(1, Math.floor((mono.length - fftSize) / hopSize) + 1);
  const cappedSegments = Math.min(numSegments, 80);

  const magnitudes = new Float64Array(binCount);

  for (let seg = 0; seg < cappedSegments; seg++) {
    const offset = seg * hopSize;
    if (offset + fftSize > mono.length) break;

    const real = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
      real[i] = mono[offset + i] * w;
    }

    for (let k = 0; k < binCount; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < fftSize; n++) {
        const angle = (2 * Math.PI * k * n) / fftSize;
        re += real[n] * Math.cos(angle);
        im -= real[n] * Math.sin(angle);
      }
      magnitudes[k] += Math.sqrt(re * re + im * im) / cappedSegments;
    }
  }

  // Spectral Centroid
  let weightedSum = 0, magSum = 0;
  for (let k = 0; k < binCount; k++) {
    const freq = k * freqPerBin;
    weightedSum += freq * magnitudes[k];
    magSum += magnitudes[k];
  }
  const centroid = magSum > 0 ? weightedSum / magSum : 0;

  // Spectral Rolloff (85%)
  const totalEnergy = magSum;
  let cumulative = 0;
  let rolloff = 0;
  for (let k = 0; k < binCount; k++) {
    cumulative += magnitudes[k];
    if (cumulative >= 0.85 * totalEnergy) {
      rolloff = k * freqPerBin;
      break;
    }
  }

  // Spectral Flatness = geomean / mean
  let logSum = 0;
  let count = 0;
  for (let k = 1; k < binCount; k++) {
    if (magnitudes[k] > 1e-10) {
      logSum += Math.log(magnitudes[k]);
      count++;
    }
  }
  const arithmeticMean = magSum / binCount;
  const geometricMean = count > 0 ? Math.exp(logSum / count) : 0;
  const flatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

  return { centroid, rolloff, flatness, magnitudes, freqPerBin };
}

// ── BPM Detection ────────────────────────────────────────────────────────────

function detectBPM(mono: Float32Array, sampleRate: number): number {
  // Compute onset envelope using energy in short windows
  const envWindowSize = Math.floor(sampleRate * 0.01); // 10ms
  const envHop = envWindowSize;
  const envLength = Math.floor(mono.length / envHop);
  const envelope = new Float32Array(envLength);

  for (let i = 0; i < envLength; i++) {
    const start = i * envHop;
    let sum = 0;
    const end = Math.min(start + envWindowSize, mono.length);
    for (let j = start; j < end; j++) sum += mono[j] * mono[j];
    envelope[i] = Math.sqrt(sum / envWindowSize);
  }

  // Onset detection function (first-order difference, half-wave rectified)
  const onset = new Float32Array(envLength);
  for (let i = 1; i < envLength; i++) {
    const diff = envelope[i] - envelope[i - 1];
    onset[i] = diff > 0 ? diff : 0;
  }

  // Autocorrelation in BPM range 60-200
  const envSampleRate = sampleRate / envHop;
  const minLag = Math.floor(envSampleRate * 60 / 200); // 200 BPM
  const maxLag = Math.floor(envSampleRate * 60 / 60);  // 60 BPM
  const cappedMaxLag = Math.min(maxLag, onset.length - 1);

  let bestLag = minLag;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= cappedMaxLag; lag++) {
    let corr = 0;
    const n = Math.min(onset.length - lag, 2000); // limit computation
    for (let i = 0; i < n; i++) {
      corr += onset[i] * onset[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = (envSampleRate * 60) / bestLag;
  return Math.round(bpm * 10) / 10;
}

// ── Key Detection ────────────────────────────────────────────────────────────

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Krumhansl-Kessler profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function detectKey(magnitudes: Float64Array, freqPerBin: number): string {
  // Build chromagram: fold FFT bins into 12 pitch classes
  const chroma = new Float64Array(12);
  const binCount = magnitudes.length;

  for (let k = 1; k < binCount; k++) {
    const freq = k * freqPerBin;
    if (freq < 60 || freq > 5000) continue;
    // MIDI note number
    const midi = 12 * Math.log2(freq / 440) + 69;
    const pitchClass = Math.round(midi) % 12;
    const idx = pitchClass < 0 ? pitchClass + 12 : pitchClass;
    chroma[idx] += magnitudes[k];
  }

  // Normalize
  const maxChroma = Math.max(...chroma, 1e-10);
  for (let i = 0; i < 12; i++) chroma[i] /= maxChroma;

  // Correlate with all 24 key profiles (12 major + 12 minor)
  let bestKey = "C";
  let bestCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    let corrMajor = 0, corrMinor = 0;
    for (let i = 0; i < 12; i++) {
      const idx = (i + shift) % 12;
      corrMajor += chroma[idx] * MAJOR_PROFILE[i];
      corrMinor += chroma[idx] * MINOR_PROFILE[i];
    }
    if (corrMajor > bestCorr) {
      bestCorr = corrMajor;
      bestKey = KEY_NAMES[shift];
    }
    if (corrMinor > bestCorr) {
      bestCorr = corrMinor;
      bestKey = KEY_NAMES[shift] + "m";
    }
  }

  return bestKey;
}

// ── Section Detection ────────────────────────────────────────────────────────

function detectSections(mono: Float32Array, sampleRate: number): AudioSection[] {
  const sectionDuration = 8; // 8-second analysis windows
  const samplePerSection = Math.floor(sampleRate * sectionDuration);
  const numSections = Math.floor(mono.length / samplePerSection);
  if (numSections < 2) return [];

  // Compute per-section features
  interface SectionData {
    start: number;
    end: number;
    energy: number;
    rms: number;
    lufs: number;
    centroid: number;
    onsetDensity: number;
  }
  const sectionData: SectionData[] = [];

  for (let s = 0; s < numSections; s++) {
    const startSample = s * samplePerSection;
    const segment = mono.subarray(startSample, startSample + samplePerSection);

    // RMS
    let sum = 0;
    for (let i = 0; i < segment.length; i++) sum += segment[i] * segment[i];
    const rms = Math.sqrt(sum / segment.length);
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

    // Energy (normalized)
    const energy = Math.min(1, rms * 5);

    // LUFS (simplified for segment)
    const blockEnergies = computeBlockEnergies(segment, sampleRate, 0.4);
    const lufs = computeLufs(blockEnergies);

    // Centroid (simplified: use a small FFT)
    const fftSize = 2048;
    const binCount = fftSize / 2;
    const freqPerBin = sampleRate / fftSize;
    let wSum = 0, mSum = 0;

    // Just analyze the middle portion
    const midStart = Math.floor(segment.length / 2 - fftSize / 2);
    if (midStart >= 0 && midStart + fftSize <= segment.length) {
      for (let k = 0; k < binCount; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < fftSize; n++) {
          const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (fftSize - 1)));
          const angle = (2 * Math.PI * k * n) / fftSize;
          re += segment[midStart + n] * w * Math.cos(angle);
          im -= segment[midStart + n] * w * Math.sin(angle);
        }
        const mag = Math.sqrt(re * re + im * im);
        wSum += k * freqPerBin * mag;
        mSum += mag;
      }
    }
    const centroid = mSum > 0 ? wSum / mSum : 0;

    // Onset density
    const envWin = Math.floor(sampleRate * 0.01);
    const envHop = envWin;
    const envLen = Math.floor(segment.length / envHop);
    const env = new Float32Array(envLen);
    for (let i = 0; i < envLen; i++) {
      const st = i * envHop;
      let s2 = 0;
      for (let j = st; j < Math.min(st + envWin, segment.length); j++) s2 += segment[j] * segment[j];
      env[i] = Math.sqrt(s2 / envWin);
    }
    let onsets = 0;
    const runLen = Math.min(10, Math.floor(envLen / 4));
    if (envLen > runLen + 1) {
      for (let i = runLen; i < envLen - 1; i++) {
        let localMean = 0;
        for (let j = i - runLen; j < i; j++) localMean += env[j];
        localMean /= runLen;
        if (env[i] > env[i - 1] && env[i] > env[i + 1] && env[i] > localMean * 1.5) onsets++;
      }
    }

    sectionData.push({
      start: s * sectionDuration,
      end: (s + 1) * sectionDuration,
      energy,
      rms: rmsDb,
      lufs,
      centroid,
      onsetDensity: onsets / sectionDuration,
    });
  }

  // Cluster sections into labels based on energy profile
  // Simple approach: sort by energy, assign labels
  const avgEnergy = sectionData.reduce((a, s) => a + s.energy, 0) / sectionData.length;
  const avgCentroid = sectionData.reduce((a, s) => a + s.centroid, 0) / sectionData.length;

  const sections: AudioSection[] = sectionData.map((sd, i) => {
    let label: string;
    const totalSections = sectionData.length;

    if (i === 0 && sd.energy < avgEnergy * 0.8) {
      label = "intro";
    } else if (i >= totalSections - 1 && sd.energy < avgEnergy * 0.7) {
      label = "outro";
    } else if (sd.energy > avgEnergy * 1.15 && sd.centroid > avgCentroid * 1.05) {
      label = "chorus";
    } else if (sd.energy > avgEnergy * 1.05 && sd.centroid < avgCentroid * 0.95) {
      label = "pre_chorus";
    } else if (sd.energy < avgEnergy * 0.85 && sd.centroid > avgCentroid * 1.1) {
      label = "bridge";
    } else {
      label = "verse";
    }

    return {
      label,
      start_sec: sd.start,
      end_sec: sd.end,
      lufs: Math.round(sd.lufs * 10) / 10,
      rms_dbfs: Math.round(sd.rms * 10) / 10,
      spectral_centroid_hz: Math.round(sd.centroid),
      energy: Math.round(sd.energy * 100) / 100,
      onset_density: Math.round(sd.onsetDensity * 10) / 10,
    };
  });

  return sections;
}

// ── Spotify-style features ───────────────────────────────────────────────────

function computeSpotifyFeatures(
  mono: Float32Array,
  sampleRate: number,
  spectral: SpectralResult,
  bpm: number,
  rmsDb: number,
): {
  energy: number;
  danceability: number;
  acousticness: number;
  valence: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
} {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  // RMS normalized (quiet = 0, loud = 1)
  const rmsNorm = clamp((rmsDb + 60) / 50);

  // Energy: based on RMS + spectral centroid
  const centroidNorm = clamp(spectral.centroid / 5000);
  const energy = clamp(rmsNorm * 0.7 + centroidNorm * 0.3);

  // Danceability: BPM proximity to 100-130 range + low spectral flatness
  const bpmScore = 1 - Math.min(1, Math.abs(bpm - 115) / 60);
  const danceability = clamp(bpmScore * 0.6 + rmsNorm * 0.2 + (1 - spectral.flatness) * 0.2);

  // Acousticness: low spectral flatness + low centroid = more acoustic
  const acousticness = clamp((1 - centroidNorm) * 0.5 + (1 - spectral.flatness) * 0.3 + (1 - rmsNorm) * 0.2);

  // Valence: higher centroid + higher energy = more positive
  const valence = clamp(centroidNorm * 0.4 + energy * 0.3 + danceability * 0.3);

  // Zero-crossing rate for speechiness
  let zeroCrossings = 0;
  for (let i = 1; i < mono.length; i++) {
    if ((mono[i] >= 0 && mono[i - 1] < 0) || (mono[i] < 0 && mono[i - 1] >= 0)) zeroCrossings++;
  }
  const duration = mono.length / sampleRate;
  const zcr = zeroCrossings / duration;
  const zcrNorm = clamp(zcr / 10000);

  // Speechiness: ZCR + flatness + mid-band energy
  const midBandEnergy = clamp(spectral.centroid / 3000);
  const speechiness = clamp(zcrNorm * 0.4 + spectral.flatness * 0.3 + midBandEnergy * 0.3);

  // Instrumentalness: inverse of speechiness proxy
  const instrumentalness = clamp(1 - speechiness * 1.5);

  // Liveness: ZCR variation + dynamic range indicator
  const liveness = clamp(zcrNorm * 0.5 + spectral.flatness * 0.3 + (1 - rmsNorm) * 0.2);

  return { energy, danceability, acousticness, valence, instrumentalness, liveness, speechiness };
}

// ── Main analysis function ───────────────────────────────────────────────────

/**
 * Full audio analysis returning RealAudioAnalysis.
 * Also returns the legacy AnalysisResult for backward compatibility.
 */
export async function analyzeAudioFull(file: File): Promise<{
  legacy: AnalysisResult;
  real: RealAudioAnalysis;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch {
    try { await audioContext.close(); } catch { /* ignore */ }
    throw new Error(
      "Não foi possível decodificar o arquivo de áudio. Verifique se o formato é válido (WAV, MP3, OGG, FLAC ou AAC) e se o arquivo não está corrompido."
    );
  }
  await audioContext.close();

  const sampleRate = audioBuffer.sampleRate;
  const mono = decodeMono(audioBuffer);
  const duration = audioBuffer.duration;

  // Core metrics
  const truePeak = computeTruePeak(mono);
  const rmsDb = computeRmsDbfs(mono);
  const blockEnergies = computeBlockEnergies(mono, sampleRate, 0.4);
  const lufsIntegrated = computeLufs(blockEnergies);
  const dynamicRange = computeDynamicRange(blockEnergies);
  const lufsShortTerm = computeShortTermLufs(mono, sampleRate);

  // Spectral
  const spectral = computeSpectralMetrics(mono, sampleRate);

  // BPM
  const bpm = detectBPM(mono, sampleRate);

  // Key
  const key = detectKey(spectral.magnitudes, spectral.freqPerBin);

  // Sections
  const sections = detectSections(mono, sampleRate);

  // Spotify-style
  const features = computeSpotifyFeatures(mono, sampleRate, spectral, bpm, rmsDb);

  const r = (v: number) => Math.round(v * 10) / 10;

  const real: RealAudioAnalysis = {
    lufs_integrated: r(lufsIntegrated),
    lufs_short_term: r(lufsShortTerm),
    true_peak_dbtp: r(truePeak),
    dynamic_range_lu: r(dynamicRange),
    bpm,
    key,
    duration_sec: Math.round(duration * 10) / 10,
    spectral_centroid_hz: Math.round(spectral.centroid),
    spectral_rolloff_hz: Math.round(spectral.rolloff),
    spectral_flatness: Math.round(spectral.flatness * 1000) / 1000,
    rms_dbfs: r(rmsDb),
    energy: Math.round(features.energy * 100) / 100,
    danceability: Math.round(features.danceability * 100) / 100,
    acousticness: Math.round(features.acousticness * 100) / 100,
    valence: Math.round(features.valence * 100) / 100,
    instrumentalness: Math.round(features.instrumentalness * 100) / 100,
    liveness: Math.round(features.liveness * 100) / 100,
    speechiness: Math.round(features.speechiness * 100) / 100,
    sections,
  };

  const legacy: AnalysisResult = {
    lufs: r(lufsIntegrated),
    truePeak: r(truePeak),
    dynamicRange: r(dynamicRange),
  };

  return { legacy, real };
}

/**
 * Legacy analysis function — lightweight version for Master Analyzer.
 * Computes only LUFS, true peak and dynamic range, downsampling to 22.05 kHz mono
 * to drastically reduce memory and CPU on mobile devices (avoids tab being killed
 * by Chrome Android on large MP3 masters). The arrayBuffer is released ASAP.
 */
export async function analyzeAudio(file: File): Promise<AnalysisResult> {
  // Hard cap to avoid OOM on mobile (200 MB)
  if (file.size > 200 * 1024 * 1024) {
    throw new Error("Arquivo muito grande (>200MB). Reduza o tamanho ou exporte em MP3 320 kbps.");
  }

  // Detect mobile/low-memory devices to apply stricter limits and avoid tab kills
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const lowMem = typeof navigator !== "undefined" && (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4;
  // Analyze at most ~120s on mobile (representative window for LUFS/TP/DR), full track on desktop
  const MAX_DURATION_SEC = isMobile || lowMem ? 120 : 600;

  let arrayBuffer: ArrayBuffer | null = await file.arrayBuffer();

  // Step 1 — decode at original rate using a temporary AudioContext
  const probeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decoded: AudioBuffer;
  try {
    decoded = await probeCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    try { await probeCtx.close(); } catch { /* ignore */ }
    arrayBuffer = null;
    throw new Error(
      "Não foi possível decodificar o arquivo de áudio. Verifique se o formato é válido (WAV, MP3, OGG, FLAC ou AAC) e se o arquivo não está corrompido."
    );
  }
  // Release the original ArrayBuffer immediately
  arrayBuffer = null;
  try { await probeCtx.close(); } catch { /* ignore */ }

  // Step 2 — try downsample to 22.05 kHz mono via OfflineAudioContext (best path).
  // On mobile this can OOM-kill the tab on long tracks, so we fallback to an in-place
  // mono sum from the AudioBuffer if rendering fails or the track is very long.
  const TARGET_SR = 22050;
  const analyzeSeconds = Math.min(decoded.duration, MAX_DURATION_SEC);
  let mono: Float32Array;
  let sampleRate: number;

  try {
    const targetLength = Math.max(1, Math.ceil(analyzeSeconds * TARGET_SR));
    const offline = new OfflineAudioContext(1, targetLength, TARGET_SR);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    sampleRate = rendered.sampleRate;
    mono = rendered.getChannelData(0).slice(0, targetLength);
  } catch (err) {
    console.warn("OfflineAudioContext fallback (likely low memory):", err);
    // Fallback: sum channels manually, capped to MAX_DURATION_SEC
    const srcSr = decoded.sampleRate;
    const numCh = decoded.numberOfChannels;
    const wantSamples = Math.min(decoded.length, Math.floor(analyzeSeconds * srcSr));
    const sum = new Float32Array(wantSamples);
    for (let ch = 0; ch < numCh; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i = 0; i < wantSamples; i++) sum[i] += data[i] / numCh;
    }
    sampleRate = srcSr;
    mono = sum;
  }

  // Free the decoded buffer reference ASAP
  (decoded as unknown) = null as unknown as AudioBuffer;

  const truePeak = computeTruePeak(mono);
  const blockEnergies = computeBlockEnergies(mono, sampleRate, 0.4);
  const lufsIntegrated = computeLufs(blockEnergies);
  const dynamicRange = computeDynamicRange(blockEnergies);

  const r = (v: number) => Math.round(v * 10) / 10;
  return {
    lufs: r(lufsIntegrated),
    truePeak: r(truePeak),
    dynamicRange: r(dynamicRange),
  };
}

/**
 * Generate dynamic fix suggestions based on measured values.
 */
export function generateSuggestions(result: AnalysisResult): string[] {
  const suggestions: string[] = [];

  if (result.lufs > -14) {
    suggestions.push(`LUFS está em ${result.lufs} — reduza o ganho do limiter em ~${(result.lufs + 14).toFixed(1)} dB para atingir -14 LUFS (Spotify)`);
  } else if (result.lufs < -16) {
    suggestions.push(`LUFS está em ${result.lufs} — o master pode soar baixo nas plataformas. Considere aumentar o ganho em ~${(-16 - result.lufs).toFixed(1)} dB`);
  } else {
    suggestions.push("Loudness dentro da faixa ideal para streaming (-14 a -16 LUFS) ✓");
  }

  const tpStatus = evaluateTruePeak(result.truePeak);
  if (tpStatus === "critical") {
    suggestions.push(`True Peak em ${result.truePeak} dBTP — acima do limite máximo de ${TRUE_PEAK_MAX_DBTP} dBTP (alvo ${TRUE_PEAK_TARGET_DBTP} dBTP ± ${TRUE_PEAK_TOLERANCE_DB} dB). Reduza o ceiling do limiter em ${(result.truePeak - TRUE_PEAK_TARGET_DBTP).toFixed(1)} dB para evitar clipping nos codecs`);
  } else if (tpStatus === "tolerance") {
    suggestions.push(`True Peak em ${result.truePeak} dBTP — dentro da tolerância de ±${TRUE_PEAK_TOLERANCE_DB} dB sobre o alvo ${TRUE_PEAK_TARGET_DBTP} dBTP. Aceitável, mas monitore o limiter ✓`);
  } else {
    suggestions.push(`True Peak dentro do alvo (≤ ${TRUE_PEAK_TARGET_DBTP} dBTP) ✓`);
  }

  if (result.dynamicRange < 5) {
    suggestions.push(`Dynamic range de apenas ${result.dynamicRange} LU — considere usar menos compressão no master bus`);
  } else if (result.dynamicRange > 12) {
    suggestions.push(`Dynamic range de ${result.dynamicRange} LU — pode soar inconsistente. Considere um pouco mais de compressão`);
  } else {
    suggestions.push("Dynamic range saudável para streaming ✓");
  }

  return suggestions;
}
