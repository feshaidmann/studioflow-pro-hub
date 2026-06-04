import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BriefcaseBusiness, CalendarClock, DollarSign, Loader2, Send } from "lucide-react";
import { useInboundRequests } from "@/hooks/useMarketplace";
import { SubmitProposalModal } from "./SubmitProposalModal";
import type { ServiceRequest, ServiceProposal } from "@/types/marketplace";

const PROPOSAL_STATUS: Record<ServiceProposal["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent:      { label: "Proposta enviada",  variant: "secondary" },
  accepted:  { label: "Proposta aceita",   variant: "default" },
  rejected:  { label: "Proposta recusada", variant: "destructive" },
  withdrawn: { label: "Proposta retirada", variant: "outline" },
};

function RequestDetail({
  request,
  myProposal,
  onBack,
  onSendProposal,
}: {
  request: ServiceRequest;
  myProposal: ServiceProposal | null;
  onBack: () => void;
  onSendProposal: () => void;
}) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-1">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="space-y-1">
        <h3 className="font-semibold text-base">{request.title}</h3>
        {request.specialty_needed && (
          <p className="text-xs text-muted-foreground">{request.specialty_needed}</p>
        )}
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
        <p className="leading-relaxed text-muted-foreground">{request.briefing}</p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
          {request.desired_deadline && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Prazo desejado: {new Date(request.desired_deadline).toLocaleDateString("pt-BR")}
            </span>
          )}
          {request.budget_hint && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {request.budget_hint}
            </span>
          )}
          {request.reference_url && (
            <a
              href={request.reference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Ver referência
            </a>
          )}
        </div>
      </div>

      <Separator />

      {myProposal ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Sua proposta</p>
            <Badge variant={PROPOSAL_STATUS[myProposal.status].variant}>
              {PROPOSAL_STATUS[myProposal.status].label}
            </Badge>
          </div>
          <div className="rounded-md border p-3 text-sm space-y-2">
            <div className="flex gap-4 text-muted-foreground">
              {myProposal.price > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  R$ {myProposal.price.toLocaleString("pt-BR")}
                </span>
              )}
              {myProposal.delivery_days > 0 && (
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {myProposal.delivery_days} {myProposal.delivery_days === 1 ? "dia" : "dias"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{myProposal.message}</p>
          </div>
        </div>
      ) : (
        <Button className="w-full" onClick={onSendProposal}>
          <Send className="h-4 w-4 mr-2" />
          Enviar proposta
        </Button>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InboundRequestsSheet({ open, onOpenChange }: Props) {
  const { requests, loading, proposalForRequest, refetch } = useInboundRequests();
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [proposalTarget, setProposalTarget] = useState<ServiceRequest | null>(null);

  const handleClose = (v: boolean) => {
    if (!v) setSelected(null);
    onOpenChange(v);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5" /> Pedidos Recebidos
            </SheetTitle>
            {!selected && (
              <SheetDescription>
                Orçamentos solicitados diretamente para você. Responda com valor e prazo.
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="mt-4">
            {selected ? (
              <RequestDetail
                request={selected}
                myProposal={proposalForRequest(selected.id)}
                onBack={() => setSelected(null)}
                onSendProposal={() => setProposalTarget(selected)}
              />
            ) : loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center space-y-2 text-muted-foreground">
                <BriefcaseBusiness className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm">Nenhum pedido recebido ainda.</p>
                <p className="text-xs">Quando um artista solicitar orçamento para você, aparecerá aqui.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => {
                  const myProposal = proposalForRequest(req.id);
                  return (
                    <button
                      key={req.id}
                      onClick={() => setSelected(req)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">{req.title}</p>
                        {myProposal ? (
                          <Badge variant={PROPOSAL_STATUS[myProposal.status].variant} className="shrink-0 text-xs">
                            {PROPOSAL_STATUS[myProposal.status].label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-xs">Sem resposta</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{req.specialty_needed}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{req.briefing}</p>
                      <div className="flex flex-wrap gap-3 pt-0.5 text-[11px] text-muted-foreground">
                        {req.desired_deadline && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {new Date(req.desired_deadline).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {req.budget_hint && <span>{req.budget_hint}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SubmitProposalModal
        open={!!proposalTarget}
        onOpenChange={(v) => !v && setProposalTarget(null)}
        request={proposalTarget}
        onSuccess={() => { setProposalTarget(null); refetch(); }}
      />
    </>
  );
}
