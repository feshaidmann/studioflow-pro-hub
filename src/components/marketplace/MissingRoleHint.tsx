import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, Clock, X } from "lucide-react";
import { MarketplaceSheet } from "./MarketplaceSheet";
import { toast } from "sonner";
import type { DismissMode } from "@/hooks/useDismissedHints";

interface Props {
  specialty: string;
  projectId?: string;
  genre?: string;
  onDismiss?: (specialty: string, mode: DismissMode) => Promise<void> | void;
}

/**
 * Card contextual no projeto sugerindo o marketplace quando falta um papel.
 * Ex: "Falta um Mix Engineer — ver profissionais disponíveis"
 */
export function MissingRoleHint({ specialty, projectId, genre, onDismiss }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSnooze = async () => {
    setBusy(true);
    await onDismiss?.(specialty, "snooze");
    setBusy(false);
    toast.success(`Lembraremos sobre "${specialty}" em 3 dias.`);
  };

  const handlePermanent = async () => {
    setBusy(true);
    await onDismiss?.(specialty, "permanent");
    setBusy(false);
    toast.success("Sugestão removida deste projeto.");
  };

  return (
    <>
      <div className="rounded-[14px] border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Falta um {specialty} para este projeto</p>
            <p className="text-xs text-muted-foreground">
              Veja profissionais disponíveis no marketplace e peça orçamentos.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setOpen(true)}>
            Ver <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {onDismiss && (
          <div className="flex items-center justify-end gap-1 pl-12">
            {confirming ? (
              <>
                <span className="text-[11px] text-muted-foreground mr-1">
                  Não sugerir mais neste projeto?
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[11px] px-2"
                  onClick={handlePermanent}
                  disabled={busy}
                >
                  Confirmar
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  onClick={handleSnooze}
                  disabled={busy}
                >
                  <Clock className="h-3 w-3" />
                  Lembrar em 3 dias
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirming(true)}
                  disabled={busy}
                >
                  <X className="h-3 w-3" />
                  Desconsiderar
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <MarketplaceSheet
        open={open}
        onOpenChange={setOpen}
        initialSpecialty={specialty}
        initialGenre={genre}
        projectId={projectId}
      />
    </>
  );
}
