/**
 * Auto-recovery para chunks obsoletos após deploy.
 *
 * Quando o usuário tem a SPA aberta e um novo build é publicado, os nomes
 * dos chunks mudam (hash). Imports dinâmicos antigos passam a falhar com
 * "Failed to fetch dynamically imported module" / ChunkLoadError, deixando
 * a tela em branco. Esse handler detecta esse erro específico e força um
 * reload único — com guarda via sessionStorage para evitar loops, e
 * cooperação com reloadGuard (que bloqueia reloads se já houver loop).
 */

const RELOAD_FLAG = "sf_chunk_reload_v1";

function isChunkLoadError(message: string): boolean {
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|error loading dynamically imported module/i.test(
    message
  );
}

function tryReloadOnce() {
  try {
    const already = sessionStorage.getItem(RELOAD_FLAG);
    if (already) {
      console.warn("[chunkErrorHandler] chunk error persiste após reload — sem nova tentativa.");
      return;
    }
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    /* sessionStorage indisponível: segue para reload mesmo assim */
  }
  // pequeno delay para o reloadGuard registrar o page-load atual primeiro
  setTimeout(() => window.location.reload(), 50);
}

export function initChunkErrorHandler() {
  if (typeof window === "undefined") return;

  // Limpa o flag após um carregamento bem-sucedido (sem erro nos primeiros 5s).
  setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch { /* noop */ }
  }, 5000);

  window.addEventListener("error", (event) => {
    const msg = event?.message ?? event?.error?.message ?? "";
    if (isChunkLoadError(String(msg))) tryReloadOnce();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg = reason instanceof Error ? `${reason.name} ${reason.message}` : String(reason ?? "");
    if (isChunkLoadError(msg)) tryReloadOnce();
  });
}
