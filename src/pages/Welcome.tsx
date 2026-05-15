import { lazy, Suspense, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { WelcomeHero } from "@/components/welcome/WelcomeHero";
import { WelcomeProductPreview } from "@/components/welcome/WelcomeProductPreview";

const WelcomePainPoints = lazy(() =>
  import("@/components/welcome/WelcomePainPoints").then((m) => ({ default: m.WelcomePainPoints }))
);
const WelcomeModules = lazy(() =>
  import("@/components/welcome/WelcomeModules").then((m) => ({ default: m.WelcomeModules }))
);
const WelcomeFinalCTA = lazy(() =>
  import("@/components/welcome/WelcomeFinalCTA").then((m) => ({ default: m.WelcomeFinalCTA }))
);

export default function Welcome() {
  const { user, loading } = useAuth();
  const { needsProfileSetup } = useProfile();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "StudioFlow — Gestão para artista independente brasileiro";
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "Projetos, financeiro, equipe, editais e IA criativa num só app — pensado para o artista independente brasileiro."
    );
    return () => {
      document.title = prevTitle;
      if (prevDesc) meta?.setAttribute("content", prevDesc);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground text-sm">{t("misc.loading")}</div>
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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0%, transparent 50%)",
        }}
      />

      <main className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-5 pb-16 pt-8 md:px-8 md:pt-16">
        <WelcomeHero
          onGoogle={handleGoogleSignIn}
          onSignupEmail={() => navigate("/auth?mode=signup")}
          onLogin={() => navigate("/auth")}
        />

        <WelcomeProductPreview />

        <Suspense fallback={null}>
          <WelcomePainPoints />
          <WelcomeModules />
          <WelcomeFinalCTA onGoogle={handleGoogleSignIn} />
        </Suspense>
      </main>
    </div>
  );
}
