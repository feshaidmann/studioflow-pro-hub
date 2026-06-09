import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import OpportunityFilters, { type CarreiraFilters } from "./OpportunityFilters";

interface Props {
  filters: CarreiraFilters;
  onChange: (next: CarreiraFilters) => void;
  /** Quantos filtros avançados estão ativos. */
  activeCount?: number;
  /** Restringe campos exibidos ao tipo da sub-aba atual. */
  tipoContext?: "edital" | "palco";
}

export default function AdvancedFiltersSheet({ filters, onChange, activeCount = 0, tipoContext }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <ListFilter className="h-3.5 w-3.5" />
          Mais filtros
          {activeCount > 0 && (
            <span className="text-[10px] rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] overflow-y-auto">
        <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
        <div className="mt-4">
          <OpportunityFilters filters={filters} onChange={onChange} tipoContext={tipoContext} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
