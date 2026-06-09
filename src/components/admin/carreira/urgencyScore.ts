export interface ScoredRow {
  id: string;
  link_status?: string | null;
  link?: string | null;
  prazo?: string | null;
  resumo?: string | null;
  valor?: string | null;
  publico_alvo?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface UrgencyResult {
  score: number;
  reasons: Array<{ key: string; label: string; weight: number }>;
}

export function computeUrgency(row: ScoredRow): UrgencyResult {
  const reasons: UrgencyResult["reasons"] = [];

  if (row.status === "pendente_revisao") {
    reasons.push({ key: "pending", label: "Aguardando revisão", weight: 5 });
  }
  if (row.link_status === "broken") {
    reasons.push({ key: "broken", label: "Link quebrado", weight: 4 });
  } else if (!row.link || String(row.link).trim() === "") {
    reasons.push({ key: "no-link", label: "Sem link", weight: 3 });
  }
  if (row.prazo) {
    const d = new Date(row.prazo + "T12:00:00-03:00");
    if (!isNaN(d.getTime()) && d < new Date()) {
      reasons.push({ key: "expired", label: "Prazo vencido", weight: 3 });
    }
  } else {
    reasons.push({ key: "no-deadline", label: "Sem prazo", weight: 2 });
  }
  if (!row.resumo || String(row.resumo).trim().length < 20) {
    reasons.push({ key: "no-summary", label: "Sem resumo IA", weight: 2 });
  }
  if (!row.valor || String(row.valor).trim() === "") {
    reasons.push({ key: "no-value", label: "Sem valor", weight: 1 });
  }
  if (row.publico_alvo !== undefined && (!row.publico_alvo || String(row.publico_alvo).trim() === "")) {
    reasons.push({ key: "no-audience", label: "Sem público-alvo", weight: 1 });
  }

  const score = reasons.reduce((s, r) => s + r.weight, 0);
  return { score, reasons };
}

export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
