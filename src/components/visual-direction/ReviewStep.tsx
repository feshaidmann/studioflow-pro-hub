import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VisualBriefing, CopyOption } from "./types";

interface Props {
  briefing: VisualBriefing;
  onRemoveImage: (id: string) => void;
  onSave: (data: { approved_copy: string; designer_notes: string }) => Promise<void>;
  onBack: () => void;
  saving?: boolean;
}

export default function ReviewStep({ briefing, onRemoveImage, onSave, onBack, saving }: Props) {
  const selected = (briefing.generated_images ?? []).filter((i) => i.selected);
  const palette = briefing.generated_palette;
  const initialCopy = useMemo<CopyOption | undefined>(() => briefing.copy_options?.[0], [briefing.copy_options]);
  const [copy, setCopy] = useState(briefing.approved_copy || initialCopy?.text || "");
  const [notes, setNotes] = useState(briefing.designer_notes || "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isUnchangedFromOriginal = briefing.copy_options?.some((c) => c.text.trim() === copy.trim());

  const handleNext = () => {
    if (isUnchangedFromOriginal) setConfirmOpen(true);
    else void onSave({ approved_copy: copy, designer_notes: notes });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Imagens aprovadas ({selected.length})</Label>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma referência selecionada. Volte e escolha pelo menos uma.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((img) => (
              <div key={img.id} className="relative w-24 h-24 rounded-md overflow-hidden border border-border group">
                <img src={img.url} alt={`Referência de estilo — ${img.style_tag}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(img.id)}
                  aria-label={`Remover referência ${img.style_tag}`}
                  className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                  <p className="text-[9px] text-white truncate">{img.style_tag}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {palette?.colors?.length > 0 && (
        <div className="space-y-2">
          <Label>Paleta sugerida</Label>
          <div className="flex flex-wrap gap-2">
            {palette.colors.map((hex) => (
              <div key={hex} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-md border border-border" style={{ backgroundColor: hex }} aria-label={hex} />
                <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
              </div>
            ))}
          </div>
          {palette.rationale && <p className="text-xs text-muted-foreground italic">{palette.rationale}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="approved-copy">Copy aprovada (edite à vontade)</Label>
        <Textarea id="approved-copy" rows={4} value={copy} onChange={(e) => setCopy(e.target.value)} />
        {briefing.copy_options?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-muted-foreground">Usar sugestão:</span>
            {briefing.copy_options.map((c) => (
              <button key={c.id} type="button" onClick={() => setCopy(c.text)}
                className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">
                {c.id} · {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="designer-notes">Notas para o designer <span className="text-xs text-muted-foreground">(opcional)</span></Label>
        <Textarea id="designer-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Restrições, prazos, formatos finais desejados, faixas a evitar…" />
      </div>

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
        <Button size="sm" onClick={handleNext} disabled={selected.length === 0 || saving || !copy.trim()}>
          {saving ? "Salvando…" : "Gerar briefing →"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usar a copy gerada sem editar?</AlertDialogTitle>
            <AlertDialogDescription>
              A copy aprovada está idêntica à sugestão da IA. Recomendamos personalizar com a sua voz antes de enviar ao designer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Editar antes</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); void onSave({ approved_copy: copy, designer_notes: notes }); }}>
              Usar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
