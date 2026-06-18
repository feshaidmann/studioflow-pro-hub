import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GENRE_OPTIONS } from "@/constants/genreOptions";

export type TipoFiltro = "todos" | "edital" | "palco";
export type StatusFiltro = "todos" | "Aberto" | "Encerrado" | "Indefinido" | "Previsto";
export type DeadlineWindow = "todos" | "7d" | "30d" | "90d";

export interface CarreiraFilters {
  tipo: TipoFiltro;
  status: StatusFiltro;
  estado: string;
  query: string;
  genero: string;
  hideClosed: boolean;
  deadline: DeadlineWindow;
}

export const DEFAULT_FILTERS: CarreiraFilters = {
  tipo: "todos",
  status: "todos",
  estado: "todos",
  query: "",
  genero: "todos",
  hideClosed: true,
  deadline: "todos",
};

const ESTADOS_BR = [
  "todos","Nacional","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  filters: CarreiraFilters;
  onChange: (next: CarreiraFilters) => void;
  className?: string;
  /** Quando definido, oculta filtros não-aplicáveis (ex: gênero só em palcos). */
  tipoContext?: "edital" | "palco";
}

export default function OpportunityFilters({ filters, onChange, className, tipoContext }: Props) {
  const update = <K extends keyof CarreiraFilters>(key: K, value: CarreiraFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const showGenero = tipoContext !== "edital";
  const clear = () => onChange({ ...DEFAULT_FILTERS, tipo: filters.tipo, genero: showGenero ? DEFAULT_FILTERS.genero : filters.genero });
  const hasActive =
    filters.status !== "todos" ||
    filters.estado !== "todos" ||
    (showGenero && filters.genero !== "todos") ||
    filters.deadline !== "todos" ||
    !filters.hideClosed ||
    !!filters.query;

  return (
    <aside className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          Filtros
        </div>
        {hasActive && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clear}>
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <Label className="text-xs mb-1.5 block">Buscar</Label>
          <Input
            placeholder="Nome, órgão, cidade…"
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="hide-closed" className="text-sm font-normal cursor-pointer">
            Ocultar encerrados
          </Label>
          <Switch
            id="hide-closed"
            checked={filters.hideClosed}
            onCheckedChange={(c) => update("hideClosed", c)}
          />
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">Prazo</Label>
          <Select value={filters.deadline} onValueChange={(v) => update("deadline", v as DeadlineWindow)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer prazo</SelectItem>
              <SelectItem value="7d">Próximos 7 dias</SelectItem>
              <SelectItem value="30d">Próximos 30 dias</SelectItem>
              <SelectItem value="90d">Próximos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">Status</Label>
          <Select value={filters.status} onValueChange={(v) => update("status", v as StatusFiltro)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Previsto">Previsto</SelectItem>
              <SelectItem value="Indefinido">Indefinido</SelectItem>
              <SelectItem value="Encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">Estado</Label>
          <Select value={filters.estado} onValueChange={(v) => update("estado", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS_BR.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf === "todos" ? "Todos" : uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showGenero && (
          <div>
            <Label className="text-xs mb-1.5 block">Gênero (palcos)</Label>
            <Select value={filters.genero} onValueChange={(v) => update("genero", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {GENRE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </aside>
  );
}
