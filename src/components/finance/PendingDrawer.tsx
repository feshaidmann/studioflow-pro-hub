import { Clock } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/financeUtils";
import { PendingFeesCard } from "./PendingFeesCard";
import { PendingTransactionsSummary } from "./PendingTransactionsSummary";
import type { Transaction } from "@/data/mockData";
import type { PendingFee } from "@/hooks/useFinancialData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fees: PendingFee[];
  transactions: Transaction[];
  pendingIncome: number;
  pendingExpense: number;
}

export function PendingDrawer({
  open, onOpenChange, fees, transactions, pendingIncome, pendingExpense,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            Pendências financeiras
          </DrawerTitle>
          <DrawerDescription className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="gap-1">
              A receber <span className="font-mono-nums text-success">{formatCurrency(pendingIncome)}</span>
            </Badge>
            <Badge variant="outline" className="gap-1">
              A pagar <span className="font-mono-nums text-destructive">{formatCurrency(pendingExpense)}</span>
            </Badge>
            {fees.length > 0 && (
              <Badge variant="outline" className="gap-1">
                Colaboradores <span className="font-mono-nums">{fees.length}</span>
              </Badge>
            )}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <PendingFeesCard fees={fees} />
          <PendingTransactionsSummary transactions={transactions} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
