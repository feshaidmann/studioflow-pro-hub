import { describe, it, expect } from "vitest";
import {
  computeProjectFinancials,
  computeMixPercent,
  dbRowToProject,
  dbRowToTransaction,
  dbRowToTrack,
  STAGE_PERCENT,
} from "../ProjectContext";
import type { Transaction } from "@/data/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    projectId: "proj-1",
    type: "expense",
    description: "Test",
    amount: 100,
    date: "2025-01-01",
    category: "Outros",
    customCategory: "",
    paid: true,
    notes: "",
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── computeProjectFinancials ──────────────────────────────────────────────────

describe("computeProjectFinancials", () => {
  it("returns zeros and null margin when there are no transactions", () => {
    const r = computeProjectFinancials([], "proj-1");
    expect(r.totalIncome).toBe(0);
    expect(r.totalExpense).toBe(0);
    expect(r.profit).toBe(0);
    expect(r.margin).toBeNull();
  });

  it("ignores unpaid transactions", () => {
    const txs = [
      makeTx({ type: "income",  paid: false, amount: 1000 }),
      makeTx({ type: "expense", paid: false, amount: 500 }),
    ];
    const r = computeProjectFinancials(txs, "proj-1");
    expect(r.totalIncome).toBe(0);
    expect(r.totalExpense).toBe(0);
  });

  it("counts only paid income", () => {
    const txs = [
      makeTx({ id: "t1", type: "income", paid: true,  amount: 800 }),
      makeTx({ id: "t2", type: "income", paid: false, amount: 200 }),
    ];
    expect(computeProjectFinancials(txs, "proj-1").totalIncome).toBe(800);
  });

  it("counts only paid expenses", () => {
    const txs = [
      makeTx({ id: "t1", type: "expense", paid: true,  amount: 300 }),
      makeTx({ id: "t2", type: "expense", paid: false, amount: 100 }),
    ];
    expect(computeProjectFinancials(txs, "proj-1").totalExpense).toBe(300);
  });

  it("calculates profit as income minus expense", () => {
    const txs = [
      makeTx({ id: "t1", type: "income",  paid: true, amount: 1000 }),
      makeTx({ id: "t2", type: "expense", paid: true, amount: 400  }),
    ];
    expect(computeProjectFinancials(txs, "proj-1").profit).toBe(600);
  });

  it("profit is negative when expenses exceed income", () => {
    const txs = [
      makeTx({ id: "t1", type: "income",  paid: true, amount: 200 }),
      makeTx({ id: "t2", type: "expense", paid: true, amount: 500 }),
    ];
    expect(computeProjectFinancials(txs, "proj-1").profit).toBe(-300);
  });

  it("calculates margin as profit/income * 100", () => {
    const txs = [
      makeTx({ id: "t1", type: "income",  paid: true, amount: 1000 }),
      makeTx({ id: "t2", type: "expense", paid: true, amount: 400  }),
    ];
    expect(computeProjectFinancials(txs, "proj-1").margin).toBeCloseTo(60);
  });

  it("margin is null when totalIncome is zero", () => {
    const txs = [makeTx({ type: "expense", paid: true, amount: 200 })];
    expect(computeProjectFinancials(txs, "proj-1").margin).toBeNull();
  });

  it("only counts transactions belonging to the given projectId", () => {
    const txs = [
      makeTx({ id: "t1", projectId: "proj-1", type: "income",  paid: true, amount: 500 }),
      makeTx({ id: "t2", projectId: "proj-2", type: "income",  paid: true, amount: 999 }),
      makeTx({ id: "t3", projectId: "proj-1", type: "expense", paid: true, amount: 200 }),
    ];
    const r = computeProjectFinancials(txs, "proj-1");
    expect(r.totalIncome).toBe(500);
    expect(r.totalExpense).toBe(200);
  });

  it("sums multiple paid transactions of the same type", () => {
    const txs = [
      makeTx({ id: "t1", type: "income", paid: true, amount: 400 }),
      makeTx({ id: "t2", type: "income", paid: true, amount: 600 }),
    ];
    expect(computeProjectFinancials(txs, "proj-1").totalIncome).toBe(1000);
  });

  it("margin is 0% when profit is zero (income equals expense)", () => {
    const txs = [
      makeTx({ id: "t1", type: "income",  paid: true, amount: 500 }),
      makeTx({ id: "t2", type: "expense", paid: true, amount: 500 }),
    ];
    const r = computeProjectFinancials(txs, "proj-1");
    expect(r.profit).toBe(0);
    expect(r.margin).toBe(0);
  });
});

// ── computeMixPercent ─────────────────────────────────────────────────────────

describe("computeMixPercent", () => {
  it("returns 0 when project is undefined", () => {
    expect(computeMixPercent(undefined)).toBe(0);
  });

  it("returns 100 for a completed project regardless of stage", () => {
    expect(computeMixPercent({ stage: "gravacao", completed: true })).toBe(100);
    expect(computeMixPercent({ stage: "inicio",   completed: true })).toBe(100);
  });

  it("returns correct percent for each known stage", () => {
    const cases: [string, number][] = [
      ["inicio",   10],
      ["rough",    10],
      ["gravacao", 50],
      ["mix",      80],
      ["master",   90],
      ["upload",   98],
      ["lancado", 100],
    ];
    for (const [stage, expected] of cases) {
      expect(computeMixPercent({ stage, completed: false })).toBe(expected);
    }
  });

  it("falls back to 10 for an unknown stage", () => {
    expect(computeMixPercent({ stage: "unknown_stage", completed: false })).toBe(10);
  });

  it("STAGE_PERCENT constant matches the expected known values", () => {
    expect(STAGE_PERCENT["mix"]).toBe(80);
    expect(STAGE_PERCENT["master"]).toBe(90);
    expect(STAGE_PERCENT["lancado"]).toBe(100);
  });
});

// ── dbRowToProject ────────────────────────────────────────────────────────────

describe("dbRowToProject", () => {
  const baseRow = {
    id: "p1", name: "Álbum X", artist: "Ana", bpm: 120, key: "Am",
    mix_percent: 80, master_done: false, upload_date: null, revenue_estimate: null,
    stage: "mix", lufs: null, streaming_ready: false, project_type: "album",
    track_count: 10, total_contract_value: 5000, amount_paid: 2000,
    estimated_months: 3, completed: false, notes: null, genre: null,
    subgenre: null, artist_state: null, audience_size_at_start: null,
    production_start_date: null, distributor: null,
  };

  it("maps core fields correctly", () => {
    const p = dbRowToProject(baseRow);
    expect(p.id).toBe("p1");
    expect(p.name).toBe("Álbum X");
    expect(p.artist).toBe("Ana");
    expect(p.stage).toBe("mix");
  });

  it("defaults completed to false when null", () => {
    expect(dbRowToProject({ ...baseRow, completed: null }).completed).toBe(false);
  });

  it("defaults notes to '' when null", () => {
    expect(dbRowToProject({ ...baseRow, notes: null }).notes).toBe("");
  });

  it("defaults genre to null when absent", () => {
    expect(dbRowToProject({ ...baseRow, genre: undefined }).genre).toBeNull();
  });

  it("defaults artistState to null when absent", () => {
    expect(dbRowToProject({ ...baseRow, artist_state: undefined }).artistState).toBeNull();
  });
});

// ── dbRowToTransaction ────────────────────────────────────────────────────────

describe("dbRowToTransaction", () => {
  const baseRow = {
    id: "tx1", project_id: "proj-1", type: "expense", description: "Studio",
    amount: 400, date: "2025-05-01", category: "Estúdio/Gravação",
    custom_category: null, paid: true, notes: null, created_at: "2025-05-01T10:00:00Z",
  };

  it("maps all core fields", () => {
    const tx = dbRowToTransaction(baseRow);
    expect(tx.id).toBe("tx1");
    expect(tx.projectId).toBe("proj-1");
    expect(tx.type).toBe("expense");
    expect(tx.amount).toBe(400);
    expect(tx.paid).toBe(true);
  });

  it("defaults paid to false when null", () => {
    expect(dbRowToTransaction({ ...baseRow, paid: null }).paid).toBe(false);
  });

  it("defaults notes to '' when null", () => {
    expect(dbRowToTransaction({ ...baseRow, notes: null }).notes).toBe("");
  });

  it("defaults customCategory to '' when null", () => {
    expect(dbRowToTransaction({ ...baseRow, custom_category: null }).customCategory).toBe("");
  });
});

// ── dbRowToTrack ──────────────────────────────────────────────────────────────

describe("dbRowToTrack", () => {
  const baseRow = {
    id: "trk1", name: "Kick", high_pass_hz: 30, eq_notes: "",
    comp_gr_db: "3.5", sidechain_trigger: "—", gain_dbfs: "-1.2",
    done: false, track_source: "", musician_id: "", musician_fee: "500",
    fee_paid: false,
  };

  it("maps core identity fields", () => {
    const t = dbRowToTrack(baseRow);
    expect(t.id).toBe("trk1");
    expect(t.name).toBe("Kick");
  });

  it("coerces comp_gr_db string to Number", () => {
    expect(dbRowToTrack(baseRow).compGrDb).toBe(3.5);
  });

  it("coerces gain_dbfs string to Number", () => {
    expect(dbRowToTrack(baseRow).gainDbfs).toBe(-1.2);
  });

  it("coerces musician_fee string to Number", () => {
    expect(dbRowToTrack(baseRow).musicianFee).toBe(500);
  });

  it("coerces null numeric fields to 0 via Number()", () => {
    const t = dbRowToTrack({ ...baseRow, comp_gr_db: null, gain_dbfs: null, musician_fee: null });
    expect(t.compGrDb).toBe(0);
    expect(t.gainDbfs).toBe(0);
    expect(t.musicianFee).toBe(0);
  });
});
