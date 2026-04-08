import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { Music, ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Mode = "login" | "signup" | "forgot";

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  }
  if (lower.includes("email not confirmed")) {
    return "Você ainda não confirmou seu e-mail. Verifique sua caixa de entrada.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "Esse e-mail já está cadastrado. Tente fazer login.";
  }
  if (lower.includes("password should be at least")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Muitas tentativas. Aguarde um momento e tente novamente.";
  }
  if (lower.includes("unable to validate email address")) {
    return "Endereço de e-mail inválido. Verifique e tente novamente.";
  }
  return message;
}

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { needsProfileSetup } = useProfile();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (user && needsProfileSetup) return <Navigate to="/onboarding" replace />;
  if (user) return <Navigate to={redirectTo} replace />;

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error(friendlyError(error.message));
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      setSubmitting(false);
      if (error) {
        toast.error(friendlyError(error.message));
      } else {
        setForgotSent(true);
      }
      return;
    }

    if (mode === "signup") {
      const { error } = await signUp(email, password);
      setSubmitting(false);
      if (error) {
        toast.error(friendlyError(error.message));
      } else {
        setSignupEmail(email);
        setSignupSent(true);
      }
      return;
    }

    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(friendlyError(error.message));
    }
  };

  // ── Post-signup confirmation holding state ─────────────────────────────────
  if (signupSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-sm font-medium text-foreground">{signupEmail}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Clique no link do e-mail para ativar sua conta. Verifique a pasta de spam se não encontrar.
            </p>
            <Button
              variant="ghost"
              className="w-full gap-2 text-sm"
              onClick={() => { setSignupSent(false); setMode("login"); }}
            >
              <ArrowLeft className="h-4 w-4" /> Já confirmei — fazer login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            {mode === "forgot" ? <Mail className="h-6 w-6 text-primary" /> : <Music className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-semibold">StudioFlow</CardTitle>
          <CardDescription>
            {mode === "login" ? "Entre na sua conta" : mode === "signup" ? "Crie sua conta" : "Recuperar senha"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "forgot" && forgotSent ? (
            <div className="text-center space-y-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm text-muted-foreground">
                  Enviamos um link de recuperação para <span className="text-foreground font-medium">{email}</span>. Verifique sua caixa de entrada (e spam).
                </p>
              </div>
              <Button variant="ghost" className="w-full gap-2" onClick={() => { setMode("login"); setForgotSent(false); }}>
                <ArrowLeft className="h-4 w-4" /> Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-border/60 hover:border-primary/40"
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Entrar com Google
                  </Button>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                </>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                {mode === "login" && (
                  <div className="text-right">
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Esqueci minha senha
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de recuperação"}
                </Button>
              </form>

              {mode === "forgot" ? (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  <button onClick={() => setMode("login")} className="text-primary hover:underline flex items-center gap-1 mx-auto">
                    <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
                  </button>
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
                  <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary hover:underline">
                    {mode === "login" ? "Criar conta" : "Entrar"}
                  </button>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
