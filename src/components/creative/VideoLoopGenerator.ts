// Browser-side video loop generator: animates a static image (Ken Burns / pan / parallax)
// and records the result as a WebM blob using MediaRecorder.

export type LoopMotion = "zoom" | "pan" | "parallax";

interface GenerateVideoLoopParams {
  imageUrl: string;        // base64 data URL or http(s) URL
  width: number;
  height: number;
  durationSec: 3 | 4 | 5;
  motion: LoopMotion;
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
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return { mime: m, ext: "webm" };
    }
  }
  return { mime: "video/webm", ext: "webm" };
}

// Loop-perfect easing — uses sine so start === end.
function loopSine(t: number) {
  // t in [0,1] → returns value in [0,1] that returns to 0 at t=1
  return (1 - Math.cos(t * Math.PI * 2)) / 2;
}

export async function generateVideoLoop(params: GenerateVideoLoopParams): Promise<Blob> {
  const { imageUrl, width, height, durationSec, motion, fps = 30, onProgress } = params;

  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado");

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

  const drawFrame = (elapsedMs: number) => {
    const t = (elapsedMs % totalMs) / totalMs; // 0..1 loop
    const eased = loopSine(t); // 0..1..0

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (motion === "zoom") {
      scale = 1 + 0.12 * eased; // up to +12% zoom, returns to 1
    } else if (motion === "pan") {
      scale = 1.08;
      offsetX = (eased - 0.5) * width * 0.06; // gentle horizontal drift
    } else {
      // parallax: combination of slight zoom + diagonal drift
      scale = 1 + 0.08 * eased;
      offsetX = (eased - 0.5) * width * 0.04;
      offsetY = (eased - 0.5) * height * 0.04;
    }

    const drawW = baseDrawW * scale;
    const drawH = baseDrawH * scale;
    const dx = (width - drawW) / 2 + offsetX;
    const dy = (height - drawH) / 2 + offsetY;

    // Subtle brightness pulse via filter
    const brightness = 0.97 + 0.06 * eased; // 0.97..1.03..0.97
    ctx.filter = `brightness(${brightness})`;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.filter = "none";

    // Vignette overlay (animated subtly for parallax feel)
    const vignetteAlpha = 0.18 + 0.08 * Math.sin(t * Math.PI * 2);
    const grd = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, `rgba(0,0,0,${vignetteAlpha.toFixed(3)})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
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

  // Force one final frame at t=0 to ensure loop closure, then stop
  drawFrame(0);
  await new Promise((r) => setTimeout(r, 100));
  recorder.stop();

  return recordingDone;
}
