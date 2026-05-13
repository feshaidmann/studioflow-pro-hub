import type { Opportunity } from "./types";

/** Monta uma busca no Google quando o link oficial está quebrado/desconhecido. */
export function buildGoogleFallbackUrl(op: Pick<Opportunity, "titulo" | "organizador" | "tipo">): string {
  const tipoTermo = op.tipo === "edital" ? "edital" : "palco festival";
  const q = [op.titulo, op.organizador, tipoTermo].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function isLinkBroken(op: Pick<Opportunity, "linkStatus">): boolean {
  return op.linkStatus === "broken";
}

export function formatLinkChecked(op: Pick<Opportunity, "linkCheckedAt">): string | null {
  if (!op.linkCheckedAt) return null;
  try {
    const d = new Date(op.linkCheckedAt);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch { return null; }
}
