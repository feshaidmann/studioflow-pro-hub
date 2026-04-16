// Browser-side video loop generator with composable layer system.
// Animates a static image and records the result as a WebM blob.

import {
  type Intensity,
  type LayerContext,
  type MotionType,
  type Particle,
  buildNoiseTiles,
  buildParticles,
  renderBaseImage,
  renderChromaticAberration,
  renderGlow,
  renderGrain,
  renderLightLeaks,
  renderLightRays,
  renderParticles,
  renderScanlines,
  renderVignette,
} from "./videoLayers";

// Backwards-compat type (used by older callers)
export type LoopMotion = "zoom" | "pan" | "parallax";

export type VideoPreset =
  | "cinematic"
  | "dream"
  | "live"
  | "vhs"
  | "minimal"
  | "energy";

export interface PresetConfig {
  motion: MotionType;
  layers: {
    grain?: boolean;
    lightLeaks?: boolean;
    leakColors?: [string, string];
    particles?: number; // particle count (0 = off)
    glow?: boolean;
    chromatic?: boolean;
    rays?: boolean;
    scanlines?: boolean;
    vignette?: boolean;
  };
}

export const PRESETS: Record<VideoPreset, PresetConfig> = {
  cinematic: {
    motion: "drift",
    layers: { grain: true, lightLeaks: true, vignette: true, leakColors: ["255, 170, 110", "180, 110, 220"] },
  },
  dream: {
    motion: "breathe",
    layers: { glow: true, chromatic: true, particles: 10, vignette: true },
  },
  live: {
    motion: "shake",
    layers: { grain: true, rays: true, vignette: true },
  },
  vhs: {
    motion: "pan",
    layers: { scanlines: true, grain: true, chromatic: true },
  },
  minimal: {
    motion: "breathe",
    layers: { glow: true, vignette: true },
  },
  energy: {
    motion: "pan",
    layers: { lightLeaks: true, glow: true, particles: 8, leakColors: ["255, 80, 130", "120, 200, 255"] },
  },
};

export const PRESET_LABELS: Record<VideoPreset, { label: string; desc: string }> = {
  cinematic: { label: "Cinematográfico", desc: "Drift + light leaks + grão" },
  dream: { label: "Sonho", desc: "Respiração + glow + partículas" },
  live: { label: "Show ao vivo", desc: "Tremor + raios de luz" },
  vhs: { label: "Lofi / VHS", desc: "Scanlines + grão + glitch" },
  minimal: { label: "Minimal", desc: "Respiração + glow sutil" },
  energy: { label: "Festa", desc: "Pan + leaks coloridos + brilho" },
};

interface GenerateVideoLoopParams {
  imageUrl: string;
  width: number;
  height: number;
  durationSec: 3 | 4 | 5;
  // New API
  preset?: VideoPreset;
  intensity?: Intensity;
  // Legacy API (still supported for callers that pass `motion`)
  motion?: LoopMotion | MotionType;
  fps?: number;
  onProgress?: (progress: number) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pickMimeType(): { mime: string; ext: "webm" } {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return { mime: m, ext: "webm" };
    }
  }
  return { mime: "video/webm", ext: "webm" };
}

export async function generateVideoLoop(params: GenerateVideoLoopParams): Promise<Blob> {
  const {
    imageUrl, width, height, durationSec,
    preset, intensity = "medium", motion: legacyMotion,
    fps = 30, onProgress,
  } = params;

  // Resolve config: preset wins; otherwise build a minimal config from legacy `motion`.
  const config: PresetConfig = preset
    ? PRESETS[preset]
    : { motion: (legacyMotion as MotionType) ?? "zoom", layers: { vignette: true } };

  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado");

  // Image fitting (cover)
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  let baseDrawW: number, baseDrawH: number;
  if (imgRatio > canvasRatio) {
    baseDrawH = height;
    baseDrawW = height * imgRatio;
  } else {
    baseDrawW = width;
    baseDrawH = width / imgRatio;
  }

  // Pre-build expensive resources
  const noiseTiles = config.layers.grain || config.layers.scanlines ? buildNoiseTiles(128, 5) : undefined;
  const particles: Particle[] | undefined = config.layers.particles
    ? buildParticles(Math.min(15, config.layers.particles))
    : undefined;

  const layerCtx: LayerContext = {
    width, height, baseImage: img, baseDrawW, baseDrawH, noiseTiles, particles,
  };

  const stream = canvas.captureStream(fps);
  const { mime } = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  const startTime = performance.now();
  const totalMs = durationSec * 1000;

  const drawFrame = (elapsedMs: number) => {
    const t = (elapsedMs % totalMs) / totalMs;

    // Composition order is fixed for predictable results
    renderBaseImage(ctx, t, intensity, layerCtx, config.motion);
    if (config.layers.chromatic) renderChromaticAberration(ctx, t, intensity, layerCtx);
    if (config.layers.lightLeaks) renderLightLeaks(ctx, t, intensity, layerCtx, config.layers.leakColors);
    if (config.layers.rays) renderLightRays(ctx, t, intensity, layerCtx);
    if (config.layers.glow) renderGlow(ctx, t, intensity, layerCtx);
    if (config.layers.particles) renderParticles(ctx, t, intensity, layerCtx);
    if (config.layers.grain) renderGrain(ctx, t, intensity, layerCtx);
    if (config.layers.scanlines) renderScanlines(ctx, t, intensity, layerCtx);
    if (config.layers.vignette) renderVignette(ctx, t, intensity, layerCtx);
  };

  await new Promise<void>((resolve) => {
    let rafId = 0;
    const tick = () => {
      const elapsed = performance.now() - startTime;
      drawFrame(elapsed);
      onProgress?.(Math.min(1, elapsed / totalMs));
      if (elapsed >= totalMs) {
        cancelAnimationFrame(rafId);
        resolve();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  });

  // Final closing frame at t=0 to ensure perfect loop, then stop
  drawFrame(0);
  await new Promise((r) => setTimeout(r, 100));
  recorder.stop();

  return recordingDone;
}
