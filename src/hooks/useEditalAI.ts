import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AIAction =
  | "generate_memorial"
  | "adapt_language"
  | "review_budget"
  | "generate_checklist"
  | "suggest_project_fit";

export const AI_ACTION_LABELS: Record<AIAction, string> = {
  generate_memorial: "Gerar Memorial",
  adapt_language: "Adaptar Linguagem",
  review_budget: "Revisar Orçamento",
  generate_checklist: "Gerar Checklist",
  suggest_project_fit: "Sugerir Projeto",
};

export function useEditalAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const callAI = async (action: AIAction, payload: Record<string, unknown>): Promise<string | null> => {
    setIsLoading(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("edital-ai-assistant", {
        body: { action, payload },
      });

      if (error) {
        const msg = (error as any)?.message || "Erro ao chamar IA";
        toast.error(msg);
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      const result = data?.response as string;
      setLastResult(result);
      return result;
    } catch (e: any) {
      toast.error(e?.message || "Erro inesperado");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { callAI, isLoading, lastResult, setLastResult };
}
