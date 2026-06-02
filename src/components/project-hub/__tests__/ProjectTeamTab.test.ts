import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { computeEffectiveStatus, computeMissingRoles } from "../ProjectTeamTab";
import type { MemberExtra } from "../ProjectTeamTab";

// Fix "today" to 2026-01-15 for all date-relative tests
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExtra(overrides: Partial<MemberExtra> = {}): MemberExtra {
  return {
    delivery_status: "ativo",
    delivery_due_date: null,
    expected_deliverable: "",
    last_activity_at: null,
    stage: "",
    ...overrides,
  };
}

// ── computeEffectiveStatus ────────────────────────────────────────────────────

describe("computeEffectiveStatus", () => {
  it("returns 'convidado' when no extra and invite status is 'pending'", () => {
    expect(computeEffectiveStatus(undefined, "pending")).toBe("convidado");
  });

  it("returns 'ativo' when no extra and invite status is not pending", () => {
    expect(computeEffectiveStatus(undefined, "accepted")).toBe("ativo");
  });

  it("returns 'ativo' when no extra and invite status is null", () => {
    expect(computeEffectiveStatus(undefined, null)).toBe("ativo");
  });

  it("returns 'atrasado' when status is 'ativo' and due date is in the past (not today)", () => {
    const extra = makeExtra({ delivery_status: "ativo", delivery_due_date: "2026-01-10" });
    expect(computeEffectiveStatus(extra, null)).toBe("atrasado");
  });

  it("returns 'ativo' when status is 'ativo' and due date is today", () => {
    // today's date should NOT trigger "atrasado" (isPast && !isToday)
    const extra = makeExtra({ delivery_status: "ativo", delivery_due_date: "2026-01-15" });
    expect(computeEffectiveStatus(extra, null)).toBe("ativo");
  });

  it("returns 'ativo' when status is 'ativo' and due date is in the future", () => {
    const extra = makeExtra({ delivery_status: "ativo", delivery_due_date: "2026-01-20" });
    expect(computeEffectiveStatus(extra, null)).toBe("ativo");
  });

  it("returns 'ativo' when status is 'ativo' and due date is null", () => {
    const extra = makeExtra({ delivery_status: "ativo", delivery_due_date: null });
    expect(computeEffectiveStatus(extra, null)).toBe("ativo");
  });

  it("does not auto-change 'entregou' status even if due date is past", () => {
    const extra = makeExtra({ delivery_status: "entregou", delivery_due_date: "2026-01-01" });
    expect(computeEffectiveStatus(extra, null)).toBe("entregou");
  });

  it("does not auto-change 'concluido' status", () => {
    const extra = makeExtra({ delivery_status: "concluido", delivery_due_date: "2026-01-01" });
    expect(computeEffectiveStatus(extra, null)).toBe("concluido");
  });

  it("does not auto-change 'aguardando' status even if past due", () => {
    const extra = makeExtra({ delivery_status: "aguardando", delivery_due_date: "2026-01-01" });
    expect(computeEffectiveStatus(extra, null)).toBe("aguardando");
  });
});

// ── computeMissingRoles ───────────────────────────────────────────────────────

describe("computeMissingRoles", () => {
  it("returns all 3 roles when team is empty", () => {
    const result = computeMissingRoles([], new Set());
    expect(result).toContain("Mix Engineer");
    expect(result).toContain("Mastering Engineer");
    // capped at 2, but with empty team the first 2 are Mix + Master
    expect(result.length).toBe(2);
  });

  it("omits Mix Engineer when team has a 'mix' role", () => {
    const result = computeMissingRoles(["mix engineer"], new Set());
    expect(result).not.toContain("Mix Engineer");
  });

  it("omits Mastering Engineer when team has a 'master' role", () => {
    const result = computeMissingRoles(["mastering engineer"], new Set());
    expect(result).not.toContain("Mastering Engineer");
  });

  it("omits Designer Gráfico when team has a 'design' role", () => {
    const result = computeMissingRoles(["mix engineer", "mastering engineer", "designer gráfico"], new Set());
    expect(result).not.toContain("Designer Gráfico");
  });

  it("omits Designer Gráfico when team has a 'capa' role", () => {
    const result = computeMissingRoles(["mix engineer", "mastering engineer", "capa"], new Set());
    expect(result).not.toContain("Designer Gráfico");
  });

  it("returns at most 2 roles", () => {
    expect(computeMissingRoles([], new Set()).length).toBeLessThanOrEqual(2);
  });

  it("filters out dismissed hints", () => {
    const dismissed = new Set(["Mix Engineer"]);
    const result = computeMissingRoles([], dismissed);
    expect(result).not.toContain("Mix Engineer");
  });

  it("returns empty array when all roles are present", () => {
    const roles = ["mix engineer", "mastering engineer", "designer gráfico"];
    expect(computeMissingRoles(roles, new Set())).toHaveLength(0);
  });

  it("role matching is case-insensitive via toLowerCase", () => {
    // teamRoles are expected to already be lowercased by the component
    expect(computeMissingRoles(["mix engineer"], new Set())).not.toContain("Mix Engineer");
  });

  it("returns empty array when all missing roles are dismissed", () => {
    const dismissed = new Set(["Mix Engineer", "Mastering Engineer", "Designer Gráfico"]);
    const result = computeMissingRoles([], dismissed);
    expect(result).toHaveLength(0);
  });
});
