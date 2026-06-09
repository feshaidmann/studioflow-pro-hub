import { useState } from "react";
import { Sparkles, Loader2, Send, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Opportunity } from "./types";
import { editalToOpportunity, palcoToOpportunity } from "./types";
import type { Edital } from "@/hooks/useEditais";
import type { PalcoCurado } from "@/hooks/usePalcos";

const EXAMPLES_BY_TIPO: Record<string, string[]> = {
  edital: [
    "Editais de fomento para EP de música independente",
    "Bolsas para produção musical no Sudeste",
    "Editais nacionais com inscrições abertas",
  ],
  palco: [
    "Festivais de MPB com inscrições abertas em SP",
    "Showcases para artistas independentes",
    "Residências e palcos no Nordeste",
  ],
};

interface Props {
  onResults: (results: Opportunity[], summary: string) => void;
  projectId?: string | null;
  /** Restringe os exemplos e (futuramente) o escopo da busca. */
  tipo?: "edital" | "palco";
  /** Quantidade atual de resultados IA (para alternar p/ modo compacto). */
  resultsCount?: number;
  /** Limpa resultados (modo compacto). */
  onClear?: () => void;
}

/**
 * Hero de busca IA. Em modo "hero" (sem resultados) ocupa largura total com
 * placeholder + exemplos. Em modo "compacto" (já tem resultados) vira uma
 * linha enxuta com botão "Nova busca".
 */
export default function AISearchPanel({
  onResults,
  projectId,
  tipo,
  resultsCount = 0,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const compact = resultsCount > 0 && !expanded;
  const examples = tipo ? EXAMPLES_BY_TIPO[tipo] : EXAMPLES_BY_TIPO.palco;

  async function handleSearch() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("oportunidades-search", {
        body: { query: q, project_id: projectId || null, tipo: tipo || null },
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
      setExpanded(false);
    } catch (err: unknown) {
      console.error("AI search error:", err);
      const msg = err instanceof Error ? err.message : "Erro ao buscar com IA";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className="rounded-[0.875rem] border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-accent/[0.04] px-3 py-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-foreground flex-1 truncate">
          {resultsCount} resultado(s) da busca por IA
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown className="h-3.5 w-3.5 mr-1" /> Nova busca
        </Button>
        {onClear && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onClear}
            aria-label="Limpar resultados da IA"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[0.875rem] border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/60 to-accent/[0.04] backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-[0.6rem] bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">Busca com IA</h3>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Descreva o que procura — a IA resume e justifica cada resultado.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] ml-auto hidden sm:inline-flex">
          beta
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tipo === "edital"
              ? "Ex: editais de fomento musical com prazo aberto…"
              : tipo === "palco"
                ? "Ex: festivais de MPB no Sul com inscrições abertas…"
                : "O que você procura?"
          }
          className="h-10 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="h-10">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Buscando…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1.5" /> Buscar
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {examples.map((ex) => (
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
