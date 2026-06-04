import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { GoogleIcon } from "./GoogleIcon";

type Props = {
  onGoogle: () => void;
  onSignupEmail: () => void;
};

export function WelcomeFinalCTA({ onGoogle, onSignupEmail }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <>
      <section
        className="welcome-fade pt-8"
        style={{ "--delay": "360ms" } as React.CSSProperties}
        aria-label="Criar conta"
      >
        <div className="relative overflow-hidden rounded-3xl bg-white p-10 text-center md:p-16">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-400/20 via-pink-400/20 to-purple-400/20"
            aria-hidden
          />
          <div className="relative z-10 space-y-8">
            <h2 className="font-display text-5xl text-purple-950 md:text-6xl">
              Pronto para gerenciar seu próximo lançamento?
            </h2>
            <p className="mx-auto max-w-md font-medium text-purple-800/70">
              Crie sua conta agora e monte seu primeiro projeto em menos de 5 minutos.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
              <button
                onClick={onGoogle}
                className="flex items-center gap-2 rounded-2xl bg-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-purple-700 hover:shadow-purple-500/20 active:scale-[0.98]"
              >
                <GoogleIcon />
                Criar conta com Google
              </button>
              <button
                onClick={onSignupEmail}
                className="rounded-2xl bg-purple-100 px-8 py-4 font-bold text-purple-900 transition-all hover:bg-purple-200 active:scale-[0.98]"
              >
                Criar conta com e-mail
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-purple-800/40">
              Gratuito · Sem cartão de crédito
            </p>
          </div>
        </div>
      </section>

      <footer
        className="welcome-fade flex flex-col items-center gap-2 pt-8 pb-4"
        style={{ "--delay": "420ms" } as React.CSSProperties}
      >
        <p className="text-center text-[10px] uppercase tracking-widest text-white/40">
          Versão beta · Feito com artistas do mercado independente brasileiro
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/legal?tab=terms")}
            className="text-[10px] uppercase tracking-widest text-white/40 underline underline-offset-2 transition-colors hover:text-orange-300"
          >
            {t("welcome.terms")}
          </button>
          <span className="text-[10px] text-white/20">·</span>
          <button
            onClick={() => navigate("/legal?tab=privacy")}
            className="text-[10px] uppercase tracking-widest text-white/40 underline underline-offset-2 transition-colors hover:text-orange-300"
          >
            {t("welcome.privacy")}
          </button>
        </div>
      </footer>
    </>
  );
}
