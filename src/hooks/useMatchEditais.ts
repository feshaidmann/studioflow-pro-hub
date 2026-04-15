import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MatchedEdital {
  id: string;
  titulo: string;
  orgao: string;
  estado: string;
  area: string;
  status: string;
  abertura: string | null;
  prazo: string | null;
  link: string;
  inferido: boolean;
  score: number;
  valor?: string;
  resumo?: string;
  publico_alvo?: string;
}

export function useMatchEditais() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchedEdital[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = useCallback(async (projectId: string) => {
    if (!user || !projectId) { setMatches([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-editais", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      setMatches(data?.matches || []);
    } catch (err: any) {
      console.error("Match error:", err);
      toast({ title: "Erro ao buscar recomendações", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return { matches, loading, fetchMatches };
}
