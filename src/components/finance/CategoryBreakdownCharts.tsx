import { PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
} from "recharts";
import { CHART_COLORS, formatCurrency } from "@/lib/financeUtils";

interface CategoryItem {
  name: string;
  total: number;
  type: string;
}

function CategoryPie({
  data,
  label,
  colorClass,
  emptyMsg,
}: {
  data: CategoryItem[];
  label: string;
  colorClass: string;
  emptyMsg: string;
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PieChartIcon className={`h-4 w-4 ${colorClass}`} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyMsg}</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "hsl(260 15% 8%)", border: "1px solid hsl(260 15% 16%)", borderRadius: "8px", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 w-full">
              {data.slice(0, 6).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate text-muted-foreground">{cat.name}</span>
                  </div>
                  <span className={`font-mono-nums font-semibold ${colorClass} shrink-0`}>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  categoryIncome: CategoryItem[];
  categoryExpense: CategoryItem[];
}

export function CategoryBreakdownCharts({ categoryIncome, categoryExpense }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CategoryPie
        data={categoryIncome}
        label="Receitas por categoria"
        colorClass="text-success"
        emptyMsg="Sem receitas no período"
      />
      <CategoryPie
        data={categoryExpense}
        label="Despesas por categoria"
        colorClass="text-destructive"
        emptyMsg="Sem despesas no período"
      />
    </div>
  );
}
