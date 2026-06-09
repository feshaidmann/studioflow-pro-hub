import { describe, it, expect } from "vitest";
import {
  isOpportunityExpired,
  filterSurvivingOpportunities,
} from "@/lib/expiredOpportunities";

const TODAY = new Date(2026, 5, 1); // 2026-06-01 (local)

describe("isOpportunityExpired", () => {
  it("retorna true para prazo anterior a hoje", () => {
    expect(isOpportunityExpired("2026-05-31", TODAY)).toBe(true);
    expect(isOpportunityExpired("2020-01-15", TODAY)).toBe(true);
  });

  it("retorna false para prazo igual a hoje (ainda válido)", () => {
    expect(isOpportunityExpired("2026-06-01", TODAY)).toBe(false);
  });

  it("retorna false para prazo futuro", () => {
    expect(isOpportunityExpired("2026-06-02", TODAY)).toBe(false);
    expect(isOpportunityExpired("2027-12-31", TODAY)).toBe(false);
  });

  it("retorna false quando prazo é null/undefined/vazio (sem prazo definido)", () => {
    expect(isOpportunityExpired(null, TODAY)).toBe(false);
    expect(isOpportunityExpired(undefined, TODAY)).toBe(false);
    expect(isOpportunityExpired("", TODAY)).toBe(false);
  });

  it("retorna false para strings inválidas (não apaga por erro de parsing)", () => {
    expect(isOpportunityExpired("não-é-data", TODAY)).toBe(false);
  });

  it("aceita instâncias de Date", () => {
    expect(isOpportunityExpired(new Date(2026, 4, 30), TODAY)).toBe(true);
    expect(isOpportunityExpired(new Date(2026, 6, 1), TODAY)).toBe(false);
  });
});

describe("filterSurvivingOpportunities (simula DELETE do cron)", () => {
  it("remove apenas oportunidades expiradas, preserva válidas e sem prazo", () => {
    const rows = [
      { id: "expirada-1", prazo: "2026-05-30" },
      { id: "hoje", prazo: "2026-06-01" },
      { id: "futura", prazo: "2026-07-15" },
      { id: "sem-prazo", prazo: null },
      { id: "expirada-2", prazo: "2024-12-31" },
    ];

    const survivors = filterSurvivingOpportunities(rows, TODAY);

    expect(survivors.map((r) => r.id).sort()).toEqual(
      ["futura", "hoje", "sem-prazo"].sort(),
    );
    expect(survivors).toHaveLength(3);
  });

  it("não apaga nada quando não há expirados", () => {
    const rows = [
      { id: "a", prazo: "2026-06-01" },
      { id: "b", prazo: "2030-01-01" },
      { id: "c", prazo: null },
    ];
    expect(filterSurvivingOpportunities(rows, TODAY)).toHaveLength(3);
  });

  it("preserva integralmente registros com prazo null mesmo se misturados", () => {
    const rows = [
      { id: "sem-prazo-1", prazo: null },
      { id: "sem-prazo-2", prazo: null },
      { id: "velha", prazo: "2020-01-01" },
    ];
    const survivors = filterSurvivingOpportunities(rows, TODAY);
    expect(survivors.map((r) => r.id)).toEqual(["sem-prazo-1", "sem-prazo-2"]);
  });
});
