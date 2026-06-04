import { BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/financeUtils";

interface DataPoint {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export function EvolutionChart({ data }: { data: DataPoint[] }) {
  const isEmpty = data.every((d) => d.receitas === 0 && d.despesas === 0);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          Evolução financeira — últimos 6 meses (pagas)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <BarChart2 className="h-10 w-10 opacity-20" />
            <p className="text-sm">Sem dados para exibir. Adicione transações pagas.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(348 83% 60%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(348 83% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(260 10% 55%)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(260 10% 55%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(260 15% 8%)", border: "1px solid hsl(260 15% 16%)", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: number) => [formatCurrency(value)]}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#gReceitas)" dot={false} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(348 83% 60%)" strokeWidth={2} fill="url(#gDespesas)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
