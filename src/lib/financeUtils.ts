export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pctChange(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

/**
 * Converte uma data ISO (YYYY-MM-DD) para Date no meio-dia local,
 * evitando deslocamento de fuso horário ao formatar.
 */
export function parseLocalDate(date: string): Date {
  return new Date(date + "T12:00:00");
}

/**
 * Rótulo amigável de categoria, expandindo "Outros (custom)" quando aplicável.
 */
export function formatCategoryLabel(
  category: string,
  customCategory?: string | null,
): string {
  if (category === "Outros" && customCategory && customCategory.trim()) {
    return `Outros (${customCategory})`;
  }
  return category;
}

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];
