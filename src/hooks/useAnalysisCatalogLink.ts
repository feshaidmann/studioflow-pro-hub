import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Vincula (ou desvincula) uma análise do Music DNA a uma faixa do catálogo Spotify (1↔1).
 * Passe `spotifyTrackId: null` para desvincular.
 */
export function useLinkAnalysisToSpotifyTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      analysisId,
      spotifyTrackId,
    }: {
      analysisId: string;
      spotifyTrackId: string | null;
    }) => {
      // Garante unicidade: limpa qualquer outra análise que já aponte para a mesma faixa
      if (spotifyTrackId) {
        const { error: clearErr } = await supabase
          .from("music_dna_analyses")
          .update({ spotify_track_id: null } as any)
          .eq("spotify_track_id", spotifyTrackId)
          .neq("id", analysisId);
        if (clearErr) throw clearErr;
      }
      const { error } = await supabase
        .from("music_dna_analyses")
        .update({ spotify_track_id: spotifyTrackId } as any)
        .eq("id", analysisId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["spotify-releases"] });
      qc.invalidateQueries({ queryKey: ["music-dna-analyses"] });
      toast.success(vars.spotifyTrackId ? "Vínculo criado" : "Vínculo removido");
    },
    onError: (e: Error) => toast.error(`Não foi possível atualizar o vínculo: ${e.message}`),
  });
}
