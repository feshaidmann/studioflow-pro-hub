import { useNavigate, Navigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import {
  ArrowRight, CheckCircle2, Sparkles, Music2,
  FolderKanban, DollarSign, Clock, FileText,
  Mic2, Palette, Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Mock de projeto real — ancora o produto em contexto concreto ──────────
const MOCK_PROJECT = {
  name: "Noite Clara",
  artist: "Maria Silva",
  stage: "Pré-lançamento",
  releaseDate: "15 jun",
  budget: { spent: 4200, total: 8000 },
  tasks: [
    { label: "Master finalizado", done: true },
    { label: "Capa entregue", done: true },
    { label: "Distribuição enviada", done: true },
    { label: "Press release", done: false, urgent: false },
    { label: "Publicidade paga", done: false, urgent: false },
    { label: "Vídeo clipe", done: false, urgent: true },
    { label: "Notas fiscais equipe", done: false, urgent: true },
  ],
};

// ── Dores específicas do mercado BR ─────────────────────────────────────
const PAIN_POINTS = [
  {
    pain: "Prazo de entrega perdido porque a nota fiscal do estúdio ficou no WhatsApp",
    solve: "Prazos, equipe e pagamentos num só lugar. Com alertas automáticos.",
    icon: Clock,
  },
  {
    pain: "Sem saber quanto já gastou no álbum — planilha desatualizada faz 3 semanas",
    solve: "Financeiro por projeto e por faixa. Atualiza em tempo real.",
    icon: DollarSign,
  },
  {
    pain: "Perdeu o edital do ProAC porque não sabia que estava aberto",
    solve: "IA encontra e monitora editais de fomento abertos para você.",
    icon: FileText,
  },
  {
    pain: "Capa do single feita em Canva de graça — não combina com a música",
    solve: "Arte gerada com IA a partir do DNA sonoro da faixa.",
    icon: Palette,
  },
];

// ── Módulos com descrição posicionada para o artista ─────────────────────
const MODULES = [
  {
    icon: FolderKanban,
    color: "text-primary",
    bg: "bg-primary/10",
    name: "Projetos",
    desc: "Do rascunho ao streaming — checklist completo de lançamento.",
  },
  {
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    name: "Financeiro",
    desc: "Quanto custou, o que falta pagar, quanto entrou de cachê.",
  },
  {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    name: "Agenda",
    desc: "Gravações, reuniões, shows e entregas num calendário só.",
  },
  {
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    name: "Equipe",
    desc: "Produtor, mixador, fotógrafo — cada um sabe o que entregar.",
  },
  {
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
    name: "Editais",
    desc: "ProAC, Funarte, SESC — IA encontra oportunidades abertas.",
  },
  {
    icon: Mic2,
    color: "text-rose-600",
    bg: "bg-rose-500/10",
    name: "Palcos",
    desc: "Festivais e showcases compatíveis com seu perfil e gênero.",
  },
  {
    icon: Palette,
    color: "text-sky-600",
    bg: "bg-sky-500/10",
    name: "Criativo",
    desc: "Capa, post e legenda gerados com IA a partir do DNA da faixa.",
  },
  {
    icon: Sparkles,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
    name: "DNA Musical",
    desc: "Diagnóstico técnico de mix e master em segundos.",
  },
];

// ── Credenciais de credibilidade ─────────────────────────────────────────
const CREDENTIALS = [
  { label: "Desenvolvido com", sub: "artistas do mercado fonográfico BR" },
];

export default function Welcome() {
  const { user, loading } = useAuth();
  const { needsProfileSetup } = useProfile();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground text-sm">
          {t("misc.loading")}
        </div>
      </div>
    );
  }
  if (user && needsProfileSetup) return <Navigate to="/onboarding" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Erro ao entrar com Google. Tente novamente.");
  };

  const spentPct = Math.round((MOCK_PROJECT.budget.spent / MOCK_PROJECT.budget.total) * 100);
  const doneTasks = MOCK_PROJECT.tasks.filter((t) => t.done).length;
  const totalTasks = MOCK_PROJECT.tasks.length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">

      {/* ── Fundo com textura sutil ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, hsl(263 60% 40%) 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-5 pb-20 pt-12 md:px-8 md:pt-16">

        {/* ── Badge INCAMP / credibilidade ── */}
        <div
          className="mb-6 flex animate-fade-in items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[11px] font-medium text-primary"
          style={{ animationDelay: "0ms" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Feito para o artista independente brasileiro
        </div>

        {/* ══════════════════════════════════════════════════════════════
            HERO — dor nomeada antes do produto
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="w-full text-center animate-fade-in"
          style={{ animationDelay: "60ms" }}
        >
          <h1 className="text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-foreground md:text-5xl">
            Sua música merece mais do que
            <br />
            <span className="text-primary">WhatsApp e planilha</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base max-w-lg mx-auto">
            StudioFlow reúne gestão de projetos, financeiro, equipe, editais de
            fomento e criação com IA — tudo pensado para o artista independente
            brasileiro que lança sozinho.
          </p>
        </section>

        {/* ── CTA principal — alta no fluxo ── */}
        <div
          className="mt-7 flex w-full max-w-sm flex-col gap-2.5 animate-fade-in"
          style={{ animationDelay: "120ms" }}
        >
          <Button
            size="lg"
            onClick={handleGoogleSignIn}
            className="w-full gap-2 text-sm font-semibold active:scale-95 transition-transform"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Começar com Google — grátis
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth?mode=signup")}
            className="w-full gap-2 text-sm border-border/60 hover:border-primary/40 active:scale-95 transition-transform"
          >
            <Music2 className="h-4 w-4" />
            Criar conta com e-mail
          </Button>

          <button
            onClick={() => navigate("/auth")}
            className="mt-0.5 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            Já tenho conta — entrar
            <ChevronRight className="h-3 w-3" />
          </button>

          <p className="text-center text-[10px] text-muted-foreground/60 mt-1">
            Gratuito · Sem cartão de crédito · Sem compromisso
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            PRODUTO EM USO — mock de projeto real
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="mt-12 w-full animate-fade-in"
          style={{ animationDelay: "180ms" }}
        >
          <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Veja como fica na prática
          </p>

          <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-xl shadow-sm overflow-hidden">
            {/* Header do projeto */}
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{MOCK_PROJECT.name}</p>
                  <p className="text-[11px] text-muted-foreground">{MOCK_PROJECT.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  {MOCK_PROJECT.stage}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Lança {MOCK_PROJECT.releaseDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
              {/* Orçamento */}
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Orçamento
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-semibold tabular-nums">
                      R$ {MOCK_PROJECT.budget.spent.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      de R$ {MOCK_PROJECT.budget.total.toLocaleString("pt-BR")} orçados
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-600">{spentPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${spentPct}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Checklist de lançamento
                  </p>
                  <span className="text-xs font-medium text-primary">
                    {doneTasks}/{totalTasks}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {MOCK_PROJECT.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                        task.done
                          ? "bg-emerald-500/20"
                          : task.urgent
                          ? "bg-amber-500/20"
                          : "bg-secondary"
                      }`}>
                        {task.done && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        )}
                        {!task.done && task.urgent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <span className={`text-[11px] leading-tight ${
                        task.done
                          ? "line-through text-muted-foreground/50"
                          : task.urgent
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}>
                        {task.label}
                      </span>
                      {!task.done && task.urgent && (
                        <span className="ml-auto text-[9px] rounded-full bg-amber-500/25 text-amber-900 font-semibold px-1.5 py-0.5">
                          urgente
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            DORES — com tensão narrativa real
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="mt-12 w-full animate-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Se você se identifica com alguma dessas situações
          </p>

          <div className="space-y-3">
            {PAIN_POINTS.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
              >
                <div className="flex gap-3 p-3.5">
                  <div className="shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-lg bg-destructive/8 flex items-center justify-center">
                      <item.icon className="h-4 w-4 text-destructive/60" />
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      "{item.pain}"
                    </p>
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground leading-snug">
                        {item.solve}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            MÓDULOS — visão completa do produto
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="mt-12 w-full animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <p className="mb-1 text-center text-base font-semibold text-foreground">
            Tudo que um lançamento precisa
          </p>
          <p className="mb-5 text-center text-xs text-muted-foreground">
            8 módulos integrados. Ative o que precisar, quando precisar.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODULES.map((mod, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3 flex flex-col gap-2 hover:border-primary/30 hover:bg-card/80 transition-colors"
              >
                <div className={`h-7 w-7 rounded-lg ${mod.bg} flex items-center justify-center`}>
                  <mod.icon className={`h-3.5 w-3.5 ${mod.color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {mod.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {mod.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            CTA FINAL — com credenciais
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="mt-12 w-full max-w-sm animate-fade-in"
          style={{ animationDelay: "360ms" }}
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center gap-4 text-center">
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
                onClick={handleGoogleSignIn}
                className="w-full gap-2 text-sm font-semibold active:scale-95 transition-transform"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Criar conta com Google
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth?mode=signup")}
                className="w-full gap-1.5 text-sm border-border/60 hover:border-primary/40"
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

        {/* ── Credenciais ── */}
        <section
          className="mt-8 w-full animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {CREDENTIALS.map((c, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <span className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
                  {c.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{c.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Beta notice — posição secundária, sem AlertTriangle ── */}
        <p
          className="mt-8 text-center text-[10px] text-muted-foreground/50 animate-fade-in"
          style={{ animationDelay: "440ms" }}
        >
          Versão beta · Feito com artistas do mercado independente brasileiro
        </p>

        {/* ── Links legais ── */}
        <div className="mt-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: "460ms" }}>
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

      </div>
    </div>
  );
}
