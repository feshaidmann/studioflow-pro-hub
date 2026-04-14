import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FonteEdital {
  id: string;
  user_id: string;
  nome: string;
  url_base: string;
  tipo: "rss" | "api" | "perplexity";
  parametros: Record<string, unknown>;
  ativo: boolean;
  ultima_busca: string | null;
  frequencia_horas: number;
  created_at: string;
}

export type FonteEditalInsert = Omit<FonteEdital, "id" | "user_id" | "created_at" | "ultima_busca">;

export function useFontesEditais() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fontes, setFontes] = useState<FonteEdital[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchFontes = useCallback(async () => {
    if (!user) { setFontes([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fontes_editais")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFontes((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching fontes:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchFontes(); }, [fetchFontes]);

  const addFonte = useCallback(async (fonte: FonteEditalInsert) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("fontes_editais").insert({
        user_id: user.id,
        nome: fonte.nome,
        url_base: fonte.url_base,
        tipo: fonte.tipo,
        parametros: fonte.parametros as any,
        ativo: fonte.ativo,
        frequencia_horas: fonte.frequencia_horas,
      } as any);
      if (error) throw error;
      toast({ title: "Fonte adicionada" });
      await fetchFontes();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar fonte", description: err.message, variant: "destructive" });
    }
  }, [user, toast, fetchFontes]);

  const updateFonte = useCallback(async (id: string, fields: Partial<FonteEditalInsert>) => {
    try {
      const { error } = await supabase.from("fontes_editais").update(fields as any).eq("id", id);
      if (error) throw error;
      setFontes((prev) => prev.map((f) => (f.id === id ? { ...f, ...fields } : f)));
      toast({ title: "Fonte atualizada" });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const deleteFonte = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("fontes_editais").delete().eq("id", id);
      if (error) throw error;
      setFontes((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Fonte removida" });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const toggleAtivo = useCallback(async (id: string, ativo: boolean) => {
    await updateFonte(id, { ativo } as any);
  }, [updateFonte]);

  const testFonte = useCallback(async (id: string) => {
    setTesting(id);
    try {
      const { data, error } = await supabase.functions.invoke("edital-monitor", {
        body: { fonte_id: id },
      });
      if (error) throw error;
      toast({
        title: "Teste concluído",
        description: `${data?.newEditais || 0} novo(s) edital(is) encontrado(s)`,
      });
      await fetchFontes();
    } catch (err: any) {
      toast({ title: "Erro no teste", description: err.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  }, [toast, fetchFontes]);

  return { fontes, loading, testing, addFonte, updateFonte, deleteFonte, toggleAtivo, testFonte };
}
