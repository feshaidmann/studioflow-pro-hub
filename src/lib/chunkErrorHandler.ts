/**
 * Detecta chunks obsoletos após deploy SEM recarregar a página automaticamente.
 *
 * Recarregar sozinho criava loops quando:
 *   - a preview da Lovable reimplanta enquanto o usuário está na tela
 *   - um chunk falha de forma transitória (rede instável, throttle)
 *
 * Política nova:
 *   - Nunca chamar window.location.reload() de forma autônoma.
 *   - Apenas logar o erro e mostrar um banner discreto, persistente,
 *     com um botão "Recarregar" que o usuário aciona quando quiser.
 *   - O banner aparece no máximo uma vez por sessão de browser.
 */

const SHOWN_FLAG = "sf_chunk_banner_v1";

function isChunkLoadError(message: string): boolean {
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|error loading dynamically imported module/i.test(
    message
  );
}

function showUpdateBanner() {
  if (typeof document === "undefined") return;
  try {
    if (sessionStorage.getItem(SHOWN_FLAG)) return;
    sessionStorage.setItem(SHOWN_FLAG, "1");
  } catch {
    /* sessionStorage indisponível: segue */
  }
  if (document.getElementById("sf-chunk-update-banner")) return;

  const mount = () => {
    if (document.getElementById("sf-chunk-update-banner")) return;
    const el = document.createElement("div");
    el.id = "sf-chunk-update-banner";
    el.setAttribute("role", "status");
    el.style.cssText = [
      "position:fixed",
      "bottom:16px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:2147483646",
      "background:#0f172a",
      "color:#fff",
      "padding:10px 14px",
      "border-radius:12px",
      "box-shadow:0 12px 32px rgba(0,0,0,.25)",
      "font:500 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "display:flex",
      "gap:10px",
      "align-items:center",
      "max-width:90vw",
    ].join(";");
    el.innerHTML = `
      <span>Nova versão disponível.</span>
      <button id="sf-chunk-reload-btn" style="background:#fff;color:#0f172a;border:0;border-radius:8px;padding:6px 10px;font:600 12px/1 -apple-system,sans-serif;cursor:pointer;">Recarregar</button>
      <button id="sf-chunk-dismiss-btn" aria-label="Fechar" style="background:transparent;color:#cbd5e1;border:0;font-size:16px;cursor:pointer;padding:0 4px;">×</button>
    `;
    document.body.appendChild(el);
    document.getElementById("sf-chunk-reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
    document.getElementById("sf-chunk-dismiss-btn")?.addEventListener("click", () => {
      el.remove();
    });
  };

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}

export function initChunkErrorHandler() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    const msg = event?.message ?? event?.error?.message ?? "";
    if (isChunkLoadError(String(msg))) {
      console.warn("[chunkErrorHandler] chunk obsoleto detectado:", msg);
      showUpdateBanner();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg = reason instanceof Error ? `${reason.name} ${reason.message}` : String(reason ?? "");
    if (isChunkLoadError(msg)) {
      console.warn("[chunkErrorHandler] chunk obsoleto detectado (promise):", msg);
      showUpdateBanner();
    }
  });
}
