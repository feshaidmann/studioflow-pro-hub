import { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "./useVisualBriefing";

interface Props {
  status: SaveStatus;
  lastSavedAt: string | null;
  onRetry: () => void;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "agora";
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h} h`;
}

export default function SaveStatus({ status, lastSavedAt, onRetry }: Props) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Salvando…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-destructive">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Falha ao salvar
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[11px]" onClick={onRetry}>
          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Tentar de novo
        </Button>
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" /> Salvo {formatRelative(lastSavedAt)}
      </span>
    );
  }
  return null;
}
