import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight } from "lucide-react";
import { MarketplaceSheet } from "./MarketplaceSheet";

interface Props {
  specialty: string;
  projectId?: string;
  genre?: string;
}

/**
 * Card contextual no projeto sugerindo o marketplace quando falta um papel.
 * Ex: "Falta um Mix Engineer — ver profissionais disponíveis"
 */
export function MissingRoleHint({ specialty, projectId, genre }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="rounded-[14px] border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Falta um {specialty} para este projeto</p>
          <p className="text-xs text-muted-foreground">Veja profissionais disponíveis no marketplace e peça orçamentos.</p>
        </div>
        <Button size="sm" variant="ghost" className="gap-1" onClick={() => setOpen(true)}>
          Ver <ChevronRight className="h-3.5 w-3.5" />
        </Button>
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
