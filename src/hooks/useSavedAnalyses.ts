import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DiagnosisResult } from "@/hooks/useMusicDNA";
import { musicDnaColumnsFromDiagnosis } from "@/types/musicDna";
import { ensureTrackVersion } from "@/hooks/useTrackVersions";

export interface SavedAnalysis {
  id: string;
  track_name: string;
  genre: string;
  project_id: string | null;
  input_metadata: {
    name: string;
    notes?: string;
    references: string[];
    projectId?: string;
    stage?: "demo" | "mix" | "master";
  };
  diagnosis: DiagnosisResult;
  created_at: string;
  stage?: string | null;
  track_version_id?: string | null;
  version_number?: number | null;
  version_label?: string | null;
  summary_variant?: string | null;
}

const SESSION_KEY = "music-dna-last-analysis";

export function cacheLastAnalysis(input: { name: string; notes?: string; references: string[]; projectId?: string }, diagnosis: DiagnosisResult) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ input, diagnosis, timestamp: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function getCachedAnalysis(): { input: { name: string; notes?: string; references: string[]; projectId?: string }; diagnosis: DiagnosisResult } | null {
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
      input: { name: string; notes?: string; references: string[]; projectId?: string; stage?: "demo" | "mix" | "master" };
      diagnosis: DiagnosisResult;
      silent?: boolean;
    }): Promise<{ id: string; trackVersionId: string; versionNumber: number; summaryVariant: "A" | "B" }> => {
      // Agrupa por slug do nome → versão Nx automática.
      const { id: trackVersionId, nextVersionNumber } = await ensureTrackVersion({
        userId: user!.id,
        trackName: input.name,
        projectId: input.projectId ?? null,
      });

      const summaryVariant = (diagnosis.summaryVariant === "B" ? "B" : "A") as "A" | "B";

      const { data, error } = await supabase
        .from("music_dna_analyses")
        .insert({
          user_id: user!.id,
          track_name: input.name,
          genre: diagnosis.genero_classificado || "",
          project_id: input.projectId || null,
          input_metadata: input as any,
          diagnosis: diagnosis as any,
          track_version_id: trackVersionId,
          version_number: nextVersionNumber,
          version_label: `v${nextVersionNumber}`,
          summary_variant: summaryVariant,
          summary_variant_assigned_at: new Date().toISOString(),
          legacy: false,
          ...musicDnaColumnsFromDiagnosis(diagnosis),
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Sinal implícito de aceitação: "saved" (idempotente via UNIQUE)
      try {
        await supabase
          .from("diagnosis_acceptance_signals")
          .insert({
            user_id: user!.id,
            analysis_id: (data as any).id,
            summary_variant: summaryVariant,
            signal_type: "saved",
          });
      } catch { /* silencioso: telemetria não pode quebrar o save */ }

      // Benchmarks agora vêm de uma VIEW agregada em tempo real — nada para recalcular.
      if (diagnosis.genero_classificado) {
        queryClient.invalidateQueries({ queryKey: ["music-dna-benchmarks"] });
      }
      return {
        id: (data as any).id as string,
        trackVersionId,
        versionNumber: nextVersionNumber,
        summaryVariant,
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["music-dna-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["music-dna-benchmarks"] });
      queryClient.invalidateQueries({ queryKey: ["track-versions"] });
      if (!variables.silent) toast.success("Análise salva com sucesso");
    },
    onError: (err: Error, variables) => {
      if (!variables.silent) toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("music_dna_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music-dna-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["track-versions"] });
      toast.success("Análise removida");
    },
  });

  return {
    savedAnalyses,
    isLoading,
    saveAnalysis: saveMutation.mutate,
    saveAnalysisAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteAnalysis: deleteMutation.mutate,
  };
}
