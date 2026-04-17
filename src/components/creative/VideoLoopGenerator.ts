// Browser-side video loop generator with composable layer system.
// Animates a static image and records the result as a WebM blob.

import {
  type Intensity,
  type LayerContext,
  type MotionType,
  type Particle,
  type SpotEffect,
  buildNoiseTiles,
  buildParticles,
  renderBaseImage,
  renderBloom,
  renderChromaticAberration,
  renderDatamosh,
  renderDuotone,
  renderFilmBurn,
  renderGlow,
  renderGrain,
  renderLightLeaks,
  renderLightRays,
  renderParticles,
  renderScanlines,
  renderSepia,
  renderSpot,
  renderVignette,
} from "./videoLayers";

export type { SpotEffect, SpotType } from "./videoLayers";

// Backwards-compat type (used by older callers)
export type LoopMotion = "zoom" | "pan" | "parallax";

export type VideoPreset =
  | "cinematic"
  | "dream"
  | "live"
  | "vhs"
  | "minimal"
  | "energy"
  | "noir"
  | "neon"
  | "vintage"
  | "glitch"
  | "etereo"
  | "rua";

export interface PresetConfig {
  motion: MotionType;
  layers: {
    grain?: boolean;
    lightLeaks?: boolean;
    leakColors?: [string, string];
    particles?: number;
    glow?: boolean;
    chromatic?: boolean;
    rays?: boolean;
    scanlines?: boolean;
    vignette?: boolean;
    bloom?: boolean;
    duotone?: boolean;
    duotoneColors?: [string, string];
    sepia?: boolean;
    datamosh?: boolean;
    filmBurn?: boolean;
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
  noir: {
    motion: "drift",
    layers: { grain: true, vignette: true, duotone: true, duotoneColors: ["10, 10, 18", "230, 220, 210"] },
  },
  neon: {
    motion: "pan",
    layers: { duotone: true, duotoneColors: ["20, 10, 90", "255, 60, 200"], lightLeaks: true, leakColors: ["80, 220, 255", "255, 60, 200"], chromatic: true, glow: true },
  },
  vintage: {
    motion: "breathe",
    layers: { sepia: true, grain: true, lightLeaks: true, leakColors: ["255, 180, 90", "220, 130, 60"], vignette: true },
  },
  glitch: {
    motion: "shake",
    layers: { scanlines: true, datamosh: true, chromatic: true, grain: true },
  },
  etereo: {
    motion: "float",
    layers: { bloom: true, rays: true, particles: 12, glow: true, vignette: true },
  },
  rua: {
    motion: "handheld",
    layers: { grain: true, lightLeaks: true, leakColors: ["255, 150, 80", "255, 90, 50"], vignette: true },
  },
};

export const PRESET_LABELS: Record<VideoPreset, { label: string; desc: string }> = {
  cinematic: { label: "Cinematográfico", desc: "Drift + light leaks + grão" },
  dream: { label: "Sonho", desc: "Respiração + glow + partículas" },
  live: { label: "Show ao vivo", desc: "Tremor + raios de luz" },
  vhs: { label: "Lofi / VHS", desc: "Scanlines + grão + glitch" },
  minimal: { label: "Minimal", desc: "Respiração + glow sutil" },
  energy: { label: "Festa", desc: "Pan + leaks coloridos + brilho" },
  noir: { label: "Noir", desc: "Drift + duotone P&B + grão denso" },
  neon: { label: "Neon", desc: "Duotone ciano/magenta + chromatic" },
  vintage: { label: "Vintage", desc: "Sépia + leaks âmbar + grão" },
  glitch: { label: "Glitch", desc: "Datamosh + RGB split + scanlines" },
  etereo: { label: "Etéreo", desc: "Float + bloom + raios + partículas" },
  rua: { label: "Rua", desc: "Câmera na mão + leaks quentes" },
};

interface GenerateVideoLoopParams {
  imageUrl: string;
  width: number;
  height: number;
  durationSec: 3 | 4 | 5;
  preset?: VideoPreset;
  intensity?: Intensity;
  spots?: SpotEffect[];
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
    preset, intensity = "medium", spots, motion: legacyMotion,
    fps = 30, onProgress,
  } = params;

  const config: PresetConfig = preset
    ? PRESETS[preset]
    : { motion: (legacyMotion as MotionType) ?? "zoom", layers: { vignette: true } };

  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado");

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

  const needsNoise = config.layers.grain || config.layers.scanlines;
  const noiseTiles = needsNoise ? buildNoiseTiles(128, 5) : undefined;
  const particles: Particle[] | undefined = config.layers.particles
    ? buildParticles(Math.min(15, config.layers.particles))
    : undefined;

  const layerCtx: LayerContext = {
    width, height, baseImage: img, baseDrawW, baseDrawH, noiseTiles, particles,
  };

  // Cap spots when intensity is strong to keep FPS reasonable
  const activeSpots = spots && spots.length
    ? (intensity === "strong" ? spots.slice(0, 2) : spots.slice(0, 3))
    : undefined;

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

    renderBaseImage(ctx, t, intensity, layerCtx, config.motion);
    if (config.layers.duotone) renderDuotone(ctx, t, intensity, layerCtx, config.layers.duotoneColors);
    if (config.layers.sepia) renderSepia(ctx, t, intensity, layerCtx);
    if (config.layers.chromatic) renderChromaticAberration(ctx, t, intensity, layerCtx);
    if (config.layers.bloom) renderBloom(ctx, t, intensity, layerCtx);
    if (config.layers.lightLeaks) renderLightLeaks(ctx, t, intensity, layerCtx, config.layers.leakColors);
    if (config.layers.rays) renderLightRays(ctx, t, intensity, layerCtx);
    if (config.layers.glow) renderGlow(ctx, t, intensity, layerCtx);
    if (config.layers.particles) renderParticles(ctx, t, intensity, layerCtx);
    if (config.layers.filmBurn) renderFilmBurn(ctx, t, intensity, layerCtx);
    if (config.layers.datamosh) renderDatamosh(ctx, t, intensity, layerCtx);
    if (config.layers.grain) renderGrain(ctx, t, intensity, layerCtx);
    if (config.layers.scanlines) renderScanlines(ctx, t, intensity, layerCtx);
    if (activeSpots) {
      for (const spot of activeSpots) renderSpot(ctx, t, intensity, layerCtx, spot);
    }
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

  drawFrame(0);
  await new Promise((r) => setTimeout(r, 100));
  recorder.stop();

  return recordingDone;
}
