import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type EditalDocType =
  | "bio"
  | "curriculo"
  | "portfolio"
  | "memorial"
  | "justificativa"
  | "projeto"
  | "outro";

export interface EditalDocument {
  id: string;
  user_id: string;
  doc_type: EditalDocType;
  title: string;
  content: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DOC_TYPE_LABELS: Record<EditalDocType, string> = {
  bio: "Biografia",
  curriculo: "Currículo",
  portfolio: "Portfólio",
  memorial: "Memorial",
  justificativa: "Justificativa",
  projeto: "Projeto",
  outro: "Outro",
};

export interface UpsertDocInput {
  id?: string;
  doc_type: EditalDocType;
  title: string;
  content: string;
}

export function useEditalDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<EditalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("edital_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar documentos: " + error.message);
      setDocuments([]);
    } else {
      setDocuments((data ?? []) as EditalDocument[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveDocument = useCallback(
    async (input: UpsertDocInput) => {
      if (!user) return null;
      setSaving(true);
      try {
        if (input.id) {
          const { data, error } = await supabase
            .from("edital_documents")
            .update({
              doc_type: input.doc_type,
              title: input.title,
              content: input.content,
            })
            .eq("id", input.id)
            .eq("user_id", user.id)
            .select()
            .single();
          if (error) throw error;
          toast.success("Documento atualizado");
          await fetchAll();
          return data as EditalDocument;
        } else {
          const { data, error } = await supabase
            .from("edital_documents")
            .insert({
              user_id: user.id,
              doc_type: input.doc_type,
              title: input.title,
              content: input.content,
            })
            .select()
            .single();
          if (error) throw error;
          toast.success("Documento criado");
          await fetchAll();
          return data as EditalDocument;
        }
      } catch (e: any) {
        toast.error("Erro ao salvar: " + (e?.message ?? "desconhecido"));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [user, fetchAll],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("edital_documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        toast.error("Erro ao excluir: " + error.message);
        return;
      }
      toast.success("Documento removido");
      await fetchAll();
    },
    [user, fetchAll],
  );

  const markUsed = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase
        .from("edital_documents")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      await fetchAll();
    },
    [user, fetchAll],
  );

  return {
    documents,
    loading,
    saving,
    refresh: fetchAll,
    saveDocument,
    deleteDocument,
    markUsed,
  };
}
