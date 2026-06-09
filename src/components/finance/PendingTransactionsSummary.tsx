import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, parseLocalDate } from "@/lib/financeUtils";
import type { Transaction } from "@/data/mockData";

function PendingList({
  transactions,
  type,
  label,
  colorClass,
  emptyMsg,
}: {
  transactions: Transaction[];
  type: "income" | "expense";
  label: string;
  colorClass: string;
  emptyMsg: string;
}) {
  const items = transactions
    .filter((t) => t.type === type && !t.paid)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className={`h-4 w-4 ${colorClass}`} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyMsg}</p>
        ) : (
          <Table>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {parseLocalDate(t.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm">{t.description}</TableCell>
                  <TableCell className={`text-right font-mono-nums font-semibold ${colorClass}`}>
                    {formatCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingTransactionsSummary({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PendingList
        transactions={transactions}
        type="income"
        label="A receber (receitas pendentes)"
        colorClass="text-success"
        emptyMsg="Nenhuma receita pendente"
      />
      <PendingList
        transactions={transactions}
        type="expense"
        label="A pagar (despesas pendentes)"
        colorClass="text-destructive"
        emptyMsg="Nenhuma despesa pendente"
      />
    </div>
  );
}
