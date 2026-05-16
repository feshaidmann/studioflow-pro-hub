import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AcceptanceSignal =
  | "thumbs_up"
  | "thumbs_down"
  | "saved"
  | "copied"
  | "task_created";

/**
 * Hook para registrar sinais de aceitação do `diagnostico_resumo` (A/B).
 * Idempotente: a constraint UNIQUE(analysis_id, signal_type) impede duplicatas.
 * Falhas são silenciosas — sinal de telemetria não pode quebrar o fluxo do produtor.
 */
export function useAcceptanceSignal() {
  const { user } = useAuth();

  const send = useCallback(
    async (params: {
      analysisId: string | null | undefined;
      variant: "A" | "B" | string | null | undefined;
      signal: AcceptanceSignal;
    }) => {
      if (!user?.id || !params.analysisId) return;
      const variant = params.variant === "B" ? "B" : "A";
      try {
        const { error } = await supabase
          .from("diagnosis_acceptance_signals")
          .insert({
            user_id: user.id,
            analysis_id: params.analysisId,
            summary_variant: variant,
            signal_type: params.signal,
          });
        if (error && !/duplicate key|unique/i.test(error.message)) {
          console.warn("[acceptance-signal] insert error:", error.message);
        }
      } catch (e) {
        console.warn("[acceptance-signal] unexpected error:", e);
      }
    },
    [user?.id],
  );

  return { send };
}
