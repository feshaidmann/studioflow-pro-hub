import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Zap, BarChart2, CalendarDays, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  const feature = searchParams.get("feature") ?? "projects";
  const details = featureDetails[feature] ?? featureDetails.projects;

  const handleUpgrade = () => {
    toast.info("Upgrade em breve!", {
      description: "A funcionalidade de upgrade estará disponível em breve.",
    });
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
    </div>
  );
}
