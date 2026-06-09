import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { formatDueDate, deriveNextAction } from "../ProjectOverviewTab";

// Fix "today" to 2026-01-15 for all date-relative tests
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

// ── formatDueDate ─────────────────────────────────────────────────────────────

describe("formatDueDate", () => {
  it("returns null for null input", () => {
    expect(formatDueDate(null)).toBeNull();
  });

  it("returns overdue label for a past date", () => {
    const result = formatDueDate("2026-01-10")!;
    expect(result.label).toBe("5d atraso");
    expect(result.color).toBe("text-destructive");
    expect(result.urgent).toBe(true);
  });

  it("returns 'Hoje' for today's date", () => {
    const result = formatDueDate("2026-01-15")!;
    expect(result.label).toBe("Hoje");
    expect(result.color).toBe("text-warning");
    expect(result.urgent).toBe(true);
  });

  it("returns 'Amanhã' for tomorrow", () => {
    const result = formatDueDate("2026-01-16")!;
    expect(result.label).toBe("Amanhã");
    expect(result.color).toBe("text-warning");
    expect(result.urgent).toBe(true);
  });

  it("returns warning color for dates within 7 days (not today/tomorrow)", () => {
    const result = formatDueDate("2026-01-20")!; // 5 days away
    expect(result.label).toBe("em 5d");
    expect(result.color).toBe("text-warning/80");
    expect(result.urgent).toBe(false);
  });

  it("returns muted color for dates more than 7 days away", () => {
    const result = formatDueDate("2026-02-01")!; // 17 days away
    expect(result.label).toBe("em 17d");
    expect(result.color).toBe("text-muted-foreground");
    expect(result.urgent).toBe(false);
  });

  it("urgent is true for exactly 1 day overdue", () => {
    expect(formatDueDate("2026-01-14")!.urgent).toBe(true);
  });

  it("urgent is false for a far-future date", () => {
    expect(formatDueDate("2026-06-01")!.urgent).toBe(false);
  });
});

// ── deriveNextAction ──────────────────────────────────────────────────────────

describe("deriveNextAction", () => {
  it("returns critical action when there are overdue tasks", () => {
    const result = deriveNextAction([{}], [], [], "mix");
    expect(result.severity).toBe("critical");
    expect(result.tab).toBe("tasks");
    expect(result.label).toContain("1 tarefa");
  });

  it("uses plural form for multiple overdue tasks", () => {
    const result = deriveNextAction([{}, {}], [], [], "mix");
    expect(result.label).toContain("2 tarefas");
  });

  it("returns warning action for pending transactions when no overdue tasks", () => {
    const result = deriveNextAction([], [{}], [], "mix");
    expect(result.severity).toBe("warning");
    expect(result.tab).toBe("finance");
    expect(result.label).toContain("1 pagamento");
  });

  it("uses plural form for multiple pending transactions", () => {
    const result = deriveNextAction([], [{}, {}], [], "mix");
    expect(result.label).toContain("2 pagamentos");
  });

  it("returns first task description when no overdue/pending", () => {
    const tasks = [{ description: "Mixar a faixa principal" }, { description: "Outra tarefa" }];
    const result = deriveNextAction([], [], tasks, "mix");
    expect(result.severity).toBe("info");
    expect(result.tab).toBe("tasks");
    expect(result.label).toBe("Mixar a faixa principal");
  });

  it("returns release prep action for 'upload' stage with no tasks", () => {
    const result = deriveNextAction([], [], [], "upload");
    expect(result.severity).toBe("info");
    expect(result.tab).toBe("release");
    expect(result.label).toBe("Preparar lançamento");
  });

  it("returns release prep action for 'master' stage with no tasks", () => {
    const result = deriveNextAction([], [], [], "master");
    expect(result.tab).toBe("release");
  });

  it("returns advance-stage action as fallback", () => {
    const result = deriveNextAction([], [], [], "mix");
    expect(result.severity).toBe("info");
    expect(result.tab).toBeNull();
    expect(result.label).toBe("Avançar para próxima etapa");
  });

  it("overdue tasks take priority over pending transactions", () => {
    const result = deriveNextAction([{}], [{}], [], "mix");
    expect(result.severity).toBe("critical");
  });

  it("pending transactions take priority over project tasks", () => {
    const result = deriveNextAction([], [{}], [{ description: "Some task" }], "mix");
    expect(result.severity).toBe("warning");
  });
});
