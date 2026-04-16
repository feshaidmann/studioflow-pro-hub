import { useEffect, useState } from "react";
import { Clock, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRateLimitDialog } from "@/hooks/useRateLimitDialog";
import { useNavigate } from "react-router-dom";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "agora";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const remH = h % 24;
    return `${d}d ${remH}h`;
  }
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function RateLimitDialog() {
  const { info, close } = useRateLimitDialog();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!info) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [info]);

  if (!info) return null;

  const resetsAt = new Date(info.resets_at).getTime();
  const remaining = resetsAt - now;
  const isDaily = info.limit_type === "daily";
  const percent = Math.min(100, Math.round((info.used / info.limit) * 100));

  const handleViewGallery = () => {
    close();
    navigate("/criativo?tab=gallery");
  };

  return (
    <Dialog open={!!info} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <DialogTitle>Limite de gerações atingido</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {info.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{isDaily ? "Hoje" : "Esta semana"}</span>
              <span className="font-mono">{info.used} / {info.limit}</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>

          <div className="rounded-lg border bg-muted/40 px-3 py-2.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reseta em</span>
            <span className="text-sm font-semibold tabular-nums">{formatCountdown(remaining)}</span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enquanto isso</p>
            <ul className="text-sm space-y-1 text-foreground/80">
              <li>• Refine os prompts dos próximos lotes</li>
              <li>• Use as artes já geradas na sua galeria</li>
              <li>• {isDaily ? "Volte amanhã às 00h (BRT)" : "O contador semanal reabre no domingo"}</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={close}>Fechar</Button>
          <Button onClick={handleViewGallery}>
            <ImageIcon className="h-4 w-4 mr-1.5" />
            Ver Galeria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
