import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Opportunity } from "./types";
import { editalToOpportunity, palcoToOpportunity } from "./types";
import type { Edital } from "@/hooks/useEditais";
import type { PalcoCurado } from "@/hooks/usePalcos";

const EXAMPLES = [
  "Festivais de MPB com inscrições abertas em SP",
  "Editais de fomento à música no Nordeste 2026",
  "Showcases para artistas independentes",
  "Bolsas para produção de EP e residências musicais",
];

interface Props {
  onResults: (results: Opportunity[], summary: string) => void;
  projectId?: string | null;
}

/**
 * Hero de busca IA do módulo Carreira. Renderiza em largura total,
 * acima da grade — para que seja a primeira ação visível na jornada.
 */
export default function AISearchPanel({ onResults, projectId }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("oportunidades-search", {
        body: { query: q, project_id: projectId || null },
      });
      if (error) throw error;

      const editais = (data?.editais as Edital[] | undefined) ?? [];
      const palcos = (data?.palcos as PalcoCurado[] | undefined) ?? [];

      const merged: Opportunity[] = [
        ...editais.map((e) => editalToOpportunity({ ...e, id: undefined } as Edital)),
        ...palcos.map((p) => palcoToOpportunity(p, "ai")),
      ];

      if (merged.length === 0) {
        toast.info("Nenhuma oportunidade encontrada para essa busca.");
      }
      onResults(merged, String(data?.summary || ""));
    } catch (err: any) {
      console.error("AI search error:", err);
      toast.error(err.message || "Erro ao buscar com IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[0.875rem] border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Busca inteligente</h3>
        <Badge variant="outline" className="text-[10px] ml-auto hidden sm:inline-flex">
          IA · gera resumo e justifica cada resultado
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O que você procura? Ex: festivais de MPB no Sul…"
          className="h-10 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          size="default"
          className="h-10 sm:w-auto"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Buscando…</>
          ) : (
            <><Send className="h-4 w-4 mr-1.5" /> Buscar</>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setQuery(ex)}
            className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
