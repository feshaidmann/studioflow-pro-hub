import { Sparkles, X } from "lucide-react";
import { useBetaBannerVisible, dismissBetaBanner } from "@/hooks/useBetaBanner";

export default function BetaBanner() {
  const visible = useBetaBannerVisible();
  if (!visible) return null;

  const handleOpenFeedback = () => {
    window.dispatchEvent(new CustomEvent("open-feedback"));
  };

  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] flex items-center gap-2 border-b border-border/60 bg-card/85 backdrop-blur-xl px-3 h-7"
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
        onClick={dismissBetaBanner}
        className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
        aria-label="Fechar aviso de beta"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
