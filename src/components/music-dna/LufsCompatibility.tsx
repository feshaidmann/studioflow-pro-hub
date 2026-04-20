import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LUFS_TARGETS } from "@/types/musicDna";

export function LufsCompatibility({ lufs }: { lufs: number }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Compatibilidade de loudness
      </p>
      {Object.entries(LUFS_TARGETS).map(([platform, target]) => {
        const diff = lufs - target;
        const status = Math.abs(diff) <= 1.5 ? "ok" : Math.abs(diff) <= 3 ? "warn" : "error";
        const Icon = status === "ok" ? CheckCircle2 : status === "warn" ? AlertCircle : XCircle;
        return (
          <div key={platform} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2">
              <Icon className={status === "ok" ? "h-3.5 w-3.5 text-success" : status === "warn" ? "h-3.5 w-3.5 text-warning" : "h-3.5 w-3.5 text-destructive"} />
              {platform}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              meta {target} LUFS
              <Badge variant="outline" className="font-mono text-[10px]">
                {diff > 0 ? "+" : ""}{diff.toFixed(1)}
              </Badge>
            </span>
          </div>
        );
      })}
    </div>
  );
}