import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getJourneyPlan, momentLabels, painLabels } from "@/lib/journeyPersonalization";
import type { Profile } from "@/contexts/ProfileContext";

interface JourneyFocusCardProps {
  displayName: string;
  profile: Profile | null;
  projectCount: number;
  onAskAI: (message: string) => void;
}

export default function JourneyFocusCard({ displayName, profile, projectCount, onAskAI }: JourneyFocusCardProps) {
  const navigate = useNavigate();
  const plan = getJourneyPlan(profile?.main_pain ?? "organization", profile?.current_moment ?? "", profile?.track_view_mode ?? "basic");
  const name = displayName || "Artista";

  return (
    <Card className="glass-card animate-fade-in overflow-hidden">
      <CardContent className="p-4 md:p-5 space-y-4">
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

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-muted/50 border border-border p-3">
            <span className="text-muted-foreground">Momento</span>
            <p className="font-medium text-foreground truncate">{momentLabels[profile?.current_moment ?? ""] ?? "produção"}</p>
          </div>
          <div className="rounded-xl bg-muted/50 border border-border p-3">
            <span className="text-muted-foreground">Foco</span>
            <p className="font-medium text-foreground truncate">{painLabels[profile?.main_pain ?? ""] ?? "organização"}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="gap-2" onClick={() => navigate(plan.primaryPath)}>
            {plan.primaryLabel} <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate(plan.secondaryPath)}>{plan.secondaryLabel}</Button>
          <Button variant="secondary" className="gap-2" onClick={() => onAskAI(plan.aiPrompt)}>
            <Bot className="h-4 w-4" /> Perguntar à IA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}