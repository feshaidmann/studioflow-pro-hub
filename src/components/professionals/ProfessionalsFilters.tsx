import { Search, X, Star, Briefcase, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type StatusFilter = "all" | "active" | "inactive";

interface Props {
  search: string; onSearchChange: (v: string) => void;
  status: StatusFilter; onStatusChange: (v: StatusFilter) => void;
  favorite: boolean; onFavoriteChange: (v: boolean) => void;
  allocated: boolean; onAllocatedChange: (v: boolean) => void;
  specialty: string; onSpecialtyChange: (v: string) => void;
  specialties: string[];
  total: number; filtered: number;
  onClear: () => void;
  hasActive: boolean;
}

export function ProfessionalsFilters(p: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={p.search}
            onChange={(e) => p.onSearchChange(e.target.value)}
            placeholder="Buscar por nome, e-mail ou especialidade..."
            className="h-9 pl-8 pr-8 text-sm"
          />
          {p.search && (
            <button onClick={() => p.onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Badge variant="secondary">{p.filtered}</Badge>
          {p.filtered !== p.total && <span>de {p.total}</span>}
          <span>contato{p.filtered !== 1 ? "s" : ""}</span>
          {p.hasActive && (
            <button onClick={p.onClear} className="ml-1 flex items-center gap-1 text-primary hover:text-primary/80 font-medium">
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-7 rounded-md border border-border overflow-hidden text-xs">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => p.onStatusChange(s)}
              className={`px-2.5 transition-colors ${p.status === s ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
            >
              {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>

        <button
          onClick={() => p.onFavoriteChange(!p.favorite)}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs transition-colors ${p.favorite ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          <Star className="h-3.5 w-3.5" /> Favoritos
        </button>

        <button
          onClick={() => p.onAllocatedChange(!p.allocated)}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs transition-colors ${p.allocated ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          <Briefcase className="h-3.5 w-3.5" /> Em projeto ativo
        </button>

        {p.specialties.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs transition-colors ${p.specialty !== "all" ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {p.specialty === "all" ? "Todas especialidades" : p.specialty}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Especialidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => p.onSpecialtyChange("all")}>
                {p.specialty === "all" && <Check className="h-3.5 w-3.5 mr-1.5" />}
                <span className={p.specialty === "all" ? "" : "ml-5"}>Todas</span>
              </DropdownMenuItem>
              {p.specialties.map((s) => (
                <DropdownMenuItem key={s} onClick={() => p.onSpecialtyChange(s)}>
                  {p.specialty === s && <Check className="h-3.5 w-3.5 mr-1.5" />}
                  <span className={p.specialty === s ? "" : "ml-5"}>{s}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
