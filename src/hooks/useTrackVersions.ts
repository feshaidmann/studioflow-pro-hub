import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackSlug } from "@/lib/trackSlug";

export interface TrackVersionRow {
  id: string;
  track_name: string;
  genre: string | null;
  created_at: string;
  version_number: number | null;
  version_label: string | null;
  summary_variant: string | null;
  diagnosis: any;
}

export interface TrackVersionGroup {
  versionId: string;
  trackSlug: string;
  displayName: string;
  versions: TrackVersionRow[];
}

/**
 * Lista todas as análises do usuário agrupadas por `track_version_id`
 * (e, como fallback, por slug do nome) — base do módulo de comparação de versões.
 */
export function useTrackVersions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["track-versions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TrackVersionGroup[]> => {
      const { data, error } = await supabase
        .from("music_dna_analyses")
        .select("id, track_name, genre, created_at, track_version_id, version_number, version_label, summary_variant, diagnosis")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const groups = new Map<string, TrackVersionGroup>();
      for (const row of data ?? []) {
        const r: any = row;
        const key = r.track_version_id ?? `slug:${trackSlug(r.track_name)}`;
        const existing = groups.get(key);
        const v: TrackVersionRow = {
          id: r.id,
          track_name: r.track_name,
          genre: r.genre,
          created_at: r.created_at,
          version_number: r.version_number ?? null,
          version_label: r.version_label ?? null,
          summary_variant: r.summary_variant ?? null,
          diagnosis: r.diagnosis,
        };
        if (existing) {
          existing.versions.push(v);
        } else {
          groups.set(key, {
            versionId: r.track_version_id ?? key,
            trackSlug: trackSlug(r.track_name),
            displayName: r.track_name,
            versions: [v],
          });
        }
      }
      // Só agrupos com 2+ versões são úteis para comparação;
      // devolvemos todos, e a UI decide quando mostrar o CTA.
      return Array.from(groups.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
  });
}

/**
 * Encontra (ou cria) a `music_track_versions` para um nome de faixa do usuário atual.
 * Retorna o id e o próximo `version_number` a usar.
 */
export async function ensureTrackVersion(params: {
  userId: string;
  trackName: string;
  projectId?: string | null;
}): Promise<{ id: string; nextVersionNumber: number }> {
  const slug = trackSlug(params.trackName);

  const { data: existing } = await supabase
    .from("music_track_versions")
    .select("id")
    .eq("user_id", params.userId)
    .eq("track_slug", slug)
    .maybeSingle();

  let versionId = (existing as any)?.id as string | undefined;
  if (!versionId) {
    const { data: created, error } = await supabase
      .from("music_track_versions")
      .insert({
        user_id: params.userId,
        track_slug: slug,
        display_name: params.trackName,
        project_id: params.projectId ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    versionId = (created as any).id as string;
  }

  const { count } = await supabase
    .from("music_dna_analyses")
    .select("id", { count: "exact", head: true })
    .eq("track_version_id", versionId);

  return { id: versionId, nextVersionNumber: (count ?? 0) + 1 };
}

export function useInvalidateTrackVersions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["track-versions"] });
}
