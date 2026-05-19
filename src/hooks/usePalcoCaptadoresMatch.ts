import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CaptadorProfile } from "./useCaptadores";

export interface MatchReason { label: string; detail: string; weight: number; }
export interface MatchedCaptador extends CaptadorProfile { match_score: number; match_reasons?: MatchReason[]; }

export function usePalcoCaptadoresMatch(applicationId?: string) {
  const [data, setData] = useState<MatchedCaptador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: res, error: err } = await supabase.functions.invoke("palco-match-captadores", {
        body: { application_id: applicationId },
      });
      if (cancelled) return;
      if (err) setError(err.message);
      else setData((res?.captadores as MatchedCaptador[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  return { data, loading, error };
}
