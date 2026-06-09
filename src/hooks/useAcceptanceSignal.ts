import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AcceptanceSignal =
  | "thumbs_up"
  | "thumbs_down"
  | "saved"
  | "copied"
  | "task_created"
  | "impression";

/**
 * Hook para registrar sinais de aceitação do `diagnostico_resumo` (A/B).
 * Idempotente: a constraint UNIQUE(analysis_id, signal_type) impede duplicatas.
 * Falhas são silenciosas — sinal de telemetria não pode quebrar o fluxo do produtor.
 *
 * `metadata` guarda contexto importante para análise longitudinal: stage do projeto,
 * gênero classificado, confiança da extração, versão do prompt e — no caso de
 * `thumbs_down` — texto livre opcional do usuário sobre o motivo.
 */
export function useAcceptanceSignal() {
  const { user } = useAuth();

  const send = useCallback(
    async (params: {
      analysisId: string | null | undefined;
      variant: string | null | undefined;
      signal: AcceptanceSignal;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id || !params.analysisId) return;
      // Aceita rótulo versionado (ex.: "A.v2"). Fallback seguro: "A".
      const raw = typeof params.variant === "string" ? params.variant : "";
      const variant = /^[AB](\.v\d+)?$/.test(raw) ? raw : "A";
      // Extrai e injeta prompt_version no metadata para análise longitudinal,
      // mesmo que o caller não tenha enviado explicitamente.
      const [, versionPart] = variant.split(".");
      const metadata = {
        prompt_version: versionPart || "v1",
        ...(params.metadata ?? {}),
      };
      try {
        const { error } = await supabase
          .from("diagnosis_acceptance_signals")
          .insert({
            user_id: user.id,
            analysis_id: params.analysisId,
            summary_variant: variant,
            signal_type: params.signal,
            metadata,
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
