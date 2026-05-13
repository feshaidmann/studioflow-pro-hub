import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  onResults: (results: Opportunity[]) => void;
  projectId?: string | null;
}

export default function AISearchPanel({ onResults, projectId }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [classification, setClassification] = useState<string | null>(null);

  async function handleSearch() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setClassification(null);
    try {
      const { data, error } = await supabase.functions.invoke("oportunidades-search", {
        body: { query: q, project_id: projectId || null },
      });
      if (error) throw error;

      const cls = data?.classification as "edital" | "palco" | "ambos" | undefined;
      setClassification(cls ?? null);

      const editais = (data?.editais as Edital[] | undefined) ?? [];
      const palcos = (data?.palcos as PalcoCurado[] | undefined) ?? [];

      const merged: Opportunity[] = [
        ...editais.map((e) => editalToOpportunity({ ...e, id: undefined } as Edital)),
        ...palcos.map((p) => palcoToOpportunity(p, "ai")),
      ];

      if (merged.length === 0) {
        toast.info("Nenhuma oportunidade encontrada para essa busca.");
      } else {
        toast.success(`${merged.length} oportunidade(s) encontrada(s)`);
      }
      onResults(merged);
    } catch (err: any) {
      console.error("AI search error:", err);
      toast.error(err.message || "Erro ao buscar com IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[0.875rem] border border-border bg-card/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Busca inteligente</h3>
        {classification && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            Detectado: {classification}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Descreva o que procura — a IA mistura editais e palcos automaticamente.
      </p>

      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ex: festivais de música independente abertos no Sul…"
        rows={2}
        className="text-sm resize-none mb-2"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
        }}
      />

      <div className="flex flex-wrap gap-1.5 mb-3">
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

      <Button onClick={handleSearch} disabled={loading || !query.trim()} size="sm" className="w-full">
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Buscando…</>
        ) : (
          <><Send className="h-3.5 w-3.5 mr-1.5" /> Buscar oportunidades</>
        )}
      </Button>
    </div>
  );
}
