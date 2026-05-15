import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { GoogleIcon } from "./GoogleIcon";

type Props = { onGoogle: () => void };

export function WelcomeFinalCTA({ onGoogle }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <>
      <section
        className="welcome-fade mt-10 w-full max-w-sm"
        style={{ "--delay": "360ms" } as React.CSSProperties}
      >
        <div className="rounded-[var(--radius)] border border-primary/20 bg-primary/5 p-6 flex flex-col items-center gap-4 text-center">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Pronto para gerenciar seu próximo lançamento?
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Crie sua conta agora e monte seu primeiro projeto em menos de 5 minutos.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <Button
              size="lg"
              onClick={onGoogle}
              className="w-full gap-2 h-12 text-sm font-semibold active:scale-95 transition-transform"
            >
              <GoogleIcon />
              Criar conta com Google
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth?mode=signup")}
              className="w-full gap-1.5 h-12 text-sm border-border/60 hover:border-primary/40"
            >
              <ArrowRight className="h-4 w-4" />
              Criar conta com e-mail
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60">
            Gratuito · Sem cartão de crédito
          </p>
        </div>
      </section>

      <footer
        className="welcome-fade mt-10 flex flex-col items-center gap-2"
        style={{ "--delay": "420ms" } as React.CSSProperties}
      >
        <p className="text-center text-[10px] text-muted-foreground/60">
          Versão beta · Feito com artistas do mercado independente brasileiro
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/legal?tab=terms")}
            className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors underline underline-offset-2"
          >
            {t("welcome.terms")}
          </button>
          <span className="text-muted-foreground/30 text-[10px]">·</span>
          <button
            onClick={() => navigate("/legal?tab=privacy")}
            className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors underline underline-offset-2"
          >
            {t("welcome.privacy")}
          </button>
        </div>
      </footer>
    </>
  );
}
