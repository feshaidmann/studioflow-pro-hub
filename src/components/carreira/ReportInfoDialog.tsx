import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunityKind: "edital" | "palco";
  opportunityId: string;
  opportunityTitle?: string;
  /** Chamado após envio bem-sucedido com o motivo selecionado. */
  onSuccess?: (reason: string) => void;
}

const REASONS = [
  { value: "link_broken", label: "Link quebrado ou redireciona para outra coisa" },
  { value: "wrong_deadline", label: "Prazo incorreto ou desatualizado" },
  { value: "wrong_value", label: "Valor / cachê incorreto" },
  { value: "duplicate", label: "Já existe outro igual cadastrado" },
  { value: "outdated", label: "Edital já encerrado / não existe mais" },
  { value: "other", label: "Outro" },
];

export default function ReportInfoDialog({ open, onOpenChange, opportunityKind, opportunityId, opportunityTitle, onSuccess }: Props) {
  const [reason, setReason] = useState("link_broken");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login"); setBusy(false); return; }
    const { error } = await supabase.from("opportunity_reports").insert({
      user_id: user.id,
      opportunity_kind: opportunityKind,
      opportunity_id: opportunityId,
      reason,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Obrigado! O time vai revisar.");
    onSuccess?.(reason);
    setComment(""); setReason("link_broken");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar informação errada</DialogTitle>
          <DialogDescription>
            {opportunityTitle ? `Sobre "${opportunityTitle}". ` : ""}Nos ajude a manter a base limpa.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-2 py-1">
              <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
              <Label htmlFor={`reason-${r.value}`} className="text-sm cursor-pointer">{r.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="space-y-1">
          <Label className="text-xs">Comentário (opcional)</Label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Detalhes que ajudem a corrigir..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
