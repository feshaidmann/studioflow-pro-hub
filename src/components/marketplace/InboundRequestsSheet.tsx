import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, BriefcaseBusiness, CalendarClock, DollarSign, Loader2, Send, Undo2, Globe } from "lucide-react";
import { useInboundRequests, useOpenRequestFeed } from "@/hooks/useMarketplace";
import { SubmitProposalModal } from "./SubmitProposalModal";
import type { InboundRequest, ServiceProposal } from "@/types/marketplace";

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
  onWithdrawProposal,
}: {
  request: InboundRequest;
  myProposal: ServiceProposal | null;
  onBack: () => void;
  onSendProposal: () => void;
  onWithdrawProposal: (id: string) => void;
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
          {request.reference_url && /^https?:\/\//i.test(request.reference_url) && (
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
          {myProposal.status === "sent" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/50"
              onClick={() => onWithdrawProposal(myProposal.id)}
            >
              <Undo2 className="h-3.5 w-3.5" /> Retirar proposta
            </Button>
          )}
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

function RequestList({
  requests,
  loading,
  emptyTitle,
  emptyDescription,
  proposalForRequest,
  onSelect,
}: {
  requests: InboundRequest[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  proposalForRequest: (id: string) => ServiceProposal | null;
  onSelect: (r: InboundRequest) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (requests.length === 0) {
    return (
      <div className="py-16 text-center space-y-2 text-muted-foreground">
        <BriefcaseBusiness className="h-10 w-10 mx-auto opacity-30" />
        <p className="text-sm">{emptyTitle}</p>
        <p className="text-xs">{emptyDescription}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const myProposal = proposalForRequest(req.id);
        return (
          <button
            key={req.id}
            onClick={() => onSelect(req)}
            className="w-full text-left rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm leading-tight">{req.title}</p>
              {myProposal ? (
                <Badge variant={PROPOSAL_STATUS[myProposal.status].variant} className="shrink-0 text-xs">
                  {PROPOSAL_STATUS[myProposal.status].label}
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 text-xs">Aguardando resposta</Badge>
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
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InboundRequestsSheet({ open, onOpenChange }: Props) {
  const { requests: inbound, loading: inboundLoading, proposalForRequest: inboundProposal, refetch: refetchInbound, withdrawProposal } = useInboundRequests();
  const { requests: feed, loading: feedLoading, proposalForRequest: feedProposal, refetch: refetchFeed } = useOpenRequestFeed(open);
  const [selected, setSelected] = useState<InboundRequest | null>(null);
  const [proposalTarget, setProposalTarget] = useState<InboundRequest | null>(null);
  const [tab, setTab] = useState<"directed" | "feed">("directed");

  const activeProposalForRequest = tab === "directed" ? inboundProposal : feedProposal;

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
                Responda orçamentos direcionados a você ou explore pedidos abertos no marketplace.
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="mt-4">
            {selected ? (
              <RequestDetail
                request={selected}
                myProposal={activeProposalForRequest(selected.id)}
                onBack={() => setSelected(null)}
                onSendProposal={() => setProposalTarget(selected)}
                onWithdrawProposal={withdrawProposal}
              />
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="w-full">
                  <TabsTrigger value="directed" className="flex-1 gap-1.5">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    Para mim
                    {inbound.length > 0 && (
                      <Badge variant="secondary" className="h-4 text-[10px] px-1">{inbound.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="feed" className="flex-1 gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Feed aberto
                    {feed.length > 0 && (
                      <Badge variant="secondary" className="h-4 text-[10px] px-1">{feed.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="directed" className="mt-3">
                  <RequestList
                    requests={inbound}
                    loading={inboundLoading}
                    emptyTitle="Nenhum pedido direcionado ainda."
                    emptyDescription="Quando um artista solicitar orçamento especificamente para você, aparecerá aqui."
                    proposalForRequest={inboundProposal}
                    onSelect={setSelected}
                  />
                </TabsContent>

                <TabsContent value="feed" className="mt-3">
                  <RequestList
                    requests={feed}
                    loading={feedLoading}
                    emptyTitle="Nenhum pedido aberto no momento."
                    emptyDescription="Artistas que não direcionam a nenhum profissional específico aparecem aqui."
                    proposalForRequest={feedProposal}
                    onSelect={setSelected}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SubmitProposalModal
        open={!!proposalTarget}
        onOpenChange={(v) => !v && setProposalTarget(null)}
        request={proposalTarget}
        onSuccess={() => {
          setProposalTarget(null);
          refetchInbound();
          refetchFeed();
        }}
      />
    </>
  );
}
