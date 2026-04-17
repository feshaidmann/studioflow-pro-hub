// Composable layer functions for sophisticated video loops.
// Each layer is a pure function (ctx, t∈[0,1], intensity, ctxInfo) → void.
// All layers must close perfectly at t=1 (loop seamlessly).

export type Intensity = "subtle" | "medium" | "strong";

export interface LayerContext {
  width: number;
  height: number;
  baseImage: HTMLImageElement;
  baseDrawW: number;
  baseDrawH: number;
  noiseTiles?: HTMLCanvasElement[];
  particles?: Particle[];
}

export interface Particle {
  x: number;       // 0..1
  y: number;       // 0..1
  r: number;       // px
  speedX: number;  // per loop
  speedY: number;
  alpha: number;
  phase: number;
}

export type SpotType =
  | "sparkle"
  | "lensflare"
  | "smokePuff"
  | "emberRise"
  | "glowPulse"
  | "textShimmer";

export interface SpotEffect {
  type: SpotType;
  x: number;       // 0..1
  y: number;       // 0..1
  radius: number;  // 0..1 fraction of min(width,height)
  intensity: number; // 0..1
}

const INTENSITY_MULT: Record<Intensity, number> = {
  subtle: 0.5,
  medium: 1,
  strong: 1.7,
};

const TAU = Math.PI * 2;
function loopSine(t: number) { return (1 - Math.cos(t * TAU)) / 2; }
function smoothLoop(t: number) { return Math.sin(t * TAU); }

// ---------- Base image motion ----------
export type MotionType =
  | "zoom" | "pan" | "parallax" | "breathe" | "drift" | "reveal" | "shake"
  | "float" | "handheld";

export function renderBaseImage(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext,
  motion: MotionType
) {
  const { width, height, baseImage, baseDrawW, baseDrawH } = info;
  const m = INTENSITY_MULT[intensity];
  const eased = loopSine(t);

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let brightness = 1;

  switch (motion) {
    case "zoom":
      scale = 1 + 0.12 * m * eased;
      break;
    case "pan":
      scale = 1 + 0.08 * m;
      offsetX = (eased - 0.5) * width * 0.06 * m;
      break;
    case "parallax":
      scale = 1 + 0.08 * m * eased;
      offsetX = (eased - 0.5) * width * 0.04 * m;
      offsetY = (eased - 0.5) * height * 0.04 * m;
      break;
    case "breathe":
      scale = 1 + 0.025 * m * eased;
      brightness = 0.98 + 0.04 * m * eased;
      break;
    case "drift": {
      scale = 1 + 0.06 * m;
      offsetX = Math.sin(t * TAU) * width * 0.025 * m;
      offsetY = Math.sin(t * TAU * 2) * height * 0.018 * m;
      break;
    }
    case "reveal": {
      const e = loopSine(t);
      scale = 1.18 - 0.18 * e * m;
      break;
    }
    case "shake": {
      scale = 1 + 0.05 * m;
      const shakeAmt = 4 * m;
      offsetX = (Math.sin(t * TAU * 7) + Math.sin(t * TAU * 11) * 0.5) * shakeAmt;
      offsetY = (Math.cos(t * TAU * 9) + Math.sin(t * TAU * 13) * 0.5) * shakeAmt;
      break;
    }
    case "float": {
      // Slow upward drift + breathe (loop-perfect: vertical position oscillates)
      scale = 1 + 0.04 * m + 0.02 * m * eased;
      offsetY = -Math.sin(t * TAU) * height * 0.02 * m;
      brightness = 0.99 + 0.03 * m * eased;
      break;
    }
    case "handheld": {
      // Naturalistic handheld camera — combines low and mid frequencies
      scale = 1 + 0.04 * m;
      const a = 3 * m;
      offsetX = (Math.sin(t * TAU * 2) * 1.2 + Math.sin(t * TAU * 5) * 0.5 + Math.sin(t * TAU * 11) * 0.25) * a;
      offsetY = (Math.cos(t * TAU * 3) * 1.0 + Math.cos(t * TAU * 7) * 0.4) * a;
      break;
    }
  }

  const drawW = baseDrawW * scale;
  const drawH = baseDrawH * scale;
  const dx = (width - drawW) / 2 + offsetX;
  const dy = (height - drawH) / 2 + offsetY;

  ctx.save();
  if (brightness !== 1) ctx.filter = `brightness(${brightness.toFixed(3)})`;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(baseImage, dx, dy, drawW, drawH);
  ctx.restore();
}

// ---------- Grain ----------
export function buildNoiseTiles(size = 128, count = 5): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  for (let i = 0; i < count; i++) {
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const cx = c.getContext("2d");
    if (!cx) continue;
    const img = cx.createImageData(size, size);
    for (let p = 0; p < img.data.length; p += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[p] = v; img.data[p + 1] = v; img.data[p + 2] = v; img.data[p + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}

export function renderGrain(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  if (!info.noiseTiles?.length) return;
  const m = INTENSITY_MULT[intensity];
  const idx = Math.floor(t * info.noiseTiles.length * 6) % info.noiseTiles.length;
  const tile = info.noiseTiles[idx];
  ctx.save();
  ctx.globalAlpha = 0.06 * m;
  ctx.globalCompositeOperation = "overlay";
  const tw = tile.width;
  const th = tile.height;
  for (let y = 0; y < info.height; y += th) {
    for (let x = 0; x < info.width; x += tw) {
      ctx.drawImage(tile, x, y);
    }
  }
  ctx.restore();
}

// ---------- Light leaks ----------
export function renderLightLeaks(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext,
  colors: [string, string] = ["255, 180, 120", "255, 90, 140"]
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  const phase = t * TAU;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 2; i++) {
    const px = (0.2 + 0.6 * (i === 0 ? (0.5 + 0.4 * Math.sin(phase)) : (0.5 - 0.4 * Math.sin(phase)))) * width;
    const py = (0.2 + 0.6 * (i === 0 ? (0.5 + 0.4 * Math.cos(phase)) : (0.5 - 0.4 * Math.cos(phase)))) * height;
    const r = Math.max(width, height) * 0.55;
    const grd = ctx.createRadialGradient(px, py, 0, px, py, r);
    const baseAlpha = 0.18 * m * (0.7 + 0.3 * Math.sin(phase + i));
    grd.addColorStop(0, `rgba(${colors[i]}, ${baseAlpha.toFixed(3)})`);
    grd.addColorStop(1, `rgba(${colors[i]}, 0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

// ---------- Particles / dust ----------
export function buildParticles(count = 12): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.6,
      speedX: (Math.random() - 0.5) * 0.06,
      speedY: -0.04 - Math.random() * 0.08,
      alpha: 0.25 + Math.random() * 0.45,
      phase: Math.random() * TAU,
    });
  }
  return arr;
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  if (!info.particles?.length) return;
  const m = INTENSITY_MULT[intensity];
  const { width, height } = info;
  ctx.save();
  ctx.fillStyle = "#fff";
  for (const p of info.particles) {
    const x = ((p.x + p.speedX * t + 1) % 1) * width;
    const y = ((p.y + p.speedY * t + 1) % 1) * height;
    const twinkle = 0.6 + 0.4 * Math.sin(t * TAU + p.phase);
    ctx.globalAlpha = p.alpha * m * twinkle;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Glow pulse ----------
export function renderGlow(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext,
  color = "255, 240, 220"
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  const pulse = 0.5 + 0.5 * loopSine(t);
  const alpha = 0.14 * m * pulse;
  const cx = width / 2;
  const cy = height * 0.45;
  const r = Math.max(width, height) * (0.45 + 0.08 * pulse);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0, `rgba(${color}, ${alpha.toFixed(3)})`);
  grd.addColorStop(1, `rgba(${color}, 0)`);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------- Chromatic aberration (cheap) ----------
export function renderChromaticAberration(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height, baseImage, baseDrawW, baseDrawH } = info;
  const m = INTENSITY_MULT[intensity];
  const off = (1.5 + 1.5 * Math.sin(t * TAU)) * m;
  if (off < 0.2) return;

  const dx0 = (width - baseDrawW) / 2;
  const dy0 = (height - baseDrawH) / 2;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.18 * m;
  ctx.filter = "brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(6)";
  ctx.drawImage(baseImage, dx0 + off, dy0, baseDrawW, baseDrawH);
  ctx.filter = "brightness(0.6) sepia(1) hue-rotate(180deg) saturate(6)";
  ctx.drawImage(baseImage, dx0 - off, dy0, baseDrawW, baseDrawH);
  ctx.restore();
}

// ---------- Light rays / god rays ----------
export function renderLightRays(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  const sweep = (t + 0.15 * Math.sin(t * TAU)) % 1;
  const cx = width * (0.2 + 0.6 * sweep);
  const cy = -height * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i - 2.5) * 0.06;
    const len = Math.max(width, height) * 1.4;
    const x2 = cx + Math.cos(angle) * len;
    const y2 = cy + Math.sin(angle) * len;
    const grd = ctx.createLinearGradient(cx, cy, x2, y2);
    const a = 0.05 * m * (0.6 + 0.4 * Math.sin(t * TAU + i));
    grd.addColorStop(0, `rgba(255,250,230,${a.toFixed(3)})`);
    grd.addColorStop(1, "rgba(255,250,230,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle - 0.02) * len, cy + Math.sin(angle - 0.02) * len);
    ctx.lineTo(cx + Math.cos(angle + 0.02) * len, cy + Math.sin(angle + 0.02) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Scanlines / VHS ----------
export function renderScanlines(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.18 * m;
  ctx.fillStyle = "#000";
  const lineH = 2;
  const offset = Math.floor(smoothLoop(t) * 4);
  for (let y = offset; y < height; y += lineH * 2) {
    ctx.fillRect(0, y, width, lineH);
  }
  const bandY = ((t * height * 1.2) % (height + 80)) - 40;
  const grd = ctx.createLinearGradient(0, bandY, 0, bandY + 60);
  grd.addColorStop(0, "rgba(255,255,255,0)");
  grd.addColorStop(0.5, `rgba(255,255,255,${(0.06 * m).toFixed(3)})`);
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 1;
  ctx.fillStyle = grd;
  ctx.fillRect(0, bandY, width, 60);
  ctx.restore();
}

// ---------- Vignette ----------
export function renderVignette(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  const breathe = 0.18 + 0.06 * Math.sin(t * TAU);
  const alpha = breathe * m;
  const grd = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.75
  );
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, `rgba(0,0,0,${alpha.toFixed(3)})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
}

// ---------- Bloom (soft highlight) ----------
export function renderBloom(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height, baseImage, baseDrawW, baseDrawH } = info;
  const m = INTENSITY_MULT[intensity];
  const pulse = 0.7 + 0.3 * loopSine(t);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.35 * m * pulse;
  ctx.filter = `blur(${(18 * m).toFixed(1)}px) brightness(1.4)`;
  const dx = (width - baseDrawW) / 2;
  const dy = (height - baseDrawH) / 2;
  ctx.drawImage(baseImage, dx, dy, baseDrawW, baseDrawH);
  ctx.restore();
}

// ---------- Duotone (luminance → 2 colors) ----------
export function renderDuotone(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext,
  colors: [string, string] = ["20, 30, 80", "255, 80, 200"]
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  const pulse = 0.45 + 0.15 * loopSine(t);
  const alpha = pulse * m;
  ctx.save();
  // Shadow tone
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = Math.min(0.85, 0.55 * alpha + 0.3);
  ctx.fillStyle = `rgb(${colors[0]})`;
  ctx.fillRect(0, 0, width, height);
  // Highlight tone
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = Math.min(0.7, 0.45 * alpha + 0.25);
  ctx.fillStyle = `rgb(${colors[1]})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------- Sepia ----------
export function renderSepia(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  const breath = 0.85 + 0.1 * loopSine(t);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = Math.min(0.65, 0.45 * m * breath);
  ctx.fillStyle = "rgb(245, 215, 160)";
  ctx.fillRect(0, 0, width, height);
  // Warm overlay
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.18 * m;
  ctx.fillStyle = "rgb(180, 110, 50)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------- Datamosh (block displacement, intermittent) ----------
export function renderDatamosh(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  // Trigger 3 bursts per loop
  const phase = (t * 3) % 1;
  if (phase > 0.18) return;
  const burstStrength = (1 - phase / 0.18);
  const blocks = 6 + Math.floor(8 * m);
  const blockH = height / blocks;
  // Seed by which burst we're in for stable look during the burst
  const seed = Math.floor(t * 3);
  const rand = (i: number) => {
    const x = Math.sin((seed * 91.3 + i * 17.7)) * 43758.5453;
    return x - Math.floor(x);
  };
  ctx.save();
  for (let i = 0; i < blocks; i++) {
    if (rand(i) > 0.55) continue;
    const sy = i * blockH;
    const dx = (rand(i + 100) - 0.5) * width * 0.12 * m * burstStrength;
    try {
      const slice = ctx.getImageData(0, sy, width, Math.ceil(blockH));
      ctx.putImageData(slice, dx, sy);
    } catch {
      // ignore (e.g. tainted canvas)
    }
  }
  ctx.restore();
}

// ---------- Film burn (intermittent flash) ----------
export function renderFilmBurn(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity];
  // 2 burns per loop
  const phase = (t * 2) % 1;
  const window = 0.08;
  if (phase > window) return;
  const k = 1 - phase / window;
  const seed = Math.floor(t * 2);
  const px = (0.2 + 0.6 * ((Math.sin(seed * 13.1) + 1) / 2)) * width;
  const py = (0.2 + 0.6 * ((Math.cos(seed * 7.7) + 1) / 2)) * height;
  const r = Math.max(width, height) * (0.35 + 0.25 * k) * (0.8 + 0.4 * m);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const grd = ctx.createRadialGradient(px, py, 0, px, py, r);
  const a = 0.55 * m * k;
  grd.addColorStop(0, `rgba(255, 230, 180, ${a.toFixed(3)})`);
  grd.addColorStop(0.5, `rgba(255, 140, 60, ${(a * 0.6).toFixed(3)})`);
  grd.addColorStop(1, "rgba(120, 30, 0, 0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------- Spot effects (localized accents) ----------
export function renderSpot(
  ctx: CanvasRenderingContext2D,
  t: number,
  intensity: Intensity,
  info: LayerContext,
  spot: SpotEffect
) {
  const { width, height } = info;
  const m = INTENSITY_MULT[intensity] * (spot.intensity ?? 1);
  const cx = spot.x * width;
  const cy = spot.y * height;
  const baseR = Math.min(width, height) * Math.max(0.05, spot.radius);

  switch (spot.type) {
    case "sparkle": {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "#fff";
      const N = 14;
      for (let i = 0; i < N; i++) {
        const phase = (i / N) * TAU;
        const orbit = baseR * (0.4 + 0.6 * ((i * 37) % 100) / 100);
        const speed = 1 + ((i * 13) % 5) / 5;
        const a = phase + t * TAU * speed;
        const x = cx + Math.cos(a) * orbit;
        const y = cy + Math.sin(a) * orbit * 0.85;
        const tw = 0.5 + 0.5 * Math.sin(t * TAU * 2 + phase * 3);
        ctx.globalAlpha = 0.85 * m * tw;
        const r = 1.2 + 1.8 * tw;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "lensflare": {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const pulse = 0.6 + 0.4 * loopSine(t);
      // Core
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.4);
      grd.addColorStop(0, `rgba(255,255,240,${(0.85 * m * pulse).toFixed(3)})`);
      grd.addColorStop(0.4, `rgba(255,200,140,${(0.35 * m * pulse).toFixed(3)})`);
      grd.addColorStop(1, "rgba(255,180,80,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(cx - baseR * 1.6, cy - baseR * 1.6, baseR * 3.2, baseR * 3.2);
      // Streak
      ctx.globalAlpha = 0.5 * m * pulse;
      const streakW = baseR * 4;
      const streakGrd = ctx.createLinearGradient(cx - streakW, cy, cx + streakW, cy);
      streakGrd.addColorStop(0, "rgba(255,220,180,0)");
      streakGrd.addColorStop(0.5, "rgba(255,240,210,0.9)");
      streakGrd.addColorStop(1, "rgba(255,220,180,0)");
      ctx.fillStyle = streakGrd;
      ctx.fillRect(cx - streakW, cy - 1.5, streakW * 2, 3);
      ctx.restore();
      break;
    }
    case "smokePuff": {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const N = 5;
      for (let i = 0; i < N; i++) {
        const tt = (t + i / N) % 1;
        const rise = tt;
        const x = cx + Math.sin(tt * TAU + i) * baseR * 0.4;
        const y = cy - rise * baseR * 2.2;
        const r = baseR * (0.5 + rise * 1.4);
        const a = (1 - rise) * 0.25 * m;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, `rgba(220,220,225,${a.toFixed(3)})`);
        grd.addColorStop(1, "rgba(220,220,225,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.restore();
      break;
    }
    case "emberRise": {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const N = 18;
      for (let i = 0; i < N; i++) {
        const tt = (t + i / N) % 1;
        const wob = Math.sin(tt * TAU * 2 + i) * baseR * 0.3;
        const x = cx + wob + ((i * 53) % 100 - 50) / 50 * baseR * 0.5;
        const y = cy - tt * baseR * 2.5;
        const a = (1 - tt) * 0.85 * m;
        const r = 1 + (1 - tt) * 2.5;
        ctx.fillStyle = `rgba(255, ${140 + Math.floor(80 * (1 - tt))}, 40, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "glowPulse": {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const pulse = 0.5 + 0.5 * loopSine(t);
      const r = baseR * (1 + 0.25 * pulse);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = 0.5 * m * pulse;
      grd.addColorStop(0, `rgba(255,240,220,${a.toFixed(3)})`);
      grd.addColorStop(1, "rgba(255,240,220,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      break;
    }
    case "textShimmer": {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const bandH = baseR * 0.9;
      const bandW = width * 0.9;
      const bandX = cx - bandW / 2;
      const bandY = cy - bandH / 2;
      const sweep = (t * 1.2) % 1;
      const sx = bandX + sweep * bandW - bandW * 0.25;
      const grd = ctx.createLinearGradient(sx, 0, sx + bandW * 0.5, 0);
      grd.addColorStop(0, "rgba(255,255,255,0)");
      grd.addColorStop(0.5, `rgba(255,255,255,${(0.55 * m).toFixed(3)})`);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(bandX, bandY, bandW, bandH);
      ctx.restore();
      break;
    }
  }
}
