import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/data/mockData";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterMonth: string;
  onFilterMonthChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  filterProject: string;
  onFilterProjectChange: (v: string) => void;
  projects: Project[];
  months: string[];
  filteredCount: number;
  onExport: () => void;
}

export function TransactionFilters({
  search, onSearchChange,
  filterMonth, onFilterMonthChange,
  filterType, onFilterTypeChange,
  filterStatus, onFilterStatusChange,
  filterProject, onFilterProjectChange,
  projects, months, filteredCount, onExport,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por descrição ou categoria..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={filterMonth} onValueChange={onFilterMonthChange}>
        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Mês atual</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
          {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filterType} onValueChange={onFilterTypeChange}>
        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          <SelectItem value="income">Receita</SelectItem>
          <SelectItem value="expense">Despesa</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          <SelectItem value="paid">Pago</SelectItem>
          <SelectItem value="pending">Pendente</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterProject} onValueChange={onFilterProjectChange}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos projetos</SelectItem>
          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3 gap-1.5 shrink-0"
        disabled={filteredCount === 0}
        onClick={onExport}
        title={`Exportar ${filteredCount} transações como CSV`}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Exportar CSV</span>
      </Button>
    </div>
  );
}
