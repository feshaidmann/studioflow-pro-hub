import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sfp_beta_banner_dismissed";

export default function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(STORAGE_KEY) === "true";
    setVisible(!dismissed);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const handleOpenFeedback = () => {
    window.dispatchEvent(new CustomEvent("open-feedback"));
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-[60] flex items-center gap-2 border-b border-border/60 bg-card/80 backdrop-blur-xl px-3 py-1.5",
      )}
      role="status"
    >
      <Sparkles className="h-3 w-3 text-primary shrink-0" />
      <p className="flex-1 text-[11px] text-muted-foreground leading-tight truncate">
        <span className="font-medium text-foreground">StudioFlow está em fase beta</span>
        <span className="hidden sm:inline"> — sua experiência pode ter pequenos ajustes. Seu feedback é muito bem-vindo!</span>
      </p>
      <button
        onClick={handleOpenFeedback}
        className="text-[11px] font-medium text-primary hover:underline shrink-0"
      >
        Enviar feedback
      </button>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
        aria-label="Fechar aviso de beta"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
