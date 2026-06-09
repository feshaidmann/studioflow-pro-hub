import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, parseLocalDate, formatCategoryLabel } from "@/lib/financeUtils";
import type { Transaction } from "@/data/mockData";

interface Props {
  filtered: Transaction[];
  paginated: Transaction[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  isMobile: boolean;
  hasTransactions: boolean;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  monthLabel: string;
  projectName: (id: string) => string;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function TransactionTable({
  filtered, paginated, page, totalPages, onPageChange,
  isMobile, hasTransactions,
  totalIncome, totalExpense, profit, monthLabel,
  projectName, onEdit, onDelete, onNew,
}: Props) {
  if (filtered.length === 0) {
    return (
      <Card className="glass-card overflow-hidden">
        <div className="py-16 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="rounded-full bg-primary/10 p-4">
            <DollarSign className="h-10 w-10 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">
              {!hasTransactions ? "Nenhuma transação registrada" : "Nenhuma transação encontrada"}
            </p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {!hasTransactions
                ? "Registre receitas e despesas para acompanhar suas finanças."
                : "Tente ajustar os filtros para encontrar suas transações."}
            </p>
          </div>
          {!hasTransactions && (
            <Button className="mt-2" onClick={onNew}>
              <Plus className="h-4 w-4 mr-1" /> Registrar primeira transação
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const categoryLabel = (tx: Transaction) => formatCategoryLabel(tx.category, tx.customCategory);

  return (
    <Card className="glass-card overflow-hidden">
      {isMobile ? (
        <div className="p-3 space-y-2">
          {paginated.map((tx) => (
            <div key={tx.id} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    {tx.projectId ? ` · ${projectName(tx.projectId)}` : ""}
                  </p>
                </div>
                <span className={cn("text-sm font-bold whitespace-nowrap", tx.type === "income" ? "text-success" : "text-destructive")}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{categoryLabel(tx)}</span>
                  {tx.paid ? (
                    <span className="flex items-center gap-0.5 text-success"><CheckCircle2 className="h-3 w-3" /> Pago</span>
                  ) : (
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> Pendente</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(tx.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Projeto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[72px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((tx, i) => (
                <TableRow key={tx.id} className={`transition-colors ${i % 2 === 1 ? "bg-secondary/10" : ""} hover:bg-primary/5`}>
                  <TableCell className="text-xs text-muted-foreground font-mono-nums whitespace-nowrap">
                    {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">{tx.description}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {categoryLabel(tx)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                    {tx.projectId ? (
                      <Link to={`/projects/${tx.projectId}`} className="inline-flex" title="Abrir projeto">
                        <Badge variant="secondary" className="text-xs hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer">
                          {projectName(tx.projectId)}
                        </Badge>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono-nums font-bold whitespace-nowrap">
                    <span className={tx.type === "income" ? "text-success" : "text-destructive"}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {tx.paid ? (
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium hidden sm:inline">Pago</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium hidden sm:inline">Pendente</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(tx.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer: totals + pagination */}
      <div className="border-t border-border bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"}
            {totalPages > 1 && ` · pág. ${page}/${totalPages}`}
            {" "}· {monthLabel}
          </span>
          <div className="flex gap-4 font-mono-nums font-semibold">
            <span className="text-success">+{formatCurrency(totalIncome)}</span>
            <span className="text-destructive">-{formatCurrency(totalExpense)}</span>
            <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
              = {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
            </span>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 px-4 pb-3">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => onPageChange(1)}>«</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => onPageChange(page - 1)}>‹ Anterior</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`e-${idx}`} className="px-1 text-muted-foreground text-xs">…</span>
                ) : (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => onPageChange(p as number)}>{p}</Button>
                )
              )}
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Próxima ›</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>»</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
