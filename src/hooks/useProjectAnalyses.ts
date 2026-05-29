import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectAnalysisSummary {
  id: string;
  track_name: string;
  genre: string | null;
  stage: string | null;
  version_label: string | null;
  lufs_integrated: number | null;
  dynamic_range_db: number | null;
  created_at: string;
}

export function useProjectAnalyses(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["project-analyses", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_dna_analyses")
        .select("id, track_name, genre, stage, created_at, lufs_integrated, dynamic_range_db, version_label")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as ProjectAnalysisSummary[];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}
