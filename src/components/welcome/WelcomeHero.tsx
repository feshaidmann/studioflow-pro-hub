import { ChevronRight, Music2 } from "lucide-react";
import { GoogleIcon } from "./GoogleIcon";

type Props = {
  onGoogle: () => void;
  onSignupEmail: () => void;
  onLogin: () => void;
};

export function WelcomeHero({ onGoogle, onSignupEmail, onLogin }: Props) {
  return (
    <section
      className="welcome-fade grid grid-cols-1 gap-4 md:grid-cols-12"
      style={{ "--delay": "60ms" } as React.CSSProperties}
      aria-label="Apresentação"
    >
      {/* Card gradiente principal */}
      <div className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-orange-600 via-pink-600 to-purple-800 p-8 md:col-span-8 md:p-12">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-purple-900 shadow-xl">
            <Music2 className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </div>
          <span className="font-display text-2xl tracking-wider text-white">MusicOS.ai</span>
        </div>
        <h1 className="font-display mb-6 text-5xl leading-[0.9] text-white md:text-7xl lg:text-8xl">
          Sua música merece mais que{" "}
          <span className="text-orange-200">WhatsApp</span> e{" "}
          <span className="text-orange-200">planilha</span>
        </h1>
        <p className="max-w-xl text-lg font-light text-orange-50 md:text-xl">
          Projetos, financeiro, agenda, equipe e carreira — num só app, feito para o artista
          independente brasileiro.
        </p>
      </div>

      {/* Side block: CTAs + 2 KPIs coloridos */}
      <div className="grid grid-rows-[auto_auto] gap-4 md:col-span-4">
        <div className="flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
            Acesso imediato
          </p>
          <div className="space-y-3">
            <button
              onClick={onGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-black transition-colors hover:bg-orange-100 active:scale-[0.98]"
            >
              <GoogleIcon />
              Começar com Google
            </button>
            <button
              onClick={onSignupEmail}
              className="w-full rounded-2xl border border-white/20 bg-white/10 py-4 font-bold text-white transition-colors hover:bg-white/20 active:scale-[0.98]"
            >
              Criar conta com e-mail
            </button>
            <button
              onClick={onLogin}
              className="flex w-full items-center justify-center gap-1 pt-1 text-xs text-white/60 transition-colors hover:text-orange-300"
            >
              Já tenho conta — entrar
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <p className="text-center text-[10px] uppercase tracking-widest text-white/40">
            Gratuito · Sem cartão · Sem compromisso
          </p>
        </div>
      </div>
    </section>
  );
}
