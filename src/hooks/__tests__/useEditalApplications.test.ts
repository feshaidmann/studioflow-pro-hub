import { describe, it, expect } from "vitest";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  RESULTADO_LABELS,
  RESULTADO_COLORS,
  type ApplicationStatus,
  type ResultadoType,
} from "../useEditalApplications";

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "interesse",
  "preparando",
  "inscrito",
  "resultado",
];

const RESULTADO_TYPES: ResultadoType[] = [
  "aprovado",
  "reprovado",
  "lista_espera",
  "desistencia",
];

describe("APPLICATION_STATUS_LABELS", () => {
  it("has a non-empty label for every ApplicationStatus", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(APPLICATION_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("covers all 4 statuses", () => {
    expect(Object.keys(APPLICATION_STATUS_LABELS)).toHaveLength(4);
  });

  it("returns correct pt-BR labels", () => {
    expect(APPLICATION_STATUS_LABELS.interesse).toBe("Interesse");
    expect(APPLICATION_STATUS_LABELS.preparando).toBe("Preparando");
    expect(APPLICATION_STATUS_LABELS.inscrito).toBe("Inscrito");
    expect(APPLICATION_STATUS_LABELS.resultado).toBe("Resultado");
  });
});

describe("APPLICATION_STATUS_COLORS", () => {
  it("has a non-empty CSS class string for every ApplicationStatus", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(APPLICATION_STATUS_COLORS[status]).toBeTruthy();
    }
  });

  it("covers all 4 statuses", () => {
    expect(Object.keys(APPLICATION_STATUS_COLORS)).toHaveLength(4);
  });

  it("each color string contains at least one Tailwind class", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(APPLICATION_STATUS_COLORS[status]).toMatch(/\w+-\w+/);
    }
  });

  it("statuses have distinct color values", () => {
    const colors = APPLICATION_STATUSES.map((s) => APPLICATION_STATUS_COLORS[s]);
    const unique = new Set(colors);
    expect(unique.size).toBe(APPLICATION_STATUSES.length);
  });
});

describe("RESULTADO_LABELS", () => {
  it("has a non-empty label for every ResultadoType", () => {
    for (const tipo of RESULTADO_TYPES) {
      expect(RESULTADO_LABELS[tipo]).toBeTruthy();
    }
  });

  it("covers all 4 resultado types", () => {
    expect(Object.keys(RESULTADO_LABELS)).toHaveLength(4);
  });

  it("returns correct pt-BR labels", () => {
    expect(RESULTADO_LABELS.aprovado).toBe("Aprovado");
    expect(RESULTADO_LABELS.reprovado).toBe("Reprovado");
    expect(RESULTADO_LABELS.lista_espera).toBe("Lista de espera");
    expect(RESULTADO_LABELS.desistencia).toBe("Desistência");
  });
});

describe("RESULTADO_COLORS", () => {
  it("has a non-empty CSS class string for every ResultadoType", () => {
    for (const tipo of RESULTADO_TYPES) {
      expect(RESULTADO_COLORS[tipo]).toBeTruthy();
    }
  });

  it("covers all 4 resultado types", () => {
    expect(Object.keys(RESULTADO_COLORS)).toHaveLength(4);
  });

  it("aprovado uses a success-related class", () => {
    expect(RESULTADO_COLORS.aprovado).toContain("success");
  });

  it("reprovado uses a destructive-related class", () => {
    expect(RESULTADO_COLORS.reprovado).toContain("destructive");
  });
});
