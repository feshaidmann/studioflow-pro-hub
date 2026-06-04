import { BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/financeUtils";

interface CashFlowRow {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export function CashFlowTable({ data }: { data: CashFlowRow[] }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          Fluxo de caixa — últimos 6 meses
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right text-success">Entradas</TableHead>
              <TableHead className="text-right text-destructive">Saídas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados no período</TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.mes}>
                  <TableCell className="font-medium">{row.mes}</TableCell>
                  <TableCell className="text-right font-mono-nums text-success">{formatCurrency(row.entradas)}</TableCell>
                  <TableCell className="text-right font-mono-nums text-destructive">{formatCurrency(row.saidas)}</TableCell>
                  <TableCell className={`text-right font-mono-nums font-semibold ${row.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                    {row.saldo >= 0 ? "+" : ""}{formatCurrency(row.saldo)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
