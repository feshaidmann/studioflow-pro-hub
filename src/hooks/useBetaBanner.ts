import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "sfp_beta_banner_dismissed";
const EVENT = "beta-banner-changed";

const hasWindow = () => typeof window !== "undefined";

function safeGetDismissed(): boolean {
  if (!hasWindow()) return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function safeSetDismissed() {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // sessionStorage indisponível (modo privado, SSR, sandbox de testes) — segue silencioso
  }
}

export function dismissBetaBanner() {
  if (!hasWindow()) return;
  try {
    trackEvent("beta_banner_dismissed", { path: window.location.pathname });
  } catch {
    // analytics nunca deve quebrar a UX
  }
  safeSetDismissed();
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ambientes sem CustomEvent são tratados como no-op
  }
}

export function useBetaBannerVisible() {
  const [visible, setVisible] = useState(() => !safeGetDismissed());

  useEffect(() => {
    if (!hasWindow()) return;
    const update = () => setVisible(!safeGetDismissed());
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);

  return visible;
}
