import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface EditalField {
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  descricao: string;
  opcoes: string[] | null;
}

export interface ExtractedFields {
  campos: EditalField[];
  resumo_edital: string;
  documentos_exigidos: string[];
}

export interface Rascunho {
  id: string;
  edital_id: string | null;
  project_id: string | null;
  campos: Record<string, string>;
  progresso: number;
  created_at: string;
  updated_at: string;
}

export function useRascunhoEdital() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [saving, setSaving] = useState(false);

  const extractFields = useCallback(async (url?: string, titulo?: string) => {
    if (!user) return;
    setExtracting(true);
    setExtractedFields(null);
    try {
      const { data, error } = await supabase.functions.invoke("extract-edital-fields", {
        body: { url, titulo },
      });
      if (error) throw error;
      setExtractedFields(data as ExtractedFields);
    } catch (err: any) {
      console.error("Extract error:", err);
      toast({ title: "Erro ao extrair campos", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  }, [user, toast]);

  const saveRascunho = useCallback(async (
    editalId: string | null,
    projectId: string | null,
    campos: Record<string, string>,
    progresso: number,
    existingId?: string,
  ) => {
    if (!user) return null;
    setSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from("rascunhos_editais")
          .update({ campos, progresso, updated_at: new Date().toISOString() } as any)
          .eq("id", existingId);
        if (error) throw error;
        return existingId;
      } else {
        const { data, error } = await supabase
          .from("rascunhos_editais")
          .insert({
            user_id: user.id,
            edital_id: editalId,
            project_id: projectId,
            campos,
            progresso,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        return (data as any)?.id || null;
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar rascunho", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  const loadRascunho = useCallback(async (editalId: string): Promise<Rascunho | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("rascunhos_editais")
        .select("*")
        .eq("edital_id", editalId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    } catch {
      return null;
    }
  }, [user]);

  return { extracting, extractedFields, extractFields, saving, saveRascunho, loadRascunho };
}
