import { describe, it, expect } from "vitest";
import { getJourneyPlan, painLabels, momentLabels } from "../journeyPersonalization";
import type { TrackViewMode } from "@/contexts/ProfileContext";

describe("getJourneyPlan", () => {
  it("returns finance-focused plan for pain=finance", () => {
    const plan = getJourneyPlan("finance");
    expect(plan.headline).toContain("financeiro");
    expect(plan.primaryPath).toBe("/finance");
  });

  it("returns team-focused plan for pain=team", () => {
    const plan = getJourneyPlan("team");
    expect(plan.headline).toContain("equipe");
    expect(plan.primaryPath).toBe("/professionals");
  });

  it("returns deadlines-focused plan for pain=deadlines", () => {
    const plan = getJourneyPlan("deadlines");
    expect(plan.headline).toContain("prazos");
    expect(plan.primaryPath).toContain("alerts-section");
  });

  it("returns launch-focused plan for pain=launch", () => {
    const plan = getJourneyPlan("launch");
    expect(plan.headline).toContain("lançamento");
    expect(plan.secondaryPath).toContain("releases-section");
  });

  it("returns launch-focused plan when moment=launching regardless of pain", () => {
    const plan = getJourneyPlan("organization", "launching");
    expect(plan.headline).toContain("lançamento");
  });

  it("returns launch-focused plan when moment=ready", () => {
    const plan = getJourneyPlan("organization", "ready");
    expect(plan.headline).toContain("lançamento");
  });

  it("returns default organization plan for unknown pain", () => {
    const plan = getJourneyPlan("some-unknown-pain");
    expect(plan.headline).toContain("organização");
    expect(plan.primaryPath).toBe("/dashboard#checklist-section");
  });

  it("returns default organization plan for empty pain", () => {
    const plan = getJourneyPlan("");
    expect(plan.headline).toContain("organização");
  });

  it("simple mode (basic) returns fewer sections than advanced", () => {
    const basic = getJourneyPlan("organization", "producing", "basic");
    const advanced = getJourneyPlan("organization", "producing", "advanced" as TrackViewMode);
    expect(basic.sections.length).toBeLessThan(advanced.sections.length);
  });

  it("advanced mode includes 'editais' and 'transactions' sections", () => {
    const plan = getJourneyPlan("finance", "producing", "advanced" as TrackViewMode);
    expect(plan.sections).toContain("editais");
    expect(plan.sections).toContain("transactions");
  });

  it("basic mode does not include 'editais' or 'transactions'", () => {
    const plan = getJourneyPlan("finance", "producing", "basic");
    expect(plan.sections).not.toContain("editais");
    expect(plan.sections).not.toContain("transactions");
  });

  it("each plan has required fields", () => {
    const pains = ["organization", "team", "deadlines", "finance", "launch"];
    for (const pain of pains) {
      const plan = getJourneyPlan(pain);
      expect(plan.headline).toBeTruthy();
      expect(plan.reason).toBeTruthy();
      expect(plan.primaryLabel).toBeTruthy();
      expect(plan.primaryPath).toBeTruthy();
      expect(plan.aiPrompt).toBeTruthy();
      expect(Array.isArray(plan.sections)).toBe(true);
    }
  });

  it("reason references the moment in a human-readable way", () => {
    const plan = getJourneyPlan("organization", "idea");
    expect(plan.reason).toContain(momentLabels["idea"]);
  });
});

describe("painLabels", () => {
  it("has entries for all standard pains", () => {
    expect(painLabels).toHaveProperty("organization");
    expect(painLabels).toHaveProperty("team");
    expect(painLabels).toHaveProperty("deadlines");
    expect(painLabels).toHaveProperty("finance");
    expect(painLabels).toHaveProperty("launch");
  });
});

describe("momentLabels", () => {
  it("has entries for all standard moments", () => {
    expect(momentLabels).toHaveProperty("idea");
    expect(momentLabels).toHaveProperty("producing");
    expect(momentLabels).toHaveProperty("ready");
    expect(momentLabels).toHaveProperty("launching");
  });
});
