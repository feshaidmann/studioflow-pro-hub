import type { TrackViewMode } from "@/contexts/ProfileContext";

export type MainPain = "organization" | "team" | "deadlines" | "finance" | "launch" | string;

export const painLabels: Record<string, string> = {
  organization: "organização",
  team: "equipe",
  deadlines: "prazos",
  finance: "financeiro",
  launch: "lançamento",
};

export const momentLabels: Record<string, string> = {
  idea: "ideia inicial",
  producing: "produção em andamento",
  ready: "música pronta",
  launching: "lançamento",
};

export function getJourneyPlan(mainPain: MainPain, currentMoment = "", trackViewMode: TrackViewMode = "basic") {
  const pain = mainPain || "organization";
  const moment = currentMoment || "producing";
  const simple = trackViewMode === "basic";

  const base = {
    headline: `Seu foco agora é ${painLabels[pain] ?? "organização"}.`,
    reason: `Como seu momento é ${momentLabels[moment] ?? "produção em andamento"}, priorizei o que ajuda você a avançar sem procurar por onde começar.`,
    primaryLabel: "Ver checklist",
    primaryPath: "/dashboard#checklist-section",
    secondaryLabel: "Abrir projeto",
    secondaryPath: "/projects",
    aiPrompt: "Com base no meu onboarding, qual é a próxima melhor ação hoje?",
    sections: simple ? ["checklist", "alerts", "projects", "releases", "finance"] : ["checklist", "alerts", "team", "projects", "editais", "releases", "finance", "transactions"],
  };

  if (pain === "finance") return { ...base, headline: "Seu foco agora é financeiro.", primaryLabel: "Registrar movimentação", primaryPath: "/finance", aiPrompt: "Meu foco principal é financeiro. Revise custos, receitas e próximos passos.", sections: simple ? ["finance", "checklist", "alerts", "projects", "releases"] : ["finance", "transactions", "alerts", "checklist", "projects", "team", "releases", "editais"] };
  if (pain === "team") return { ...base, headline: "Seu foco agora é equipe.", primaryLabel: "Convidar parceiro", primaryPath: "/professionals", aiPrompt: "Meu foco principal é equipe. O que devo alinhar ou delegar agora?", sections: simple ? ["team", "checklist", "projects", "alerts", "releases"] : ["team", "projects", "checklist", "alerts", "finance", "releases", "editais", "transactions"] };
  if (pain === "deadlines") return { ...base, headline: "Seu foco agora é cumprir prazos.", primaryLabel: "Ver alertas", primaryPath: "/dashboard#alerts-section", aiPrompt: "Meu foco principal é prazos. O que está mais urgente e em qual ordem resolver?", sections: simple ? ["alerts", "checklist", "releases", "projects", "finance"] : ["alerts", "checklist", "releases", "projects", "team", "finance", "editais", "transactions"] };
  if (pain === "launch" || moment === "launching" || moment === "ready") return { ...base, headline: "Seu foco agora é lançamento.", primaryLabel: "Analisar faixa", primaryPath: "/music-dna", secondaryLabel: "Ver lançamentos", secondaryPath: "/dashboard#releases-section", aiPrompt: "Meu foco é lançamento. Monte a sequência de ações antes de enviar para as plataformas.", sections: simple ? ["releases", "checklist", "alerts", "projects", "finance"] : ["releases", "checklist", "alerts", "projects", "team", "finance", "editais", "transactions"] };

  return base;
}