import { useEffect, useState } from "react";

const STORAGE_KEY = "sfp_beta_banner_dismissed";
const EVENT = "beta-banner-changed";

export function dismissBetaBanner() {
  sessionStorage.setItem(STORAGE_KEY, "true");
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useBetaBannerVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      setVisible(sessionStorage.getItem(STORAGE_KEY) !== "true");
    };
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);

  return visible;
}
