import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProjectAlerts } from "../useProjectAlerts";
import type { Project, Transaction } from "@/data/mockData";

// ── Fixed clock ───────────────────────────────────────────────────────────────
// Reference date: 2026-01-15 (UTC noon to avoid DST edge cases)
const NOW = new Date("2026-01-15T12:00:00Z");

function daysAgo(n: number): string {
  const d = new Date(NOW.getTime() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  const d = new Date(NOW.getTime() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "Álbum de Verão",
    artist: "Ana Lima",
    bpm: 120,
    key: "C",
    mixPercent: 50,
    masterDone: false,
    uploadDate: daysFromNow(30),
    revenueEstimate: 0,
    stage: "mix",
    lufs: -14,
    streamingReady: null,
    projectType: "album",
    trackCount: null,
    totalContractValue: null,
    amountPaid: null,
    estimatedMonths: null,
    completed: false,
    notes: "",
    ...overrides,
  } as Project;
}

const noFinancials = { totalIncome: 0, totalExpense: 0, profit: 0 };
const getMixPercent = () => 50;
const getFinancials = () => noFinancials;

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("useProjectAlerts", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  // ── Completed projects ───────────────────────────────────────────────────
  it("skips completed projects entirely", () => {
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [makeProject({ completed: true })],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    expect(result.current.alerts).toHaveLength(0);
    expect(result.current.projectsWithHealth).toHaveLength(0);
  });

  // ── Stalled project ──────────────────────────────────────────────────────
  it("emits 'stalled' warning when last activity was 15–30 days ago", () => {
    const project = makeProject({ uploadDate: daysAgo(20) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const stalled = result.current.alerts.find((a) => a.category === "stalled");
    expect(stalled).toBeDefined();
    expect(stalled!.severity).toBe("warning");
  });

  it("emits 'stalled' critical when last activity was 31+ days ago", () => {
    const project = makeProject({ uploadDate: daysAgo(35) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const stalled = result.current.alerts.find((a) => a.category === "stalled");
    expect(stalled!.severity).toBe("critical");
  });

  it("does not emit stalled when latest transaction is within 14 days", () => {
    const project = makeProject({ uploadDate: daysAgo(30) });
    const tx: Transaction = {
      id: "tx-1",
      projectId: "proj-1",
      type: "income",
      description: "Cachê",
      amount: 500,
      date: daysAgo(5),
      category: "cachê",
      paid: true,
    };
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [tx],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const stalled = result.current.alerts.find((a) => a.category === "stalled");
    expect(stalled).toBeUndefined();
  });

  // ── Budget alerts ────────────────────────────────────────────────────────
  it("emits budget warning when expenses are 91–100% of contract value", () => {
    const project = makeProject({ totalContractValue: 1000 });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: () => ({ totalIncome: 0, totalExpense: 950, profit: -950 }),
      })
    );
    const budget = result.current.alerts.find((a) => a.category === "budget");
    expect(budget!.severity).toBe("warning");
    expect(budget!.title).toContain("risco");
  });

  it("emits budget critical when expenses exceed 100% of contract value", () => {
    const project = makeProject({ totalContractValue: 1000 });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: () => ({ totalIncome: 0, totalExpense: 1100, profit: -1100 }),
      })
    );
    const budget = result.current.alerts.find((a) => a.category === "budget");
    expect(budget!.severity).toBe("critical");
    expect(budget!.title).toContain("estourado");
  });

  it("does not emit budget alert when spending is below 90%", () => {
    const project = makeProject({ totalContractValue: 1000 });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: () => ({ totalIncome: 0, totalExpense: 800, profit: -800 }),
      })
    );
    const budget = result.current.alerts.find((a) => a.category === "budget");
    expect(budget).toBeUndefined();
  });

  it("emits negative-profit warning when expenses exceed income with no contract value", () => {
    const project = makeProject({ totalContractValue: null });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: () => ({ totalIncome: 200, totalExpense: 500, profit: -300 }),
      })
    );
    const neg = result.current.alerts.find((a) => a.id.startsWith("profit-"));
    expect(neg).toBeDefined();
    expect(neg!.severity).toBe("warning");
    expect(neg!.description).toContain("300");
  });

  // ── Pending invites ──────────────────────────────────────────────────────
  it("emits invite info alert after 3 days without response", () => {
    const project = makeProject();
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
        pendingInvites: [{ projectId: "proj-1", professionalName: "Carlos", createdAt: daysAgo(4) }],
      })
    );
    const invite = result.current.alerts.find((a) => a.category === "invite");
    expect(invite).toBeDefined();
    expect(invite!.severity).toBe("info");
  });

  it("escalates invite to warning after 7+ days", () => {
    const project = makeProject();
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
        pendingInvites: [{ projectId: "proj-1", professionalName: "Carlos", createdAt: daysAgo(8) }],
      })
    );
    const invite = result.current.alerts.find((a) => a.category === "invite");
    expect(invite!.severity).toBe("warning");
  });

  it("does not emit invite alert before 3 days", () => {
    const project = makeProject();
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
        pendingInvites: [{ projectId: "proj-1", professionalName: "Carlos", createdAt: daysAgo(2) }],
      })
    );
    const invite = result.current.alerts.find((a) => a.category === "invite");
    expect(invite).toBeUndefined();
  });

  // ── Release deadline ─────────────────────────────────────────────────────
  it("emits deadline warning when upload is in 3-7 days", () => {
    const project = makeProject({ stage: "master", uploadDate: daysFromNow(5) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const deadline = result.current.alerts.find((a) => a.category === "deadline" && a.id.startsWith("deadline-"));
    expect(deadline!.severity).toBe("warning");
  });

  it("emits deadline critical when upload is in 0-2 days", () => {
    const project = makeProject({ stage: "master", uploadDate: daysFromNow(1) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const deadline = result.current.alerts.find((a) => a.id === "deadline-proj-1");
    expect(deadline!.severity).toBe("critical");
  });

  it("emits overdue critical when upload date already passed", () => {
    const project = makeProject({ stage: "upload", uploadDate: daysAgo(3) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const overdue = result.current.alerts.find((a) => a.id.startsWith("deadline-overdue-"));
    expect(overdue!.severity).toBe("critical");
    expect(overdue!.title).toContain("atrasado");
  });

  it("does not emit deadline alert for non-upload/master stages", () => {
    const project = makeProject({ stage: "mix", uploadDate: daysFromNow(3) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const deadline = result.current.alerts.find((a) => a.id.startsWith("deadline-"));
    expect(deadline).toBeUndefined();
  });

  // ── Overdue tasks ────────────────────────────────────────────────────────
  it("emits overdue-tasks warning for 1-2 overdue tasks", () => {
    const project = makeProject();
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [
          { projectId: "proj-1", dueDate: daysAgo(2), description: "Mixar voz" },
          { projectId: "proj-1", dueDate: daysAgo(1), description: "EQ graves" },
        ],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const tasks = result.current.alerts.find((a) => a.id.startsWith("overdue-tasks-"));
    expect(tasks!.severity).toBe("warning");
  });

  it("emits overdue-tasks critical for 3+ overdue tasks", () => {
    const project = makeProject();
    const overdueTask = (desc: string) => ({
      projectId: "proj-1",
      dueDate: daysAgo(1),
      description: desc,
    });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [overdueTask("A"), overdueTask("B"), overdueTask("C")],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    const tasks = result.current.alerts.find((a) => a.id.startsWith("overdue-tasks-"));
    expect(tasks!.severity).toBe("critical");
  });

  // ── Health computation ───────────────────────────────────────────────────
  it("health is 'organizado' when there are no alerts", () => {
    const project = makeProject({ uploadDate: daysFromNow(30) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    expect(result.current.projectsWithHealth[0].health).toBe("organizado");
  });

  it("health is 'atencao' when there are only warnings", () => {
    const project = makeProject({ uploadDate: daysAgo(20) }); // stalled warning
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    expect(result.current.projectsWithHealth[0].health).toBe("atencao");
  });

  it("health is 'critico' when there is at least one critical alert", () => {
    const project = makeProject({ uploadDate: daysAgo(35) }); // stalled critical
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    expect(result.current.projectsWithHealth[0].health).toBe("critico");
  });

  // ── Sorting ──────────────────────────────────────────────────────────────
  it("projectsWithHealth is sorted: critico → atencao → organizado", () => {
    const healthy = makeProject({ id: "healthy", name: "Saudável", uploadDate: daysFromNow(60) });
    const stalled = makeProject({ id: "stalled", name: "Parado", uploadDate: daysAgo(20) });
    const critical = makeProject({ id: "critical", name: "Crítico", uploadDate: daysAgo(35) });

    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [healthy, stalled, critical],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );

    const healthOrder = result.current.projectsWithHealth.map((p) => p.health);
    expect(healthOrder[0]).toBe("critico");
    expect(healthOrder[1]).toBe("atencao");
    expect(healthOrder[2]).toBe("organizado");
  });

  it("alerts list is sorted: critical → warning → info", () => {
    const project = makeProject({ totalContractValue: 1000, uploadDate: daysAgo(35) });
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [project],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        // critical: stalled(35d) + budget(overrun), info: invite(4d)
        getProjectFinancials: () => ({ totalIncome: 0, totalExpense: 1100, profit: -1100 }),
        pendingInvites: [{ projectId: "proj-1", professionalName: "X", createdAt: daysAgo(4) }],
      })
    );

    const severities = result.current.alerts.map((a) => a.severity);
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    for (let i = 0; i < severities.length - 1; i++) {
      expect(sevOrder[severities[i]]).toBeLessThanOrEqual(sevOrder[severities[i + 1]]);
    }
  });

  // ── Multiple projects ────────────────────────────────────────────────────
  it("handles multiple projects independently", () => {
    const p1 = makeProject({ id: "p1", name: "Projeto 1", uploadDate: daysAgo(35) }); // critical
    const p2 = makeProject({ id: "p2", name: "Projeto 2", uploadDate: daysFromNow(60) }); // clean

    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [p1, p2],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );

    const p1Health = result.current.projectsWithHealth.find((p) => p.project.id === "p1");
    const p2Health = result.current.projectsWithHealth.find((p) => p.project.id === "p2");
    expect(p1Health!.health).toBe("critico");
    expect(p2Health!.health).toBe("organizado");
    expect(result.current.alerts.every((a) => a.projectId !== "p2")).toBe(true);
  });

  it("returns empty results when projects list is empty", () => {
    const { result } = renderHook(() =>
      useProjectAlerts({
        projects: [],
        transactions: [],
        activeTasks: [],
        getMixPercent,
        getProjectFinancials: getFinancials,
      })
    );
    expect(result.current.alerts).toHaveLength(0);
    expect(result.current.projectsWithHealth).toHaveLength(0);
  });
});
