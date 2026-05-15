import { useRateLimitDialog } from "@/hooks/useRateLimitDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIQuotaBadgeProps {
  /** Show as inline pill (default) or as a small text indicator */
  variant?: "pill" | "text";
  /** Only show when remaining ≤ this number. Default: 5 */
  warnThreshold?: number;
  /** Always show, regardless of remaining quota */
  alwaysShow?: boolean;
  className?: string;
}

/**
 * Unified AI fair-use quota indicator. Drop-in para módulos com IA
 * (DNA Musical, Carreira, Direção Visual). Lê o snapshot de quota do
 * contexto do RateLimitDialog (populado pelas edge functions a cada chamada).
 */
export function AIQuotaBadge({
  variant = "pill",
  warnThreshold = 5,
  alwaysShow = false,
  className,
}: AIQuotaBadgeProps) {
  const { quota } = useRateLimitDialog();
  if (!quota) return null;

  const dailyRemaining = Math.max(0, quota.daily_limit - quota.daily_used);
  const weeklyRemaining = Math.max(0, quota.weekly_limit - quota.weekly_used);

  if (!alwaysShow && dailyRemaining > warnThreshold) return null;

  const exhausted = dailyRemaining === 0;
  const text = exhausted
    ? "Limite diário atingido"
    : `${dailyRemaining} ${dailyRemaining === 1 ? "uso restante" : "usos restantes"} hoje`;

  const tip = `Cota da IA: ${quota.daily_used}/${quota.daily_limit} hoje · ${quota.weekly_used}/${quota.weekly_limit} na semana. Reset diário: ${new Date(quota.daily_resets_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}.`;

  if (variant === "text") {
    return (
      <span className={cn("text-[11px]", exhausted ? "text-destructive" : "text-muted-foreground", className)}>
        {text}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              exhausted
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-warning/30 bg-warning/10 text-warning",
              className
            )}
          >
            <Sparkles className="h-3 w-3" />
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AIQuotaBadge;
