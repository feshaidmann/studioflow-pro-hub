import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Zap, BarChart2, CalendarDays, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";

const featureDetails: Record<string, { title: string; description: string; icon: React.ReactNode; perks: string[] }> = {
  finance: {
    title: "Controle Financeiro",
    description: "Gerencie cachês, receitas, despesas e contratos dos seus projetos.",
    icon: <BarChart2 className="h-8 w-8 text-primary" />,
    perks: ["Registro de cachês e pagamentos", "Controle de receitas por projeto", "Relatórios financeiros", "Gestão de contratos"],
  },
  agenda: {
    title: "Agenda",
    description: "Organize suas sessões de estúdio, gravações e entregas.",
    icon: <CalendarDays className="h-8 w-8 text-primary" />,
    perks: ["Calendário de sessões", "Lembretes de entrega", "Sincronização com projetos", "Visualização mensal"],
  },
  ai: {
    title: "Assistente IA",
    description: "Crie tarefas inteligentes e receba sugestões personalizadas com IA.",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    perks: ["Geração automática de tarefas", "Sugestões personalizadas", "Análise de projetos", "Planejamento inteligente"],
  },
  projects: {
    title: "Projetos Ilimitados",
    description: "Crie e gerencie quantos projetos precisar, sem restrições.",
    icon: <Zap className="h-8 w-8 text-primary" />,
    perks: ["Projetos ilimitados", "Equipe ilimitada", "Histórico completo", "Exportação de dados"],
  },
};

export default function UpgradeScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const feature = searchParams.get("feature") ?? "projects";
  const details = featureDetails[feature] ?? featureDetails.projects;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setWhatsapp(profile?.whatsapp ?? "");
    setSubmitted(false);
    setDialogOpen(true);
  };

  const handleSubmitInterest = async () => {
    setLoading(true);
    try {
      if (whatsapp && whatsapp !== profile?.whatsapp) {
        await updateProfile({ whatsapp });
      }
      await supabase.from("profiles").update({ plan: "pro" } as never).eq("id", profile?.id ?? "").throwOnError();
      setSubmitted(true);
    } catch {
      toast.error("Erro ao registrar interesse. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        {/* Lock badge */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              {details.icon}
            </div>
            <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/90 flex items-center justify-center">
              <Lock className="h-3.5 w-3.5 text-destructive-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs font-semibold tracking-wide uppercase">Plano Pro</Badge>
            <h1 className="text-2xl font-bold">{details.title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">{details.description}</p>
          </div>
        </div>

        {/* Perks */}
        <Card className="border-border bg-card/50">
          <CardContent className="pt-5 space-y-3">
            {details.perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Zap className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">{perk}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-3">
          <Button className="w-full h-12 text-base font-semibold neon-glow active:scale-95 transition-transform gap-2" onClick={handleUpgrade}>
            <Sparkles className="h-4 w-4" />
            Fazer upgrade para Pro
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Você está no plano <strong>Free</strong>. Faça upgrade para desbloquear todos os recursos.
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <DialogHeader>
                <DialogTitle>Interesse registrado!</DialogTitle>
                <DialogDescription>
                  Entraremos em contato pelo WhatsApp para finalizar o seu upgrade para o plano Pro.
                </DialogDescription>
              </DialogHeader>
              <Button className="w-full" onClick={() => { setDialogOpen(false); navigate(-1); }}>
                Voltar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Upgrade para o plano Pro</DialogTitle>
                <DialogDescription>
                  Confirme seu WhatsApp para que nossa equipe entre em contato e finalize o upgrade.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="upgrade-whatsapp">WhatsApp</Label>
                  <Input
                    id="upgrade-whatsapp"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleSubmitInterest}
                  disabled={loading || !whatsapp.trim()}
                >
                  {loading ? "Enviando..." : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Confirmar interesse
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
