import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import {
  DashboardMockup,
  ProjectsMockup,
  MasterAnalyzerMockup,
  FinancialMockup,
  AgendaMockup,
  MusicDNAMockup,
} from "@/components/TutorialMockups";
import {
  FolderKanban,
  Activity,
  DollarSign,
  ArrowRight,
  Users,
  LogIn,
  Mic2,
  CalendarDays,
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  Dna,
} from "lucide-react";

/* ── AI Mockup ── */
function AIMockup() {
  const messages = [
    { role: "assistant", text: "Olá! Sou seu assistente de produção musical. Como posso ajudar?" },
    { role: "user", text: "Qual projeto está mais atrasado?" },
    { role: "assistant", text: "Summer Vibes está em 72% há 6 dias sem atualização. Quer que eu crie uma tarefa de revisão?" },
    { role: "user", text: "Meu LUFS está em –10. Está ok para Spotify?" },
    { role: "assistant", text: "–10 LUFS está acima do ideal. O Spotify normaliza para –14 LUFS, então sua faixa pode soar mais baixa que as outras. Recomendo masterizar entre –14 e –9 LUFS integrado." },
  ];

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-background/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border/40">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
        </div>
        <Sparkles className="h-2.5 w-2.5 text-primary" />
        <span className="text-[10px] text-muted-foreground font-medium">Assistente IA</span>
      </div>
      <div className="p-3 space-y-2 text-[11px]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-2.5 w-2.5 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-2.5 py-1.5 max-w-[80%] leading-relaxed ${
                m.role === "user"
                  ? "bg-primary/10 text-foreground border border-primary/20"
                  : "bg-card/80 text-foreground border border-border/40"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div className="flex gap-1.5 pt-1">
          {["Criar tarefa", "Ver projeto", "Explicar LUFS"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] text-primary font-medium"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const previewTabs = [
  { id: "ai", label: "IA", icon: Sparkles, component: AIMockup, accent: "text-primary", activeBg: "bg-primary/15 border-primary/30" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: DashboardMockup, accent: "text-primary", activeBg: "bg-primary/15 border-primary/30" },
  { id: "projects", label: "Projetos", icon: FolderKanban, component: ProjectsMockup, accent: "text-primary", activeBg: "bg-primary/15 border-primary/30" },
  { id: "dna", label: "DNA Musical", icon: Dna, component: MusicDNAMockup, accent: "text-primary", activeBg: "bg-primary/15 border-primary/30" },
  { id: "master", label: "Master", icon: Activity, component: MasterAnalyzerMockup, accent: "text-primary", activeBg: "bg-primary/15 border-primary/30" },
  { id: "finance", label: "Finanças", icon: DollarSign, component: FinancialMockup, accent: "text-[hsl(var(--success))]", activeBg: "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.2)]" },
  { id: "agenda", label: "Agenda", icon: CalendarDays, component: AgendaMockup, accent: "text-sky-500", activeBg: "bg-sky-500/10 border-sky-500/20" },
];

const features = [
  {
    solution: "IA que responde sobre projetos, finanças, mixagem e agenda — a qualquer hora.",
    icon: Sparkles,
    accent: "from-primary/15 to-primary/5",
    iconColor: "text-primary",
    highlight: true,
  },
  {
    solution: "Projetos com BPM, tom, estágio e progresso de mix.",
    icon: FolderKanban,
    accent: "from-primary/15 to-primary/5",
    iconColor: "text-primary",
    highlight: false,
  },
  {
    solution: "DNA Musical: diagnóstico técnico e artístico por IA a partir do áudio.",
    icon: Dna,
    accent: "from-primary/15 to-primary/5",
    iconColor: "text-primary",
    highlight: true,
  },
  {
    solution: "Master Analyzer checa LUFS e True Peak no padrão Spotify.",
    icon: Activity,
    accent: "from-primary/15 to-primary/5",
    iconColor: "text-primary",
    highlight: false,
  },
  {
    solution: "Cachês, shows e custos por projeto. Margem em tempo real.",
    icon: DollarSign,
    accent: "from-[hsl(var(--success)/0.15)] to-[hsl(var(--success)/0.05)]",
    iconColor: "text-[hsl(var(--success))]",
    highlight: false,
  },
  {
    solution: "Cadastre parceiros, convide para projetos e avalie cada um.",
    icon: Users,
    accent: "from-[hsl(var(--warning)/0.15)] to-[hsl(var(--warning)/0.05)]",
    iconColor: "text-[hsl(var(--warning))]",
    highlight: false,
  },
  {
    solution: "Shows, gravações e prazos integrados à agenda.",
    accent: "from-sky-500/15 to-sky-500/5",
    iconColor: "text-sky-500",
    icon: CalendarDays,
    highlight: false,
  },
];

export default function Welcome() {
  const { user, loading } = useAuth();
  const { needsProfileSetup } = useProfile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ai");
  const ActiveMockup = previewTabs.find((t) => t.id === activeTab)?.component ?? AIMockup;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">{t("misc.loading")}</div></div>;
  if (user && needsProfileSetup) return <Navigate to="/onboarding" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error("Erro ao entrar com Google. Tente novamente.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* ── BETA BANNER ── */}
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-card/80 backdrop-blur-xl border-b border-border/60 px-4 py-1.5">
        <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
        <p className="text-[11px] text-muted-foreground font-medium">
          {t("welcome.beta")}
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pb-16 pt-20 md:px-12 md:pt-28">

        {/* ── HERO ── */}
        <section className="w-full max-w-xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary mb-5">
            <Sparkles className="h-3 w-3" />
            {t("welcome.badge")}
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground">
            StudioFlow
          </h1>

          <p className="mt-4 text-muted-foreground text-sm md:text-base max-w-sm mx-auto leading-relaxed">
            {t("welcome.subtitle")}{" "}
            <span className="text-foreground font-medium">{t("welcome.subtitleBold")}</span>
            {" "}{t("welcome.with")}{" "}
            <span className="text-primary font-semibold">{t("welcome.subtitleAI")}</span>.
          </p>
        </section>

        {/* ── FEATURES ── */}
        <section className="mt-8 w-full max-w-2xl animate-fade-in" style={{ animationDelay: "150ms" }}>
          <p className="text-center text-xs text-muted-foreground font-medium mb-5 uppercase tracking-wider">
            {t("welcome.featuresLabel")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {features.map((item, i) => (
              <div
                key={i}
                className={`glass-card rounded-xl p-3 flex flex-col items-center gap-2 text-center animate-fade-in ${
                  item.highlight ? "border border-primary/20 shadow-sm" : ""
                }`}
                style={{ animationDelay: `${150 + i * 60}ms` }}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.accent}`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <p className="text-xs text-foreground leading-snug">
                  {item.solution}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── APP PREVIEW ── */}
        <section className="mt-10 w-full max-w-2xl animate-fade-in" style={{ animationDelay: "550ms" }}>
          <p className="text-center text-xs text-muted-foreground font-medium mb-4 uppercase tracking-wider">
            {t("welcome.previewLabel")}
          </p>

          {/* Tab bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none justify-center flex-wrap">
            {previewTabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                    active
                      ? `${tab.activeBg} ${tab.accent}`
                      : "bg-muted/40 text-muted-foreground border-border/30 hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mockup container */}
          <div className="glass-card rounded-2xl overflow-hidden border border-border/40 transition-all duration-300">
            <div key={activeTab} className="pointer-events-none animate-fade-in">
              <ActiveMockup />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-8 w-full max-w-sm animate-fade-in" style={{ animationDelay: "700ms" }}>
          <div className="glass-card rounded-2xl px-6 py-7 flex flex-col items-center gap-4 text-center">
            <div>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {t("welcome.ctaTitle")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t("welcome.ctaSubtitle")}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
                className="active:scale-95 transition-transform gap-2 text-sm font-semibold w-full"
              >
                <Mic2 className="h-4 w-4" />
                {t("welcome.ctaEmail")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="active:scale-95 transition-transform gap-2 text-sm w-full border-border/60 hover:border-primary/50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t("welcome.ctaGoogle")}
              </Button>
              <button
                onClick={() => navigate("/auth")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <LogIn className="h-3 w-3" />
                {t("welcome.ctaLogin")}
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button onClick={() => navigate("/legal?tab=terms")} className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2">
                {t("welcome.terms")}
              </button>
              <span className="text-muted-foreground/30 text-[10px]">•</span>
              <button onClick={() => navigate("/legal?tab=privacy")} className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2">
                {t("welcome.privacy")}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
