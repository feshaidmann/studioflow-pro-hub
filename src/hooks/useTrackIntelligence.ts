import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractRateLimitInfo } from "@/hooks/useRateLimitDialog";

export type TIASeverity = "critical" | "warning" | "ok";

export interface TIAGap {
  id: string;
  title: string;
  description: string;
  severity: TIASeverity;
  action_label?: string | null;
  action_route?: string | null;
}

export interface TIADimension {
  score: number;
  justification: string;
}

export interface TIADiagnosis {
  consolidated_score: number;
  score_label: string;
  dimensions: {
    technical: TIADimension;
    completeness: TIADimension;
    strategy: TIADimension;
    market: TIADimension;
  };
  gaps: TIAGap[];
  recommendations: { priority: number; title: string; body: string }[];
  summary: string;
}

export interface TIARecord {
  id: string;
  user_id: string;
  project_id: string | null;
  track_title: string;
  genre: string;
  target_audience: string;
  target_release_date: string;
  target_platforms: string[];
  release_goal: string;
  master_status: string;
  artwork_status: string;
  distributor_status: string;
  diagnosis: TIADiagnosis | null;
  consolidated_score: number | null;
  score_label: string | null;
  status: "pending" | "completed" | "error";
  error_message: string | null;
  created_at: string;
}

export interface TIAInput {
  project_id?: string | null;
  track_title: string;
  genre: string;
  target_audience: string;
  target_release_date: string;
  target_platforms: string[];
  release_goal: string;
  master_status: "sim" | "nao" | "em_andamento";
  artwork_status: "sim" | "nao" | "em_andamento";
  distributor_status: "sim" | "nao" | "em_andamento";
}

export function useTrackIntelligenceList() {
  const [items, setItems] = useState<TIARecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("track_intelligence_analyses")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as TIARecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("track_intelligence_analyses").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir análise");
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Análise excluída");
  };

  return { items, loading, refresh, remove };
}

export function useTrackIntelligence(id: string | undefined) {
  const [item, setItem] = useState<TIARecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("track_intelligence_analyses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!cancel) {
        setItem((data as TIARecord) || null);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  return { item, loading };
}

/**
 * Returns the most recent completed analysis for a project (used in ProjectReleaseTab and Dashboard).
 */
export function useLatestTrackIntelligence(projectId: string | null | undefined) {
  const [latest, setLatest] = useState<TIARecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) { setLatest(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("track_intelligence_analyses")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest((data as TIARecord) || null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { latest, loading, refresh };
}

/**
 * Returns the analysis immediately preceding the given one (same project_id, or same track_title if no project).
 * Used for showing score delta on result page.
 */
export function usePreviousAnalysis(current: TIARecord | null) {
  const [previous, setPrevious] = useState<TIARecord | null>(null);

  useEffect(() => {
    if (!current) { setPrevious(null); return; }
    let cancel = false;
    (async () => {
      let q = (supabase as any)
        .from("track_intelligence_analyses")
        .select("*")
        .eq("status", "completed")
        .lt("created_at", current.created_at)
        .order("created_at", { ascending: false })
        .limit(1);
      if (current.project_id) {
        q = q.eq("project_id", current.project_id);
      } else {
        q = q.eq("track_title", current.track_title).is("project_id", null);
      }
      const { data } = await q.maybeSingle();
      if (!cancel) setPrevious((data as TIARecord) || null);
    })();
    return () => { cancel = true; };
  }, [current]);

  return previous;
}

export async function generateTrackIntelligence(
  input: TIAInput,
  onRateLimit?: (info: any) => void,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase.functions.invoke("generate-track-intelligence", { body: input });

  if (error) {
    const rateInfo = await extractRateLimitInfo(error);
    if (rateInfo && onRateLimit) {
      onRateLimit(rateInfo);
      return null;
    }
    toast.error(error.message || "Erro ao gerar diagnóstico");
    return null;
  }

  if (!data?.id) {
    toast.error(data?.error || "Erro ao gerar diagnóstico");
    return null;
  }
  return { id: data.id };
}
