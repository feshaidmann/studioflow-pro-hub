import { Button } from "@/components/ui/button";
import { ChevronRight, Music2 } from "lucide-react";
import { GoogleIcon } from "./GoogleIcon";
import logoMusicosAi from "@/assets/logo-musicos-ai.svg";

type Props = {
  onGoogle: () => void;
  onSignupEmail: () => void;
  onLogin: () => void;
};

export function WelcomeHero({ onGoogle, onSignupEmail, onLogin }: Props) {
  return (
    <>
      <section className="welcome-fade w-full text-center" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <img
          src={logoMusicosAi}
          alt="MusicOS.ai"
          className="mx-auto mb-5 h-16 w-16 md:h-20 md:w-20"
        />
        <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-foreground md:text-5xl">
          Sua música merece mais que{" "}
          <span className="text-primary">WhatsApp e planilha</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base max-w-md mx-auto">
          Projetos, financeiro, agenda, equipe e carreira — num só app, feito para o artista independente brasileiro.
        </p>
      </section>


      <div
        className="welcome-fade mt-7 flex w-full max-w-sm flex-col gap-2.5"
        style={{ "--delay": "120ms" } as React.CSSProperties}
      >
        <Button
          size="lg"
          onClick={onGoogle}
          className="w-full gap-2 h-12 text-sm font-semibold active:scale-95 transition-transform"
        >
          <GoogleIcon />
          Começar com Google — grátis
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={onSignupEmail}
          className="w-full gap-2 h-12 text-sm border-border/60 hover:border-primary/40 active:scale-95 transition-transform"
        >
          <Music2 className="h-4 w-4" />
          Criar conta com e-mail
        </Button>

        <button
          onClick={onLogin}
          className="mt-0.5 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          Já tenho conta — entrar
          <ChevronRight className="h-3 w-3" />
        </button>

        <p className="text-center text-[10px] text-muted-foreground/60 mt-1">
          Gratuito · Sem cartão de crédito · Sem compromisso
        </p>
      </div>
    </>
  );
}
