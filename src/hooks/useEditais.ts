import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Edital {
  id?: string;
  titulo: string;
  orgao: string;
  estado: string;
  area: string;
  status: string;
  abertura: string | null;
  prazo: string | null;
  link: string;
  origem_url: string;
  inferido: boolean;
  session_key: string;
  project_id?: string | null;
  created_at?: string;
}

export interface SearchResult {
  message: string;
  editais: Edital[];
  session_key_list: string[];
  citations: string[];
}

export function useEditais(projectId?: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Fetch saved editais
  const fetchEditais = useCallback(async () => {
    if (!user) { setEditais([]); setLoading(false); return; }
    setLoading(true);
    try {
      let q = supabase.from("editais").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      setEditais((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching editais:", err);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => { fetchEditais(); }, [fetchEditais]);

  const search = useCallback(async (query: string, sources?: string[], linkedProjectId?: string) => {
    if (!user) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("edital-search", {
        body: { query, sources, project_id: linkedProjectId },
      });
      if (error) throw error;
      setSearchResult(data as SearchResult);
    } catch (err: any) {
      console.error("Search error:", err);
      toast({ title: "Erro na busca", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }, [user, toast]);

  const saveResults = useCallback(async (items: Edital[], linkedProjectId?: string | null) => {
    if (!user || items.length === 0) return;
    try {
      const rows = items.map((e) => ({
        user_id: user.id,
        project_id: linkedProjectId || null,
        titulo: e.titulo,
        orgao: e.orgao,
        estado: e.estado,
        area: e.area,
        status: e.status,
        abertura: e.abertura || null,
        prazo: e.prazo || null,
        link: e.link,
        origem_url: e.origem_url,
        inferido: e.inferido,
        session_key: e.session_key,
      }));
      // Use plain insert — partial unique indexes don't support onConflict upsert
      const { error } = await supabase.from("editais").insert(rows as any);
      if (error) throw error;
      toast({ title: "Editais salvos!", description: `${items.length} edital(is) salvo(s).` });
      await fetchEditais();
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  }, [user, toast, fetchEditais]);

  const deleteEdital = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("editais").delete().eq("id", id);
      if (error) throw error;
      setEditais((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Edital removido" });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const updateEdital = useCallback(async (id: string, fields: Partial<Edital>) => {
    try {
      const { error } = await supabase.from("editais").update(fields as any).eq("id", id);
      if (error) throw error;
      setEditais((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields } : e)));
      toast({ title: "Edital atualizado" });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const exportCSV = useCallback((items: Edital[]) => {
    const header = "Título;Estado;Órgão;Abertura;Prazo;Status;Área;Link";
    const rows = items.map((e) =>
      [e.titulo, e.estado, e.orgao, e.abertura || "—", e.prazo || "—", e.status, e.area, e.link]
        .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
        .join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jamsession_editais_culturais_oficial.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    editais,
    loading,
    searching,
    searchResult,
    search,
    saveResults,
    deleteEdital,
    updateEdital,
    exportCSV,
  };
}
