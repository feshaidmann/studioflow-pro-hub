import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useServiceRequests } from "@/hooks/useMarketplace";
import type { MarketplaceProvider } from "@/types/marketplace";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  provider: MarketplaceProvider | null;
  projectId?: string;
  specialty?: string;
}

export function RequestQuoteModal({ open, onOpenChange, provider, projectId, specialty }: Props) {
  const { createRequest } = useServiceRequests();
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!briefing.trim() || briefing.trim().length < 10) return;
    setSaving(true);
    const result = await createRequest({
      title: title.trim() || `Pedido para ${provider?.name ?? "profissional"}`,
      briefing: briefing.trim(),
      specialty_needed: specialty ?? provider?.specialties?.[0] ?? "",
      desired_deadline: deadline || null,
      budget_hint: budget.trim(),
      reference_url: reference.trim(),
      project_id: projectId ?? null,
      target_provider_ref: provider?.is_user ? provider.provider_ref : null,
      target_provider_name: provider?.name ?? null,
    });
    setSaving(false);
    if (result) {
      setTitle(""); setBriefing(""); setDeadline(""); setBudget(""); setReference("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar orçamento</DialogTitle>
          <DialogDescription>
            {provider ? `Envie um briefing curto para ${provider.name}.` : "Descreva o serviço que você precisa."}
            {" "}Profissionais interessados respondem com valor e prazo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="mkt-title">Título <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input id="mkt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mix de single 'Tarde de Quinta'" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mkt-briefing">Briefing *</Label>
            <Textarea
              id="mkt-briefing"
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="O que precisa ser feito, estilo, contexto, faixa que vamos usar..."
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">Mínimo 10 caracteres.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mkt-deadline">Prazo desejado</Label>
              <Input id="mkt-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-budget">Orçamento aproximado</Label>
              <Input id="mkt-budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="R$ 500 – 800" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mkt-ref">Link de referência</Label>
            <Input id="mkt-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="YouTube, Spotify, Drive..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || briefing.trim().length < 10}>
            {saving ? "Enviando..." : "Enviar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
