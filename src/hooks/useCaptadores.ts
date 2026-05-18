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
    let q = (supabase as any)
      .from("profiles")
      .select("id, display_name, username, bio, city, state, public_email, whatsapp, avatar_url, captador_verificado, captador_palco_tipos, captador_generos, captador_regioes, captador_porte, captador_taxa")
      .eq("is_captador", true)
      .eq("allow_global_listing", true)
      .order("captador_verificado", { ascending: false })
      .order("display_name");

    if (filters.palcoTipo) q = q.contains("captador_palco_tipos", [filters.palcoTipo]);
    if (filters.genero) q = q.contains("captador_generos", [filters.genero]);
    if (filters.regiao) q = q.contains("captador_regioes", [filters.regiao]);
    if (filters.porte) q = q.contains("captador_porte", [filters.porte]);
    if (filters.verifiedOnly) q = q.eq("captador_verificado", true);

    const { data: rows, error } = await q.limit(100);
    if (error) console.warn("[useCaptadores]", error);
    let list = (rows as CaptadorProfile[] | null) ?? [];
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
