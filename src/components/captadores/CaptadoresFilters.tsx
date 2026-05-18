import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PALCO_TIPOS, PORTE_OPTIONS } from "@/constants/captadorOptions";
import { GENRE_OPTIONS } from "@/constants/genreOptions";
import { BRAZIL_STATES } from "@/constants/brazilStates";
import type { CaptadorFilters } from "@/hooks/useCaptadores";

interface Props {
  filters: CaptadorFilters;
  onChange: (next: CaptadorFilters) => void;
  total: number;
  filtered: number;
}

const ANY = "__any__";

export default function CaptadoresFilters({ filters, onChange, total, filtered }: Props) {
  const update = (patch: Partial<CaptadorFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({});
  const has = !!(filters.search || filters.palcoTipo || filters.genero || filters.regiao || filters.porte || filters.verifiedOnly);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Buscar por nome, cidade, descrição…"
            className="h-9 pl-8 pr-8 text-sm"
          />
          {filters.search && (
            <button onClick={() => update({ search: "" })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Badge variant="secondary">{filtered}</Badge>
          {filtered !== total && <span>de {total}</span>}
          <span>captador{filtered !== 1 ? "es" : ""}</span>
          {has && (
            <button onClick={clear} className="ml-1 flex items-center gap-1 text-primary hover:text-primary/80 font-medium">
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.palcoTipo ?? ANY} onValueChange={(v) => update({ palcoTipo: v === ANY ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Tipo de palco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos os palcos</SelectItem>
            {PALCO_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.genero ?? ANY} onValueChange={(v) => update({ genero: v === ANY ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Gênero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos os gêneros</SelectItem>
            {GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.regiao ?? ANY} onValueChange={(v) => update({ regiao: v === ANY ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos os estados</SelectItem>
            {BRAZIL_STATES.map((s) => <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.porte ?? ANY} onValueChange={(v) => update({ porte: v === ANY ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Porte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Qualquer porte</SelectItem>
            {PORTE_OPTIONS.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <button
          onClick={() => update({ verifiedOnly: !filters.verifiedOnly })}
          className={`h-8 px-2.5 rounded-md border text-xs transition-colors ${filters.verifiedOnly ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          Apenas verificados
        </button>
      </div>
    </div>
  );
}
