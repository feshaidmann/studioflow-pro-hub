import { ArrowRight, Bot, Sparkles, AlertTriangle, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getJourneyPlan, momentLabels, painLabels } from "@/lib/journeyPersonalization";
import type { Profile } from "@/contexts/ProfileContext";
import { StatusBadge } from "./StatusBadge";

export type NextActionSeverity = "critical" | "warning" | "info";

export interface NextAction {
  label: string;
  detail?: string;
  severity: NextActionSeverity;
}

interface HeroFocusCardProps {
  displayName: string;
  profile: Profile | null;
  projectCount: number;
  nextAction: NextAction | null;
  onAskAI: (message: string) => void;
  onResolveNextAction?: (action: NextAction) => void;
  isMobile?: boolean;
}

const SEV_BORDER: Record<NextActionSeverity, string> = {
  critical: "border-l-destructive",
  warning: "border-l-warning",
  info: "border-l-primary",
};

const SEV_ICON: Record<NextActionSeverity, { Icon: React.ElementType; color: string; variant: "critical" | "warning" | "info" }> = {
  critical: { Icon: AlertTriangle, color: "text-destructive", variant: "critical" },
  warning: { Icon: AlertCircle, color: "text-warning", variant: "warning" },
  info: { Icon: Bot, color: "text-primary", variant: "info" },
};

export default function HeroFocusCard({
  displayName, profile, projectCount, nextAction, onAskAI, onResolveNextAction, isMobile,
}: HeroFocusCardProps) {
  const navigate = useNavigate();
  const plan = getJourneyPlan(profile?.main_pain ?? "organization", profile?.current_moment ?? "", profile?.track_view_mode ?? "basic");
  const name = displayName || "Artista";
  const [detailsOpen, setDetailsOpen] = useState(!isMobile);

  const borderClass = nextAction
    ? SEV_BORDER[nextAction.severity]
    : projectCount > 0 ? "border-l-success" : "border-l-primary";

  const handleResolve = () => {
    if (!nextAction) return;
    if (onResolveNextAction) return onResolveNextAction(nextAction);
    onAskAI(`Preciso de ajuda com: ${nextAction.label}. ${nextAction.detail ? `Contexto: ${nextAction.detail}` : ""} O que devo fazer?`);
  };

  return (
    <Card className={cn("glass-card animate-fade-in overflow-hidden border-l-4", borderClass)}>
      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Linha 1: identificação + plano */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Plano inicial personalizado</p>
            <h2 className="text-lg md:text-xl font-semibold text-foreground leading-tight">
              {name}, {plan.headline.toLowerCase()}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              {projectCount > 0 ? plan.reason : "Crie seu primeiro projeto para transformar essas escolhas em checklist, IA e próximos passos."}
            </p>
          </div>
        </div>

        {/* Linha 2: próxima ação */}
        {nextAction ? (() => {
          const { Icon, color, variant } = SEV_ICON[nextAction.severity];
          return (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Próxima ação: ${nextAction.label}. Pressione Enter para resolver com IA.`}
              onClick={handleResolve}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleResolve(); } }}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <StatusBadge variant={variant}>Próxima ação</StatusBadge>
                  <span className="text-[11px] text-muted-foreground">clique para resolver com IA</span>
                </div>
                <p className="text-sm font-medium truncate">{nextAction.label}</p>
                {!isMobile && nextAction.detail && (
                  <p className="text-xs text-muted-foreground truncate">{nextAction.detail}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })() : projectCount > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <p className="text-sm text-foreground">Tudo em dia. Sem ações urgentes agora.</p>
          </div>
        ) : null}

        {/* Linha 3: contexto colapsável (momento + foco) */}
        <div>
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {detailsOpen ? "Ocultar contexto" : "Ver contexto do plano"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", detailsOpen && "rotate-180")} />
          </button>
          {detailsOpen && (
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <div className="rounded-xl bg-muted/50 border border-border p-3">
                <span className="text-muted-foreground">Momento</span>
                <p className="font-medium text-foreground truncate">{momentLabels[profile?.current_moment ?? ""] ?? "produção"}</p>
              </div>
              <div className="rounded-xl bg-muted/50 border border-border p-3">
                <span className="text-muted-foreground">Foco</span>
                <p className="font-medium text-foreground truncate">{painLabels[profile?.main_pain ?? ""] ?? "organização"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Linha 4: CTAs */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="gap-2" onClick={() => navigate(plan.primaryPath)} aria-label={plan.primaryLabel}>
            {plan.primaryLabel} <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate(plan.secondaryPath)}>{plan.secondaryLabel}</Button>
          <Button variant="secondary" className="gap-2" onClick={() => onAskAI(plan.aiPrompt)} aria-label="Perguntar à IA">
            <Bot className="h-4 w-4" /> Perguntar à IA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
