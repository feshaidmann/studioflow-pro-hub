import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CaptadorProfile {
  id: string;
  display_name: string;
  username: string | null;
  bio: string;
  city: string;
  state: string | null;
  public_email: string;
  whatsapp: string;
  avatar_url: string | null;
  captador_verificado: boolean;
  captador_palco_tipos: string[];
  captador_generos: string[];
  captador_regioes: string[];
  captador_porte: string[];
  captador_taxa: string;
}

export interface CaptadorFilters {
  search?: string;
  palcoTipo?: string;
  genero?: string;
  regiao?: string;
  porte?: string;
  verifiedOnly?: boolean;
}

export function useCaptadores(filters: CaptadorFilters) {
  const [data, setData] = useState<CaptadorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any).rpc("get_public_captadores");
    if (error) console.warn("[useCaptadores]", error);
    let list = ((rows as CaptadorProfile[] | null) ?? []).filter((p) => {
      if (filters.palcoTipo && !(p.captador_palco_tipos || []).includes(filters.palcoTipo)) return false;
      if (filters.genero && !(p.captador_generos || []).includes(filters.genero)) return false;
      if (filters.regiao && !(p.captador_regioes || []).includes(filters.regiao)) return false;
      if (filters.porte && !(p.captador_porte || []).includes(filters.porte)) return false;
      if (filters.verifiedOnly && !p.captador_verificado) return false;
      return true;
    }).slice(0, 100);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter((p) =>
        (p.display_name || "").toLowerCase().includes(s) ||
        (p.city || "").toLowerCase().includes(s) ||
        (p.bio || "").toLowerCase().includes(s),
      );
    }
    setData(list);
    setLoading(false);
  }, [filters.search, filters.palcoTipo, filters.genero, filters.regiao, filters.porte, filters.verifiedOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
