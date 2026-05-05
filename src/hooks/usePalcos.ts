import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type TipoPalco = "festival" | "showcase" | "circuito" | "residencia" | "abertura";

export const TIPO_PALCO_LABELS: Record<TipoPalco, string> = {
  festival:   "Festival",
  showcase:   "Showcase",
  circuito:   "Circuito / Programação",
  residencia: "Residência Musical",
  abertura:   "Abertura de Show",
};

export const TIPO_PALCO_COLORS: Record<TipoPalco, string> = {
  festival:   "bg-primary/15 text-primary border-primary/30",
  showcase:   "bg-amber-500/15 text-amber-700 border-amber-200",
  circuito:   "bg-blue-500/15 text-blue-700 border-blue-200",
  residencia: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  abertura:   "bg-purple-500/15 text-purple-700 border-purple-200",
};

export type Porte = "iniciante" | "medio" | "grande";
export const PORTE_LABELS: Record<Porte, string> = {
  iniciante: "Iniciante (até 1k)",
  medio:     "Médio (1k–10k)",
  grande:    "Grande (10k+)",
};

export interface PalcoCurado {
  id: string;
  nome: string;
  organizador: string;
  tipo_palco: TipoPalco;
  estado: string | null;
  generos: string[];
  porte: Porte;
  tem_edital: boolean;
  link: string | null;
  prazo: string | null;
  status: "Aberto" | "Encerrado" | "Previsto";
  periodo_inscricao: string | null;
  cachet_medio: string | null;
  publico_estimado: string | null;
  resumo: string | null;
  ativo: boolean;
}

export interface PalcoSearchResult {
  message: string;
  palcos: PalcoCurado[];
  citations: string[];
}

// ── Hook principal ───────────────────────────────────────────────────────────

export function usePalcos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [palcosCurados, setPalcosCurados] = useState<PalcoCurado[]>([]);
  const [loadingCurados, setLoadingCurados] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<PalcoSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

  // ── Banco curado ─────────────────────────────────────────────────────────
  const fetchCurados = useCallback(async () => {
    setLoadingCurados(true);
    try {
      const { data, error } = await supabase
        .from("palcos_curados")
        .select("*")
        .eq("ativo", true)
        .order("status", { ascending: true }) // Aberto primeiro
        .order("nome", { ascending: true });
      if (error) throw error;
      setPalcosCurados((data || []) as PalcoCurado[]);
    } catch (err) {
      console.error("Error fetching palcos curados:", err);
    } finally {
      setLoadingCurados(false);
    }
  }, []);

  useEffect(() => { fetchCurados(); }, [fetchCurados]);

  // ── Busca via IA ─────────────────────────────────────────────────────────
  const search = useCallback(async (query: string, projectId?: string | null) => {
    if (!user) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError(null);
    setLastQuery(query);
    setLastProjectId(projectId || null);
    try {
      const { data, error } = await supabase.functions.invoke("palco-search", {
        body: { query, project_id: projectId || null },
      });
      if (error) throw error;
      setSearchResult(data as PalcoSearchResult);
    } catch (err: any) {
      console.error("Palco search error:", err);
      const msg = err?.message || "Não foi possível buscar agora. Tente novamente em instantes.";
      setSearchError(msg);
      toast({
        title: "Erro na busca",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }, [user, toast]);

  const retryLastSearch = useCallback(() => {
    if (lastQuery) void search(lastQuery, lastProjectId);
  }, [lastQuery, lastProjectId, search]);

  // ── Salvar resultado de busca no pipeline ────────────────────────────────
  const saveResults = useCallback(async (
    palcos: PalcoCurado[],
    projectId?: string | null
  ) => {
    if (!user || palcos.length === 0) return;
    try {
      const sessionKeys = palcos
        .map((p) => `${p.nome}_${p.organizador}`.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_"))
        .filter(Boolean);

      let existingKeys = new Set<string>();
      if (sessionKeys.length > 0) {
        const { data: existing } = await supabase
          .from("editais")
          .select("session_key")
          .in("session_key", sessionKeys)
          .eq("user_id", user.id);
        existingKeys = new Set((existing || []).map((e: any) => e.session_key));
      }

      const newItems = palcos.filter((p) => {
        const sk = `${p.nome}_${p.organizador}`.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
        return !existingKeys.has(sk);
      });

      if (newItems.length === 0) {
        toast({ title: "Oportunidades já salvas", description: "Todos os itens já estão na sua lista." });
        return;
      }

      const rows = newItems.map((p) => ({
        user_id: user.id,
        project_id: projectId || null,
        tipo: "palco" as const,
        titulo: p.nome,
        orgao: p.organizador,
        estado: p.estado || "",
        area: "Música",
        status: p.status || "Previsto",
        abertura: null,
        prazo: p.prazo || null,
        link: p.link || "",
        origem_url: p.link || "",
        inferido: false,
        session_key: `${p.nome}_${p.organizador}`.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_"),
        valor: p.cachet_medio || "",
        publico_alvo: p.publico_estimado || "",
        resumo: p.resumo || "",
        documentos_resumo: "",
      }));

      const { error } = await supabase.from("editais").insert(rows as any);
      if (error) throw error;
      toast({ title: `${newItems.length} oportunidade(s) salva(s)!` });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  }, [user, toast]);

  // ── Match por perfil cultural (mesmo algoritmo de match-editais) ─────────
  const matchByPerfil = useCallback((
    perfil: { areas?: string[]; estados?: string[]; palavras_chave?: string[] },
    generosProjeto?: string[]
  ): Array<PalcoCurado & { score: number }> => {
    return palcosCurados
      .map((palco) => {
        let score = 0;

        // Status bonus
        if (palco.status === "Aberto") score += 5;
        else if (palco.status === "Previsto") score += 2;

        // Gênero match — mais importante para palcos
        if (generosProjeto && generosProjeto.length > 0) {
          const hits = palco.generos.filter((g) =>
            generosProjeto.some((pg) => pg.toLowerCase() === g.toLowerCase())
          ).length;
          score += hits * 8;
        }

        // Estado match
        if (perfil.estados && perfil.estados.length > 0) {
          const estado = (palco.estado || "").toLowerCase();
          if (estado === "nacional" || estado === "") score += 3;
          else if (perfil.estados.some((e) => estado.includes(e.toLowerCase()))) score += 6;
        }

        // Keyword match no nome/organizador/resumo
        if (perfil.palavras_chave && perfil.palavras_chave.length > 0) {
          const text = `${palco.nome} ${palco.organizador} ${palco.resumo || ""}`.toLowerCase();
          for (const kw of perfil.palavras_chave) {
            if (text.includes(kw.toLowerCase())) score += 2;
          }
        }

        return { ...palco, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [palcosCurados]);

  return {
    palcosCurados,
    loadingCurados,
    searching,
    searchResult,
    searchError,
    lastQuery,
    search,
    retryLastSearch,
    saveResults,
    matchByPerfil,
    refreshCurados: fetchCurados,
  };
}
