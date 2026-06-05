import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useServiceProposals } from "@/hooks/useMarketplace";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import type { InboundRequest } from "@/types/marketplace";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: InboundRequest | null;
  onSuccess?: () => void;
}

export function SubmitProposalModal({ open, onOpenChange, request, onSuccess }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { submitProposal } = useServiceProposals(request?.id);

  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setPrice(""); setDays(""); setMessage(""); }
  }, [open]);

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 10) return;
    setSaving(true);
    const ok = await submitProposal({
      price: Number(price) || 0,
      delivery_days: Number(days) || 0,
      message: message.trim(),
      providerName: profile?.display_name ?? user?.email ?? "",
      providerAvatar: "",
    });
    setSaving(false);
    if (ok) {
      setPrice(""); setDays(""); setMessage("");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar proposta</DialogTitle>
          <DialogDescription>
            Respondendo ao pedido: <span className="font-medium text-foreground">{request.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground line-clamp-3">
            {request.briefing}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prop-price">Valor (R$) <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="prop-price"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="500"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prop-days">Prazo de entrega (dias)</Label>
              <Input
                id="prop-days"
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="7"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prop-msg">Mensagem *</Label>
            <Textarea
              id="prop-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua abordagem, experiência e o que você entregará..."
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">Mínimo 10 caracteres.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || message.trim().length < 10}>
            {saving ? "Enviando..." : "Enviar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
