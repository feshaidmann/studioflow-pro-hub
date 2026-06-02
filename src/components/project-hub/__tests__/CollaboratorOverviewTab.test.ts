import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import {
  buildMemberFromInvitation,
  computeIsLate,
  computeDaysLeft,
} from "../CollaboratorOverviewTab";

// Fix "now" to 2026-01-15T12:00:00Z for all date-relative assertions
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

// ── buildMemberFromInvitation ─────────────────────────────────────────────────

describe("buildMemberFromInvitation", () => {
  const base = {
    professional_role: "Mixing Engineer",
    fee: 800,
    deadline: "2026-02-01",
    schedule_notes: "Stems enviados via WeTransfer",
    accepted_at: "2026-01-10T10:00:00Z",
    responded_at: "2026-01-09T08:00:00Z",
  } as const;

  it("maps professional_role to role", () => {
    expect(buildMemberFromInvitation(base, "mix").role).toBe("Mixing Engineer");
  });

  it("delivery_status is always 'ativo'", () => {
    expect(buildMemberFromInvitation(base, "mix").delivery_status).toBe("ativo");
  });

  it("maps schedule_notes to both expected_deliverable and notes", () => {
    const m = buildMemberFromInvitation(base, "mix");
    expect(m.expected_deliverable).toBe("Stems enviados via WeTransfer");
    expect(m.notes).toBe("Stems enviados via WeTransfer");
  });

  it("maps deadline to delivery_due_date", () => {
    expect(buildMemberFromInvitation(base, "mix").delivery_due_date).toBe("2026-02-01");
  });

  it("delivery_due_date is null when deadline is empty string", () => {
    const inv = { ...base, deadline: "" };
    expect(buildMemberFromInvitation(inv, "mix").delivery_due_date).toBeNull();
  });

  it("prefers accepted_at over responded_at for last_activity_at", () => {
    expect(buildMemberFromInvitation(base, "mix").last_activity_at).toBe("2026-01-10T10:00:00Z");
  });

  it("falls back to responded_at when accepted_at is null", () => {
    const inv = { ...base, accepted_at: null };
    expect(buildMemberFromInvitation(inv, "mix").last_activity_at).toBe("2026-01-09T08:00:00Z");
  });

  it("last_activity_at is null when both dates are null", () => {
    const inv = { ...base, accepted_at: null, responded_at: null };
    expect(buildMemberFromInvitation(inv, "mix").last_activity_at).toBeNull();
  });

  it("converts fee to Number", () => {
    const inv = { ...base, fee: "1200" as any };
    expect(buildMemberFromInvitation(inv, "mix").fee).toBe(1200);
  });

  it("uses projectStage for stage field", () => {
    expect(buildMemberFromInvitation(base, "master").stage).toBe("master");
  });

  it("role falls back to '' when professional_role is falsy", () => {
    const inv = { ...base, professional_role: "" };
    expect(buildMemberFromInvitation(inv, "mix").role).toBe("");
  });
});

// ── computeIsLate ─────────────────────────────────────────────────────────────

describe("computeIsLate", () => {
  it("returns false when deliveryDueDate is null", () => {
    expect(computeIsLate(null, "ativo")).toBe(false);
  });

  it("returns false when due date is in the future", () => {
    expect(computeIsLate("2026-01-20", "ativo")).toBe(false);
  });

  it("returns true when due date is in the past and status is 'ativo'", () => {
    expect(computeIsLate("2026-01-10", "ativo")).toBe(true);
  });

  it("returns false when past due but status is 'entregou'", () => {
    expect(computeIsLate("2026-01-10", "entregou")).toBe(false);
  });

  it("returns false when past due but status is 'concluido'", () => {
    expect(computeIsLate("2026-01-10", "concluido")).toBe(false);
  });

  it("returns true when past due and status is 'aguardando'", () => {
    expect(computeIsLate("2026-01-10", "aguardando")).toBe(true);
  });
});

// ── computeDaysLeft ───────────────────────────────────────────────────────────

describe("computeDaysLeft", () => {
  it("returns null when deliveryDueDate is null", () => {
    expect(computeDaysLeft(null)).toBeNull();
  });

  it("returns 0 for today (midnight UTC is 12h behind noon, result may be -0)", () => {
    // Math.ceil(-0.5) = -0 in JS; -0 === 0 is true but Object.is(-0, 0) is false
    const result = computeDaysLeft("2026-01-15");
    expect(result === 0).toBe(true);
  });

  it("returns a negative number for a past due date", () => {
    // Jan 10 midnight to Jan 15 noon = -5.5 days → ceil = -5
    expect(computeDaysLeft("2026-01-10")).toBe(-5);
  });

  it("returns a positive number for a future due date", () => {
    // Jan 20 midnight to Jan 15 noon = +4.5 days → ceil = 5
    expect(computeDaysLeft("2026-01-20")).toBe(5);
  });

  it("rounds partial days upward (ceil semantics)", () => {
    // Any fractional future day rounds up, any fractional past rounds toward zero
    const result = computeDaysLeft("2026-01-16");
    // Jan 16 midnight - Jan 15 noon = 0.5 days → ceil = 1
    expect(result).toBe(1);
  });
});
