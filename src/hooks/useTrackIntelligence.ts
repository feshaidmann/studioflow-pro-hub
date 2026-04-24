import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export async function generateTrackIntelligence(input: TIAInput): Promise<{ id: string } | null> {
  const { data, error } = await supabase.functions.invoke("generate-track-intelligence", { body: input });
  if (error || !data?.id) {
    toast.error(data?.error || error?.message || "Erro ao gerar diagnóstico");
    return null;
  }
  return { id: data.id };
}
