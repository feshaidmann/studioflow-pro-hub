import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/financeUtils";
import type { PendingFee } from "@/hooks/useFinancialData";

export function PendingFeesCard({ fees }: { fees: PendingFee[] }) {
  if (fees.length === 0) return null;

  return (
    <Card className="glass-card border-warning/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          Pagamentos pendentes por colaborador
          <Badge variant="secondary" className="text-[11px]">{fees.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {fees.map((pf) => (
          <div
            key={`${pf.name}-${pf.projectName}`}
            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium">{pf.name}</span>
              {pf.role && <span className="text-muted-foreground"> · {pf.role}</span>}
              <span className="text-muted-foreground"> · {pf.projectName}</span>
            </div>
            <span className="font-mono-nums font-semibold text-warning shrink-0">
              {formatCurrency(pf.fee)}
            </span>
          </div>
        ))}
        <div className="pt-1 border-t border-border/40 flex justify-between text-xs px-2">
          <span className="text-muted-foreground font-medium">Total pendente</span>
          <span className="font-mono-nums font-bold text-warning">
            {formatCurrency(fees.reduce((s, f) => s + f.fee, 0))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
