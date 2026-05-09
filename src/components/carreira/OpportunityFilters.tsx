import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TipoFiltro = "todos" | "edital" | "palco";
export type StatusFiltro = "todos" | "Aberto" | "Encerrado" | "Indefinido" | "Previsto";

export interface CarreiraFilters {
  tipo: TipoFiltro;
  status: StatusFiltro;
  estado: string;
  query: string;
}

const ESTADOS_BR = [
  "todos","Nacional","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  filters: CarreiraFilters;
  onChange: (next: CarreiraFilters) => void;
  className?: string;
}

export default function OpportunityFilters({ filters, onChange, className }: Props) {
  const update = <K extends keyof CarreiraFilters>(key: K, value: CarreiraFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const clear = () => onChange({ tipo: "todos", status: "todos", estado: "todos", query: "" });
  const hasActive = filters.tipo !== "todos" || filters.status !== "todos" || filters.estado !== "todos" || !!filters.query;

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

        <div>
          <Label className="text-xs mb-2 block">Tipo de oportunidade</Label>
          <RadioGroup
            value={filters.tipo}
            onValueChange={(v) => update("tipo", v as TipoFiltro)}
            className="space-y-1.5"
          >
            {[
              { v: "todos",  l: "Todas" },
              { v: "edital", l: "Editais e fomento" },
              { v: "palco",  l: "Palcos e festivais" },
            ].map((o) => (
              <div key={o.v} className="flex items-center gap-2">
                <RadioGroupItem value={o.v} id={`tipo-${o.v}`} />
                <Label htmlFor={`tipo-${o.v}`} className="text-sm font-normal cursor-pointer">
                  {o.l}
                </Label>
              </div>
            ))}
          </RadioGroup>
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
      </div>
    </aside>
  );
}
