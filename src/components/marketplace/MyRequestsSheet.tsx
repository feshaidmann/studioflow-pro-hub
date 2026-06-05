import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Inbox, CalendarClock, Loader2 } from "lucide-react";
import { useServiceRequests, useServiceProposals } from "@/hooks/useMarketplace";
import { ProposalCard } from "./ProposalCard";
import type { ServiceRequest } from "@/types/marketplace";

const STATUS_LABEL: Record<ServiceRequest["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open:      { label: "Aberto",    variant: "secondary" },
  fulfilled: { label: "Fechado",   variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  expired:   { label: "Expirado",  variant: "outline" },
};

function RequestDetail({
  request,
  onBack,
  onAccepted,
}: {
  request: ServiceRequest;
  onBack: () => void;
  onAccepted?: () => void;
}) {
  const { proposals, loading, acceptProposal } = useServiceProposals(request.id);
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleAccept = async (id: string) => {
    setAccepting(id);
    const ok = await acceptProposal(id);
    setAccepting(null);
    if (ok) onAccepted?.();
  };

  const isOpen = request.status === "open";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-1">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-base">{request.title}</h3>
          <Badge variant={STATUS_LABEL[request.status].variant}>
            {STATUS_LABEL[request.status].label}
          </Badge>
        </div>
        {request.specialty_needed && (
          <p className="text-xs text-muted-foreground">{request.specialty_needed}</p>
        )}
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
        <p className="text-muted-foreground leading-relaxed">{request.briefing}</p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
          {request.desired_deadline && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Prazo: {new Date(request.desired_deadline).toLocaleDateString("pt-BR")}
            </span>
          )}
          {request.budget_hint && <span>Orçamento: {request.budget_hint}</span>}
          {request.target_provider_name && (
            <span>Para: <span className="font-medium">{request.target_provider_name}</span></span>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Propostas recebidas {!loading && `(${proposals.length})`}
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm space-y-1">
            <Inbox className="h-8 w-8 mx-auto opacity-30" />
            <p>Nenhuma proposta ainda.</p>
            <p className="text-xs">Quando um profissional enviar uma proposta, ela aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                canAccept={isOpen}
                onAccept={handleAccept}
                accepting={accepting === p.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MyRequestsSheet({ open, onOpenChange }: Props) {
  const { requests, loading, cancelRequest, refetch: refetchRequests } = useServiceRequests();
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCancelling(id);
    await cancelRequest(id);
    setCancelling(null);
  };

  const handleAccepted = async () => {
    await refetchRequests();
    setSelected((prev) => prev ? { ...prev, status: "fulfilled" } : null);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) setSelected(null); onOpenChange(v); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Meus Pedidos
          </SheetTitle>
          {!selected && (
            <SheetDescription>
              Pedidos de orçamento que você enviou e as propostas recebidas.
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-4">
          {selected ? (
            <RequestDetail
              request={selected}
              onBack={() => setSelected(null)}
              onAccepted={handleAccepted}
            />
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">Você ainda não enviou nenhum pedido.</p>
              <p className="text-xs">Use o Marketplace para encontrar profissionais e solicitar orçamentos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => {
                const cfg = STATUS_LABEL[req.status];
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelected(req)}
                    className="w-full text-left rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-tight">{req.title}</p>
                      <Badge variant={cfg.variant} className="shrink-0 text-xs">{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{req.specialty_needed}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{req.briefing}</p>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("pt-BR")}
                        {req.target_provider_name && ` · Para ${req.target_provider_name}`}
                      </span>
                      {req.status === "open" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground hover:text-destructive px-1.5"
                          disabled={cancelling === req.id}
                          onClick={(e) => handleCancel(e, req.id)}
                        >
                          {cancelling === req.id ? "..." : "Cancelar"}
                        </Button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
