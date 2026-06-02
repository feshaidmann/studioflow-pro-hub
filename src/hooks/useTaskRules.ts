import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RuleConfig {
  id?: string;
  ruleType: string;
  isActive: boolean;
  parameters: Record<string, number | boolean | string>;
}

// Default rule definitions — used when no DB row exists yet
export const DEFAULT_RULES: Omit<RuleConfig, "id">[] = [
  {
    ruleType: "inactivity",
    isActive: true,
    parameters: { days: 7 },
  },
  {
    ruleType: "budget",
    isActive: true,
    parameters: { alertPercent: 80 },
  },
  {
    ruleType: "invite_pending",
    isActive: true,
    parameters: { days: 5 },
  },
  {
    ruleType: "deadline",
    isActive: true,
    parameters: { daysAhead: 3 },
  },
  {
    ruleType: "master_check",
    isActive: true,
    parameters: { daysStuck: 5 },
  },
  {
    ruleType: "release",
    isActive: true,
    parameters: { daysAhead: 7 },
  },
];

export const RULE_LABELS: Record<string, { label: string; description: string; paramKey?: string; paramLabel?: string; paramMin?: number; paramMax?: number }> = {
  inactivity:     { label: "Inatividade em Projetos",     description: "Alerta quando um projeto fica sem atualização por muitos dias.", paramKey: "days", paramLabel: "Dias sem atividade", paramMin: 1, paramMax: 60 },
  budget:         { label: "Alerta de Gastos",             description: "Avisa quando despesas do mês se aproximam de um limite definido.", paramKey: "alertPercent", paramLabel: "Percentual do limite de gastos (%)", paramMin: 10, paramMax: 100 },
  invite_pending: { label: "Convites sem Resposta",       description: "Lembra de convites pendentes após alguns dias.", paramKey: "days", paramLabel: "Dias sem resposta", paramMin: 1, paramMax: 30 },
  deadline:       { label: "Prazo de Profissional",       description: "Antecipa entregas com prazo próximo.", paramKey: "daysAhead", paramLabel: "Dias de antecedência", paramMin: 1, paramMax: 14 },
  master_check:   { label: "Checklist Técnico (Master)",  description: "Avisa sobre projetos parados na etapa de masterização.", paramKey: "daysStuck", paramLabel: "Dias na etapa Master", paramMin: 1, paramMax: 30 },
  release:        { label: "Próximos Lançamentos",        description: "Prepara para datas de lançamento que se aproximam.", paramKey: "daysAhead", paramLabel: "Dias de antecedência", paramMin: 1, paramMax: 30 },
};

function dbRowToRule(row: any): RuleConfig {
  return {
    id: row.id,
    ruleType: row.rule_type,
    isActive: row.is_active,
    parameters: row.parameters ?? {},
  };
}

export function mergeRulesWithDefaults(
  dbRules: RuleConfig[],
  defaults: Omit<RuleConfig, "id">[] = DEFAULT_RULES,
): RuleConfig[] {
  return defaults.map((def) => {
    const found = dbRules.find((r) => r.ruleType === def.ruleType);
    return found ?? { ...def };
  });
}

export function useTaskRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!user) { setRules([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("task_rules")
      .select("*")
      .eq("user_id", user.id);

    const dbRules: RuleConfig[] = (data ?? []).map(dbRowToRule);

    setRules(mergeRulesWithDefaults(dbRules));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const updateRule = useCallback(async (ruleType: string, patch: Partial<Pick<RuleConfig, "isActive" | "parameters">>) => {
    if (!user) return;
    setRules((prev) =>
      prev.map((r) => r.ruleType === ruleType ? { ...r, ...patch } : r)
    );
    await supabase
      .from("task_rules")
      .upsert(
        {
          user_id: user.id,
          rule_type: ruleType,
          is_active: patch.isActive !== undefined
            ? patch.isActive
            : rules.find((r) => r.ruleType === ruleType)?.isActive ?? true,
          parameters: patch.parameters !== undefined
            ? patch.parameters
            : rules.find((r) => r.ruleType === ruleType)?.parameters ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,rule_type" }
      );
  }, [user, rules]);

  const getRule = useCallback((ruleType: string): RuleConfig => {
    return rules.find((r) => r.ruleType === ruleType) ??
      DEFAULT_RULES.find((r) => r.ruleType === ruleType) as RuleConfig;
  }, [rules]);

  return { rules, loading, updateRule, getRule };
}
