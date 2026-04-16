import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import {
  ArrowRight, LogIn, Mic2,
  Sparkles, AlertTriangle, CheckCircle2, XCircle,
  Rocket, Clock, FileText, Palette,
  DollarSign, Users,
} from "lucide-react";

const features = [
  { text: "Organize seu lançamento do rascunho à distribuição.", icon: Rocket, iconColor: "text-primary" },
  { text: "Nunca mais perca um prazo de entrega ou gravação.", icon: Clock, iconColor: "text-primary" },
  { text: "Controle equipe, cachês e custos por projeto.", icon: Users, iconColor: "text-[hsl(var(--warning))]" },
  { text: "Finanças claras: quanto gastou e o que falta.", icon: DollarSign, iconColor: "text-[hsl(var(--success))]" },
  { text: "Encontre editais de fomento cultural com IA.", icon: FileText, iconColor: "text-violet-500" },
  { text: "Crie artes, capas e legendas com IA generativa.", icon: Palette, iconColor: "text-sky-500" },
];

const comparison = [
  { before: "Conversas soltas no WhatsApp", after: "Chat do projeto + compartilhar via WhatsApp" },
  { before: "Planilha de custos genérica", after: "Financeiro por projeto e por faixa" },
  { before: "Prazos esquecidos", after: "Alertas automáticos de risco" },
  { before: "Buscar editais manualmente", after: "IA encontra editais abertos pra você" },
  { before: "Sem material visual pronto", after: "Artes e legendas geradas com IA" },
  { before: "Sem saber se está pronto pra lançar", after: "Checklist de lançamento completo" },
];

export default function Welcome() {
  const { user, loading } = useAuth();
  const { needsProfileSetup } = useProfile();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">{t("misc.loading")}</div></div>;
  if (user && needsProfileSetup) return <Navigate to="/onboarding" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Erro ao entrar com Google. Tente novamente.");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* BETA BANNER */}
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-card/80 backdrop-blur-xl border-b border-border/60 px-4 py-1.5">
        <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
        <p className="text-[11px] text-muted-foreground font-medium">{t("welcome.beta")}</p>
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pb-16 pt-20 md:px-12 md:pt-28">

        {/* ── HERO ── */}
        <section className="w-full max-w-xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary mb-5">
            <Rocket className="h-3 w-3" />
            Gestão completa para artistas independentes
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground">
            StudioFlow
          </h1>

          <p className="mt-4 text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Organize seu lançamento, controle prazos e custos, e pare de perder tempo com planilha e WhatsApp.
          </p>
        </section>

        {/* ── FEATURES ── */}
        <section className="mt-8 w-full max-w-lg animate-fade-in" style={{ animationDelay: "100ms" }}>
          <p className="text-center text-xs text-muted-foreground font-medium mb-4 uppercase tracking-wider">
            {t("welcome.featuresLabel")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((item, i) => (
              <div
                key={i}
                className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${100 + i * 50}ms` }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <p className="text-xs text-foreground leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── ANTES vs DEPOIS ── */}
        <section className="mt-8 w-full max-w-lg animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="glass-card rounded-2xl p-5 border border-border/40">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Feito para quem hoje usa WhatsApp e planilha
              </p>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Você não precisa aprender uma ferramenta complexa. Comece com o básico e ative mais quando precisar.
            </p>

            <div className="space-y-2.5">
              {comparison.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-destructive/60 shrink-0" />
                    <span className="text-muted-foreground line-through">{item.before}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0 hidden sm:block" />
                  <div className="flex items-center gap-1.5 pl-5 sm:pl-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))] shrink-0" />
                    <span className="text-foreground font-medium">{item.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-8 w-full max-w-sm animate-fade-in" style={{ animationDelay: "500ms" }}>
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
                Começar simples
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
