import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Professional, RatingsMap, AllocationsMap } from "@/components/professionals/types";

export function useProfessionalsList() {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [ratingsMap, setRatingsMap] = useState<RatingsMap>({});
  const [allocationsMap, setAllocationsMap] = useState<AllocationsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: profsData } = await supabase
      .from("professionals")
      .select("*")
      .order("name");
    const profs = (profsData as Professional[]) ?? [];
    setProfessionals(profs);

    if (profs.length === 0) {
      setRatingsMap({});
      setAllocationsMap({});
      setLoading(false);
      return;
    }

    const names = profs.map((p) => p.name);
    const [ratingsRes, membersRes] = await Promise.all([
      supabase
        .from("professional_ratings")
        .select("professional_name, stars")
        .eq("user_id", user.id)
        .in("professional_name", names),
      supabase
        .from("project_members")
        .select("name, project_id, projects:project_id(id, name, completed)")
        .eq("user_id", user.id)
        .in("name", names),
    ]);

    const rMap: RatingsMap = {};
    (ratingsRes.data as any[] ?? []).forEach((r: any) => {
      const k = r.professional_name;
      if (!rMap[k]) rMap[k] = { avg: 0, count: 0 };
      rMap[k].count++;
      rMap[k].avg += Number(r.stars);
    });
    Object.keys(rMap).forEach((k) => { rMap[k].avg = rMap[k].avg / rMap[k].count; });
    setRatingsMap(rMap);

    const aMap: AllocationsMap = {};
    (membersRes.data as any[] ?? []).forEach((m: any) => {
      if (m.projects?.completed === false) {
        if (!aMap[m.name]) aMap[m.name] = [];
        const pId = m.projects?.id as string | undefined;
        const pName = m.projects?.name as string | undefined;
        if (pId && pName && !aMap[m.name].some((x) => x.id === pId)) {
          aMap[m.name].push({ id: pId, name: pName });
        }
      }
    });
    setAllocationsMap(aMap);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) return;
      setLoading(true);
      const { data: profsData } = await supabase
        .from("professionals")
        .select("*")
        .order("name");
      if (!active) return;
      const profs = (profsData as Professional[]) ?? [];
      setProfessionals(profs);

      if (profs.length === 0) {
        setRatingsMap({});
        setAllocationsMap({});
        setLoading(false);
        return;
      }

      const names = profs.map((p) => p.name);
      const [ratingsRes, membersRes] = await Promise.all([
        supabase
          .from("professional_ratings")
          .select("professional_name, stars")
          .eq("user_id", user.id)
          .in("professional_name", names),
        supabase
          .from("project_members")
          .select("name, project_id, projects:project_id(id, name, completed)")
          .eq("user_id", user.id)
          .in("name", names),
      ]);
      if (!active) return;

      const rMap: RatingsMap = {};
      (ratingsRes.data as any[] ?? []).forEach((r: any) => {
        const k = r.professional_name;
        if (!rMap[k]) rMap[k] = { avg: 0, count: 0 };
        rMap[k].count++;
        rMap[k].avg += Number(r.stars);
      });
      Object.keys(rMap).forEach((k) => { rMap[k].avg = rMap[k].avg / rMap[k].count; });
      setRatingsMap(rMap);

      const aMap: AllocationsMap = {};
      (membersRes.data as any[] ?? []).forEach((m: any) => {
        if (m.projects?.completed === false) {
          if (!aMap[m.name]) aMap[m.name] = [];
          const pId = m.projects?.id as string | undefined;
          const pName = m.projects?.name as string | undefined;
          if (pId && pName && !aMap[m.name].some((x) => x.id === pId)) {
            aMap[m.name].push({ id: pId, name: pName });
          }
        }
      });
      setAllocationsMap(aMap);
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [user]);

  const toggleFavorite = useCallback(async (id: string, current: boolean) => {
    const next = !current;
    setProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, favorite: next } : p));
    const { error } = await supabase.from("professionals").update({ favorite: next } as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar favorito");
      setProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, favorite: current } : p));
      return;
    }
    toast.success(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
  }, []);

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

  return { professionals, ratingsMap, allocationsMap, loading, refetch: fetchAll, toggleFavorite, remove };
}
