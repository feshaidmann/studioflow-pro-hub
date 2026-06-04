import { CheckCircle2, Clock, XCircle, DollarSign, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ServiceProposal } from "@/types/marketplace";

const STATUS_CONFIG: Record<ServiceProposal["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent:      { label: "Aguardando",  variant: "secondary" },
  accepted:  { label: "Aceita",      variant: "default" },
  rejected:  { label: "Recusada",    variant: "destructive" },
  withdrawn: { label: "Retirada",    variant: "outline" },
};

interface Props {
  proposal: ServiceProposal;
  canAccept?: boolean;
  onAccept?: (id: string) => void;
  accepting?: boolean;
}

export function ProposalCard({ proposal, canAccept, onAccept, accepting }: Props) {
  const cfg = STATUS_CONFIG[proposal.status];
  const initials = proposal.provider_name
    ? proposal.provider_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={proposal.provider_avatar} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm leading-tight">{proposal.provider_name || "Profissional"}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(proposal.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div className="flex gap-4 text-sm">
        {proposal.price > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            R$ {proposal.price.toLocaleString("pt-BR")}
          </span>
        )}
        {proposal.delivery_days > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {proposal.delivery_days} {proposal.delivery_days === 1 ? "dia" : "dias"}
          </span>
        )}
      </div>

      {proposal.message && (
        <p className="text-sm text-muted-foreground leading-relaxed">{proposal.message}</p>
      )}

      {canAccept && proposal.status === "sent" && (
        <Button
          size="sm"
          className="w-full"
          onClick={() => onAccept?.(proposal.id)}
          disabled={accepting}
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {accepting ? "Aceitando..." : "Aceitar proposta"}
        </Button>
      )}
    </div>
  );
}
