import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DiagnosisResult } from "@/hooks/useMusicDNA";
import { musicDnaColumnsFromDiagnosis } from "@/types/musicDna";

export interface SavedAnalysis {
  id: string;
  track_name: string;
  genre: string;
  input_metadata: {
    name: string;
    notes?: string;
    references: string[];
  };
  diagnosis: DiagnosisResult;
  created_at: string;
}

const SESSION_KEY = "music-dna-last-analysis";

export function cacheLastAnalysis(input: { name: string; notes?: string; references: string[] }, diagnosis: DiagnosisResult) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ input, diagnosis, timestamp: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function getCachedAnalysis(): { input: { name: string; notes?: string; references: string[] }; diagnosis: DiagnosisResult } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCachedAnalysis() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function useSavedAnalyses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedAnalyses = [], isLoading } = useQuery({
    queryKey: ["music-dna-analyses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_dna_analyses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedAnalysis[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      input,
      diagnosis,
    }: {
      input: { name: string; notes?: string; references: string[] };
      diagnosis: DiagnosisResult;
    }): Promise<{ id: string }> => {
      const { data, error } = await supabase
        .from("music_dna_analyses")
        .insert({
          user_id: user!.id,
          track_name: input.name,
          genre: diagnosis.genero_classificado || "",
          input_metadata: input as any,
          diagnosis: diagnosis as any,
          ...musicDnaColumnsFromDiagnosis(diagnosis),
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (diagnosis.genero_classificado) {
        supabase.rpc("recalcular_benchmark_genero" as never, { p_genero: diagnosis.genero_classificado } as never)
          .then(() => queryClient.invalidateQueries({ queryKey: ["music-dna-benchmarks"] }))
          .catch(() => undefined);
      }
      return { id: data.id as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music-dna-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["music-dna-benchmarks"] });
      toast.success("Análise salva com sucesso");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("music_dna_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music-dna-analyses"] });
      toast.success("Análise removida");
    },
  });

  return {
    savedAnalyses,
    isLoading,
    saveAnalysis: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    deleteAnalysis: deleteMutation.mutate,
  };
}
