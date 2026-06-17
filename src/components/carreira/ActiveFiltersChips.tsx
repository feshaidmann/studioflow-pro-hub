import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CarreiraFilters } from "./OpportunityFilters";
import { DEFAULT_FILTERS } from "./OpportunityFilters";

const TIPO_LABEL: Record<string, string> = { edital: "Editais", palco: "Palcos" };
const DEADLINE_LABEL: Record<string, string> = { "7d": "Próx. 7 dias", "30d": "Próx. 30 dias", "90d": "Próx. 90 dias" };

interface Props {
  filters: CarreiraFilters;
  onChange: (next: CarreiraFilters) => void;
  className?: string;
  /** Quando "edital", chip de gênero é omitido (filtro não se aplica a editais). */
  tipoContext?: "edital" | "palco";
}

export default function ActiveFiltersChips({ filters, onChange, className, tipoContext }: Props) {
  const chips: { key: keyof CarreiraFilters; label: string }[] = [];
  // tipo é controlado pelas sub-abas — não exibimos como chip.
  void TIPO_LABEL;
  if (filters.status !== "todos") chips.push({ key: "status", label: filters.status });
  if (filters.estado !== "todos") chips.push({ key: "estado", label: filters.estado });
  if (tipoContext !== "edital" && filters.genero !== "todos") chips.push({ key: "genero", label: `Gênero: ${filters.genero}` });
  if (filters.deadline !== "todos") chips.push({ key: "deadline", label: DEADLINE_LABEL[filters.deadline] });
  if (!filters.hideClosed) chips.push({ key: "hideClosed", label: "Inclui encerrados" });
  if (filters.query) chips.push({ key: "query", label: `“${filters.query}”` });

  if (chips.length === 0) return null;

  const removeOne = (k: keyof CarreiraFilters) => {
    onChange({ ...filters, [k]: DEFAULT_FILTERS[k] } as CarreiraFilters);
  };

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className || ""}`}>
      {chips.map((c) => (
        <Badge
          key={c.key}
          variant="outline"
          className="text-[11px] gap-1 pl-2 pr-1 py-0.5 bg-card/60"
        >
          {c.label}
          <button
            onClick={() => removeOne(c.key)}
            className="rounded-full hover:bg-muted p-0.5"
            aria-label={`Remover filtro ${c.label}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[11px] px-2"
        onClick={() => onChange({ ...DEFAULT_FILTERS })}
      >
        Limpar tudo
      </Button>
    </div>
  );
}
