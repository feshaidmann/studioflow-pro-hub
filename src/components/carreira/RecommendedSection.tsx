import { useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import OpportunityCard from "./OpportunityCard";
import { editalToOpportunity, palcoToOpportunity, normalize, type Opportunity } from "./types";
import type { Edital } from "@/hooks/useEditais";
import type { PalcoCurado } from "@/hooks/usePalcos";

interface ScoredEdital extends Edital { __score: number }
interface ScoredPalco extends PalcoCurado { score: number }

// +4 if closing in ≤ 7 days, +2 if ≤ 30 days, 0 otherwise
function urgencyBonus(prazo: string | null | undefined): number {
  if (!prazo) return 0;
  try {
    const days = Math.round(
      (new Date(prazo + "T12:00:00-03:00").getTime() - Date.now()) / 86_400_000,
    );
    if (days < 0) return 0;
    if (days <= 7) return 4;
    if (days <= 30) return 2;
    return 0;
  } catch { return 0; }
}

function scoreEdital(e: Edital, perfil: { estado?: string | null; specialties?: string[] }): number {
  let s = 0;
  if (e.status === "Aberto") s += 5;
  else if (e.status === "Previsto") s += 2;
  else if (e.status === "Encerrado") return 0;

  s += urgencyBonus(e.prazo);

  const estado = (e.estado || "").toLowerCase();
  if (perfil.estado) {
    if (estado === "nacional") s += 3;
    else if (estado.includes(perfil.estado.toLowerCase())) s += 6;
  } else if (estado === "nacional") {
    s += 2;
  }

  if (perfil.specialties?.length) {
    const text = normalize(`${e.titulo} ${e.orgao} ${e.area || ""} ${e.resumo || ""} ${e.publico_alvo || ""}`);
    for (const sp of perfil.specialties) {
      if (text.includes(normalize(sp))) s += 2;
    }
  }
  return s;
}

interface Props {
  editais: Edital[];
  palcos: PalcoCurado[];
  perfil: { estado?: string | null; specialties?: string[]; generos?: string[] };
  onOpen: (op: Opportunity) => void;
  onApply: (op: Opportunity) => void;
  isApplied: (op: Opportunity) => boolean;
  pendingKey?: string | null;
}

export default function RecommendedSection({ editais, palcos, perfil, onOpen, onApply, isApplied, pendingKey }: Props) {
  const [expanded, setExpanded] = useState(true);

  const recommended = useMemo<Opportunity[]>(() => {
    const scoredEditais: ScoredEdital[] = editais
      .map((e) => ({ ...e, __score: scoreEdital(e, { estado: perfil.estado, specialties: perfil.specialties }) }))
      .filter((e) => e.__score > 0)
      .sort((a, b) => b.__score - a.__score)
      .slice(0, 3);

    const scoredPalcos: ScoredPalco[] = palcos
      .map((p) => {
        let score = 0;
        if (p.status === "Aberto") score += 5;
        else if (p.status === "Previsto") score += 2;
        else return { ...p, score: 0 };

        score += urgencyBonus(p.prazo);

        if (perfil.generos?.length) {
          const hits = p.generos.filter((g) => perfil.generos!.some((pg) => normalize(pg) === normalize(g))).length;
          score += hits * 8;
        }
        const estado = (p.estado || "").toLowerCase();
        if (perfil.estado) {
          if (estado === "nacional" || !estado) score += 3;
          else if (estado.includes(perfil.estado.toLowerCase())) score += 6;
        }
        if (perfil.specialties?.length) {
          const text = normalize(`${p.nome} ${p.organizador || ""} ${p.resumo || ""}`);
          for (const sp of perfil.specialties) {
            if (text.includes(normalize(sp))) score += 2;
          }
        }
        return { ...p, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return [
      ...scoredEditais.map((e) => editalToOpportunity(e)),
      ...scoredPalcos.map((p) => palcoToOpportunity(p, "curated")),
    ];
  }, [editais, palcos, perfil.estado, perfil.specialties, perfil.generos]);

  if (recommended.length === 0) return null;

  return (
    <section className="rounded-[0.875rem] border border-accent/30 bg-accent/5 p-4 mb-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 mb-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-foreground" />
          <h3 className="text-sm font-semibold">Pra você</h3>
          <span className="text-[11px] text-muted-foreground">
            {recommended.length} oportunidade(s) com seu perfil
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {recommended.map((op) => (
            <OpportunityCard
              key={`reco-${op.tipo}-${op.key}`}
              opportunity={op}
              onClick={onOpen}
              onApply={onApply}
              alreadyApplied={isApplied(op)}
              pending={pendingKey === op.key}
              recommended
            />
          ))}
        </div>
      )}
    </section>
  );
}
