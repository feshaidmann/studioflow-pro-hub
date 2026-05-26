/**
 * Reload-loop circuit breaker.
 *
 * Detecta sequências anormais de page-loads no mesmo tab (HMR travado,
 * redirect loop, erro de estado que dispara reload contínuo) e:
 *   1. Bloqueia novas chamadas a window.location.reload().
 *   2. Desliga o cliente HMR do Vite (evita novos reloads automáticos).
 *   3. Renderiza um overlay com botão "Recarregar manualmente" para o
 *      usuário sair do estado travado sob controle.
 *
 * Frontend-only, sem dependência de backend. Carregado uma única vez
 * a partir de main.tsx, antes do React montar.
 */

const STORAGE_KEY = "sf_reload_guard_v2";
const WINDOW_MS = 10_000;       // janela deslizante
const MAX_LOADS = 10;           // mais que isso em 10s = loop (tolerante a HMR)
const COOLDOWN_MS = 15_000;     // tempo que o breaker fica ativo


type State = { ts: number[]; trippedAt?: number };

function readState(): State {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ts: [] };
    const parsed = JSON.parse(raw) as State;
    return {
      ts: Array.isArray(parsed.ts) ? parsed.ts : [],
      trippedAt: typeof parsed.trippedAt === "number" ? parsed.trippedAt : undefined,
    };
  } catch {
    return { ts: [] };
  }
}

function writeState(s: State) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* sessionStorage indisponível: ignorar */
  }
}

function showOverlay(reason: string) {
  if (document.getElementById("sf-reload-guard-overlay")) return;
  const el = document.createElement("div");
  el.id = "sf-reload-guard-overlay";
  el.setAttribute("role", "alertdialog");
  el.setAttribute("aria-live", "assertive");
  el.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "background:rgba(15,23,42,0.55)",
    "backdrop-filter:blur(6px)",
    "-webkit-backdrop-filter:blur(6px)",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  ].join(";");
  el.innerHTML = `
    <div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="font-size:13px;font-weight:600;color:#dc2626;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;">Loop de recarregamento</div>
      <h2 style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#0f172a;">A preview estava reiniciando em loop</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.5;color:#475569;">
        Pausei os reloads automáticos para você poder trabalhar.
        Motivo detectado: <strong>${reason}</strong>.
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="sf-reload-guard-continue" style="flex:1;min-width:140px;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;font-size:14px;font-weight:500;cursor:pointer;">
          Continuar mesmo assim
        </button>
        <button id="sf-reload-guard-reload" style="flex:1;min-width:140px;padding:10px 14px;border-radius:10px;border:0;background:#0f172a;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">
          Recarregar uma vez
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById("sf-reload-guard-continue")?.addEventListener("click", () => {
    el.remove();
  });
  document.getElementById("sf-reload-guard-reload")?.addEventListener("click", () => {
    // Limpa o estado antes de recarregar manualmente.
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
    // Usa o reload nativo (a substituição ainda não está aplicada aqui).
    nativeReload.call(window.location);
  });
}

const nativeReload = window.location.reload.bind(window.location);

function tripBreaker(reason: string, opts: { persist?: boolean } = { persist: true }) {
  if (opts.persist !== false) {
    const state = readState();
    state.trippedAt = Date.now();
    writeState(state);
  }


  // 1. Bloqueia reload programático.
  try {
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      value: () => {
        // Apenas loga; usuário pode recarregar via overlay/F5.
        console.warn("[reloadGuard] window.location.reload() bloqueado (loop ativo).");
      },
    });
  } catch {
    /* alguns navegadores não permitem override; segue o jogo */
  }

  // 2. Desliga o cliente HMR do Vite (silenciosamente).
  try {
    const hot = (import.meta as unknown as { hot?: { decline?: () => void } }).hot;
    hot?.decline?.();
  } catch { /* noop */ }

  // 3. Mostra overlay quando o DOM estiver pronto.
  if (document.body) {
    showOverlay(reason);
  } else {
    document.addEventListener("DOMContentLoaded", () => showOverlay(reason), { once: true });
  }
}

export function initReloadGuard() {
  // Evita rodar fora do browser ou em iframes que possam quebrar o sessionStorage.
  if (typeof window === "undefined") return;

  const now = Date.now();
  const state = readState();

  // Se o breaker já está ativo dentro da janela de cooldown, mantém travado.
  if (state.trippedAt && now - state.trippedAt < COOLDOWN_MS) {
    // Não reescreve trippedAt — caso contrário o cooldown se estende a cada reload.
    tripBreaker("cooldown ativo após detecção anterior", { persist: false });
    return;
  }


  // Janela deslizante de timestamps de page-load.
  const recent = state.ts.filter((t) => now - t < WINDOW_MS);
  recent.push(now);

  if (recent.length > MAX_LOADS) {
    writeState({ ts: recent.slice(-MAX_LOADS), trippedAt: now });
    tripBreaker(`${recent.length} reloads em ${Math.round(WINDOW_MS / 1000)}s`);
    return;
  }

  writeState({ ts: recent, trippedAt: undefined });
}
