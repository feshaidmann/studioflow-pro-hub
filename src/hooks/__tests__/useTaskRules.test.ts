import { describe, it, expect } from "vitest";
import { mergeRulesWithDefaults, DEFAULT_RULES, type RuleConfig } from "../useTaskRules";

// ── mergeRulesWithDefaults ────────────────────────────────────────────────────

describe("mergeRulesWithDefaults", () => {
  it("returns a copy of each default when dbRules is empty", () => {
    const merged = mergeRulesWithDefaults([]);
    expect(merged).toHaveLength(DEFAULT_RULES.length);
    for (const def of DEFAULT_RULES) {
      const found = merged.find((r) => r.ruleType === def.ruleType);
      expect(found).toBeDefined();
      expect(found!.isActive).toBe(def.isActive);
      expect(found!.parameters).toEqual(def.parameters);
    }
  });

  it("a DB rule overrides the matching default", () => {
    const dbRule: RuleConfig = { id: "db-1", ruleType: "budget", isActive: false, parameters: { alertPercent: 50 } };
    const merged = mergeRulesWithDefaults([dbRule]);
    const budget = merged.find((r) => r.ruleType === "budget")!;
    expect(budget.id).toBe("db-1");
    expect(budget.isActive).toBe(false);
    expect(budget.parameters).toEqual({ alertPercent: 50 });
  });

  it("non-matching DB rules are silently ignored", () => {
    const dbRule: RuleConfig = { id: "x", ruleType: "unknown_rule", isActive: true, parameters: {} };
    const merged = mergeRulesWithDefaults([dbRule]);
    expect(merged.map((r) => r.ruleType)).not.toContain("unknown_rule");
    expect(merged).toHaveLength(DEFAULT_RULES.length);
  });

  it("multiple DB rules each override their respective default", () => {
    const dbRules: RuleConfig[] = [
      { id: "1", ruleType: "inactivity", isActive: false, parameters: { days: 14 } },
      { id: "2", ruleType: "deadline",   isActive: false, parameters: { daysAhead: 7 } },
    ];
    const merged = mergeRulesWithDefaults(dbRules);
    expect(merged.find((r) => r.ruleType === "inactivity")!.parameters).toEqual({ days: 14 });
    expect(merged.find((r) => r.ruleType === "deadline")!.parameters).toEqual({ daysAhead: 7 });
    // Others remain at defaults
    const release = DEFAULT_RULES.find((r) => r.ruleType === "release")!;
    expect(merged.find((r) => r.ruleType === "release")!.parameters).toEqual(release.parameters);
  });

  it("accepts a custom defaults list", () => {
    const custom: Omit<RuleConfig, "id">[] = [
      { ruleType: "custom_rule", isActive: true, parameters: { threshold: 5 } },
    ];
    const merged = mergeRulesWithDefaults([], custom);
    expect(merged).toHaveLength(1);
    expect(merged[0].ruleType).toBe("custom_rule");
  });

  it("result order matches defaults order, not DB order", () => {
    const dbRules: RuleConfig[] = DEFAULT_RULES.slice().reverse().map((d, i) => ({
      id: String(i),
      ruleType: d.ruleType,
      isActive: d.isActive,
      parameters: d.parameters,
    }));
    const merged = mergeRulesWithDefaults(dbRules);
    expect(merged.map((r) => r.ruleType)).toEqual(DEFAULT_RULES.map((d) => d.ruleType));
  });
});
