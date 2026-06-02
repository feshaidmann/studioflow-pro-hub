/**
 * Enhanced heuristic instrument detection based on frequency spectrum analysis.
 * Uses Web Audio API to estimate which instrument families are present.
 *
 * Improvements over v1:
 * - 50% overlapping segments for better temporal resolution
 * - Spectral flux (percussiveness indicator)
 * - Zero-crossing rate (noise/brightness indicator)
 * - Transient detection (onset peaks per second)
 * - Raw band values + derived metrics exposed for AI prompt enrichment
 *
 * v2 performance fix: replaced O(N²) DFT with FFT.js O(N log N), matching
 * audioAnalysis.ts. Segments are now distributed across the full track
 * (strided sampling) rather than capped to the opening seconds.
 */

type FFTCtor = new (size: number) => { createComplexArray(): number[]; realTransform(out: number[], data: ArrayLike<number>): void; completeSpectrum(out: number[]): void };
import FFTImport from "fft.js";
const FFT: FFTCtor = FFTImport as unknown as FFTCtor;

export interface SpectralMetrics {
  spectralFlux: number;       // 0-1, average change between frames
  zeroCrossingRate: number;   // 0-1, normalized
  transientDensity: number;   // onsets per second
}

export interface InstrumentDetection {
  instruments: string[];
  bands: {
    subBass: number;    // 20-60 Hz
    bass: number;       // 60-250 Hz
    lowMid: number;     // 250-500 Hz
    mid: number;        // 500-2000 Hz
    upperMid: number;   // 2000-4000 Hz
    presence: number;   // 4000-6000 Hz
    brilliance: number; // 6000-20000 Hz
  };
  metrics: SpectralMetrics;
}

export async function detectInstruments(file: File): Promise<InstrumentDetection> {
  const emptyResult: InstrumentDetection = {
    instruments: [],
    bands: { subBass: 0, bass: 0, lowMid: 0, mid: 0, upperMid: 0, presence: 0, brilliance: 0 },
    metrics: { spectralFlux: 0, zeroCrossingRate: 0, transientDensity: 0 },
  };

  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 44100 });

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch {
    await audioContext.close();
    return emptyResult;
  }

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  // Merge to mono
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  if (numChannels > 1) {
    for (let i = 0; i < length; i++) mono[i] /= numChannels;
  }

  await audioContext.close();

  // ── Zero-Crossing Rate ──────────────────────────────────────────────
  let zeroCrossings = 0;
  for (let i = 1; i < length; i++) {
    if ((mono[i] >= 0 && mono[i - 1] < 0) || (mono[i] < 0 && mono[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  const durationSec = length / sampleRate;
  // Normalize: typical ZCR for music is 1000-8000 crossings/sec
  const rawZCR = zeroCrossings / durationSec;
  const normalizedZCR = Math.min(1, Math.max(0, rawZCR / 10000));

  // ── FFT with 50% overlap (O(N log N) via FFT.js) ─────────────────────────
  const fftSize = 4096;
  const hopSize = fftSize / 2; // 50% overlap
  const binCount = fftSize / 2;
  const numSegments = Math.max(1, Math.floor((length - fftSize) / hopSize) + 1);
  // With FFT.js the cost per frame is ~O(N log N), so 200 frames is cheap.
  // When the track is longer than 200 natural hops we stride evenly across the
  // full duration so we sample the whole arrangement, not just the opening bars.
  const cappedSegments = Math.min(numSegments, 200);
  const useStride = numSegments > 200;

  const magnitudes = new Float64Array(binCount);
  const prevMags = new Float64Array(binCount);
  let totalFlux = 0;
  let fluxFrames = 0;
  let actualSegments = 0;

  // Pre-allocate once outside the loop — avoids repeated GC pressure
  const fft = new FFT(fftSize);
  const fftOut = fft.createComplexArray();
  const fftBuf = new Array<number>(fftSize);
  const segMags = new Float64Array(binCount);
  const hannWindow = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  for (let seg = 0; seg < cappedSegments; seg++) {
    const offset = useStride
      ? Math.floor(seg * (length - fftSize) / Math.max(cappedSegments - 1, 1))
      : seg * hopSize;
    if (offset + fftSize > length) break;
    actualSegments++;

    // Apply Hann window then FFT (O(N log N))
    for (let i = 0; i < fftSize; i++) fftBuf[i] = mono[offset + i] * hannWindow[i];
    fft.realTransform(fftOut, fftBuf);
    fft.completeSpectrum(fftOut);

    for (let k = 0; k < binCount; k++) {
      const re = fftOut[2 * k];
      const im = fftOut[2 * k + 1];
      segMags[k] = Math.sqrt(re * re + im * im);
      magnitudes[k] += segMags[k]; // accumulate raw sum; divide after loop
    }

    // Spectral flux: sum of positive magnitude differences from previous frame
    if (seg > 0) {
      let flux = 0;
      for (let k = 0; k < binCount; k++) {
        const diff = segMags[k] - prevMags[k];
        if (diff > 0) flux += diff;
      }
      totalFlux += flux;
      fluxFrames++;
    }
    prevMags.set(segMags);
  }

  // Divide by actual iterations so an early break doesn't under-count averages
  if (actualSegments > 0) {
    for (let k = 0; k < binCount; k++) magnitudes[k] /= actualSegments;
  }

  // Normalize spectral flux (0-1)
  const avgFlux = fluxFrames > 0 ? totalFlux / fluxFrames : 0;
  const maxPossibleFlux = 500; // empirical ceiling
  const normalizedFlux = Math.min(1, Math.max(0, avgFlux / maxPossibleFlux));

  // ── Transient Detection (onset peaks) ───────────────────────────────
  // Use energy envelope with short window and detect peaks
  const envWindowSize = Math.floor(sampleRate * 0.01); // 10ms windows
  const envHop = Math.floor(envWindowSize / 2);
  const envLength = Math.floor((length - envWindowSize) / envHop);
  const envelope = new Float64Array(Math.max(0, envLength));

  for (let i = 0; i < envLength; i++) {
    const start = i * envHop;
    let sum = 0;
    for (let j = 0; j < envWindowSize && start + j < length; j++) {
      sum += mono[start + j] * mono[start + j];
    }
    envelope[i] = Math.sqrt(sum / envWindowSize);
  }

  // Count onsets: local peaks in envelope that exceed a dynamic threshold
  let onsetCount = 0;
  if (envelope.length > 4) {
    // Compute running mean for adaptive threshold
    const runLen = Math.min(20, Math.floor(envelope.length / 4));
    for (let i = runLen; i < envelope.length - 1; i++) {
      let localMean = 0;
      for (let j = i - runLen; j < i; j++) localMean += envelope[j];
      localMean /= runLen;

      if (
        envelope[i] > envelope[i - 1] &&
        envelope[i] > envelope[i + 1] &&
        envelope[i] > localMean * 1.5
      ) {
        onsetCount++;
      }
    }
  }
  const transientDensity = durationSec > 0 ? onsetCount / durationSec : 0;

  // ── Band Energies ──────────────────────────────────────────────────
  const freqPerBin = sampleRate / fftSize;
  const bandEnergy = (lowHz: number, highHz: number): number => {
    const lowBin = Math.max(0, Math.floor(lowHz / freqPerBin));
    const highBin = Math.min(binCount - 1, Math.ceil(highHz / freqPerBin));
    let sum = 0;
    for (let i = lowBin; i <= highBin; i++) sum += magnitudes[i];
    return sum / Math.max(1, highBin - lowBin + 1);
  };

  const bands = {
    subBass: bandEnergy(20, 60),
    bass: bandEnergy(60, 250),
    lowMid: bandEnergy(250, 500),
    mid: bandEnergy(500, 2000),
    upperMid: bandEnergy(2000, 4000),
    presence: bandEnergy(4000, 6000),
    brilliance: bandEnergy(6000, 20000),
  };

  // Normalize bands
  const maxBand = Math.max(...Object.values(bands), 0.001);
  const norm = {
    subBass: bands.subBass / maxBand,
    bass: bands.bass / maxBand,
    lowMid: bands.lowMid / maxBand,
    mid: bands.mid / maxBand,
    upperMid: bands.upperMid / maxBand,
    presence: bands.presence / maxBand,
    brilliance: bands.brilliance / maxBand,
  };

  // ── Heuristic Rules (refined with new metrics) ─────────────────────
  const instruments: string[] = [];

  // Bass instrument: strong low end
  if (norm.subBass > 0.4 || norm.bass > 0.5) {
    instruments.push("Baixo");
  }

  // Kick: strong sub-bass + high transient density
  if (norm.subBass > 0.5 && normalizedFlux > 0.2) {
    instruments.push("Bumbo / Kick");
  }

  // Cymbals/hi-hat: high brilliance + high ZCR (noise-like)
  if (norm.brilliance > 0.25 && norm.presence > 0.2 && normalizedZCR > 0.3) {
    instruments.push("Pratos / Hi-hat");
  }

  // Vocals: mid + upper-mid presence, low instrumentalness proxy
  if (norm.mid > 0.4 && norm.upperMid > 0.3 && normalizedFlux < 0.7) {
    instruments.push("Vocais");
  }

  // Guitar/acoustic: low-mid + mid energy
  if (norm.lowMid > 0.35 && norm.mid > 0.3) {
    instruments.push("Guitarra / Violão");
  }

  // Keys/piano: mid + presence, with some transient activity
  if (norm.mid > 0.35 && norm.presence > 0.2 && norm.lowMid > 0.25 && transientDensity > 1) {
    instruments.push("Teclado / Piano");
  }

  // Strings/winds: upper-mid + presence, sustained (low flux)
  if (norm.upperMid > 0.4 && norm.presence > 0.35 && normalizedFlux < 0.5) {
    instruments.push("Cordas agudas / Sopros");
  }

  // Full drum kit: bass + low-mid + brilliance + high transient density
  if (norm.bass > 0.35 && norm.lowMid > 0.3 && norm.brilliance > 0.15 && transientDensity > 3) {
    instruments.push("Bateria completa");
  }

  // Synth pad: sustained mid/low-mid, low flux, low ZCR
  if (norm.mid > 0.3 && norm.lowMid > 0.25 && normalizedFlux < 0.2 && normalizedZCR < 0.25) {
    instruments.push("Sintetizador / Pad");
  }

  if (instruments.length === 0) {
    instruments.push("Não identificado");
  }

  return {
    instruments,
    bands: norm,
    metrics: {
      spectralFlux: Math.round(normalizedFlux * 1000) / 1000,
      zeroCrossingRate: Math.round(normalizedZCR * 1000) / 1000,
      transientDensity: Math.round(transientDensity * 100) / 100,
    },
  };
}
