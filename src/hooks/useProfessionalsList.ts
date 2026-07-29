import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Professional, RatingsMap, AllocationsMap } from "@/components/professionals/types";

/** Linha de project_members com o projeto embedado pela query. */
interface MemberRow {
  name: string;
  project_id: string;
  projects: { id: string; name: string; completed: boolean } | null;
}

interface ProfessionalsPayload {
  professionals: Professional[];
  ratingsMap: RatingsMap;
  allocationsMap: AllocationsMap;
}

const EMPTY: ProfessionalsPayload = { professionals: [], ratingsMap: {}, allocationsMap: {} };

export function useProfessionalsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["professionals-list", user?.id ?? null] as const;

  const { data = EMPTY, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<ProfessionalsPayload> => {
      const { data: profsData } = await supabase
        .from("professionals")
        .select("*")
        .order("name");
      const profs = (profsData as Professional[]) ?? [];
      if (profs.length === 0) return EMPTY;

      const names = profs.map((p) => p.name);
      const [ratingsRes, membersRes] = await Promise.all([
        supabase
          .from("professional_ratings")
          .select("professional_name, stars")
          .eq("user_id", user!.id)
          .in("professional_name", names),
        supabase
          .from("project_members")
          .select("name, project_id, projects:project_id(id, name, completed)")
          .eq("user_id", user!.id)
          .in("name", names),
      ]);

      const rMap: RatingsMap = {};
      (ratingsRes.data ?? []).forEach((r) => {
        const k = r.professional_name;
        if (!rMap[k]) rMap[k] = { avg: 0, count: 0 };
        rMap[k].count++;
        rMap[k].avg += Number(r.stars);
      });
      Object.keys(rMap).forEach((k) => { rMap[k].avg = rMap[k].avg / rMap[k].count; });

      const aMap: AllocationsMap = {};
      ((membersRes.data ?? []) as MemberRow[]).forEach((m) => {
        if (m.projects?.completed === false) {
          if (!aMap[m.name]) aMap[m.name] = [];
          const pId = m.projects?.id;
          const pName = m.projects?.name;
          if (pId && pName && !aMap[m.name].some((x) => x.id === pId)) {
            aMap[m.name].push({ id: pId, name: pName });
          }
        }
      });

      return { professionals: profs, ratingsMap: rMap, allocationsMap: aMap };
    },
  });

  const fetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["professionals-list"] });
  }, [queryClient]);

  const patchProfessionals = useCallback(
    (updater: (prev: Professional[]) => Professional[]) => {
      queryClient.setQueryData<ProfessionalsPayload>(queryKey, (prev) =>
        prev ? { ...prev, professionals: updater(prev.professionals) } : prev
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, user?.id]
  );

  const toggleFavorite = useCallback(async (id: string, current: boolean) => {
    const next = !current;
    patchProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, favorite: next } : p));
    const { error } = await supabase.from("professionals").update({ favorite: next }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar favorito");
      patchProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, favorite: current } : p));
      return;
    }
    toast.success(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
  }, [patchProfessionals]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return false;
    }
    toast.success("Contato removido da sua lista.");
    fetchAll();
    return true;
  }, [fetchAll]);

  return {
    professionals: data.professionals,
    ratingsMap: data.ratingsMap,
    allocationsMap: data.allocationsMap,
    loading: isLoading,
    refetch: fetchAll,
    toggleFavorite,
    remove,
  };
}
