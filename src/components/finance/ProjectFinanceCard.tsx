import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Plus, ArrowRight } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProjectFinanceCardProps {
  projectId: string;
  onNewTransaction: () => void;
  onViewAll: () => void;
}

export default function ProjectFinanceCard({ projectId, onNewTransaction, onViewAll }: ProjectFinanceCardProps) {
  const { getProjectFinancials } = useProjects();
  const { t } = useLanguage();
  const fin = getProjectFinancials(projectId);

  return (
    <Card className="glass-card gradient-border animate-fade-in mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {fin.profit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          {t("finance.projectTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">{t("finance.totalIncome")}</p>
            <p className="font-bold font-mono-nums text-success">R$ {fin.totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("finance.totalExpense")}</p>
            <p className="font-bold font-mono-nums text-destructive">R$ {fin.totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("finance.profitLabel")}</p>
            <p className={`font-bold font-mono-nums ${fin.profit >= 0 ? "text-success" : "text-destructive"}`}>
              {fin.profit >= 0 ? "+" : ""}R$ {fin.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("finance.margin")}</p>
            <p className="font-bold font-mono-nums">
              {fin.margin !== null ? `${fin.margin.toFixed(0)}%` : "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 active:scale-95 transition-transform" onClick={onNewTransaction}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("finance.newTransaction")}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onViewAll}>
            {t("finance.viewAll")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
