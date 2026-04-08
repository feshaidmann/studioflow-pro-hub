import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music, KeyRound, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    // Also check if session is already set (token in URL hash handled by Supabase)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            {done ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <KeyRound className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle className="text-2xl neon-text">StudioFlow Pro</CardTitle>
          <CardDescription>{done ? "Senha redefinida!" : "Criar nova senha"}</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-center text-sm text-muted-foreground">Redirecionando para o dashboard…</p>
          ) : !sessionReady ? (
            <p className="text-center text-sm text-muted-foreground animate-pulse">Verificando link de recuperação…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
              <Button type="submit" className="w-full neon-glow" disabled={submitting}>
                {submitting ? "Salvando…" : "Redefinir senha"}
              </Button>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            <button onClick={() => navigate("/auth")} className="text-primary hover:underline">
              Voltar ao login
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
