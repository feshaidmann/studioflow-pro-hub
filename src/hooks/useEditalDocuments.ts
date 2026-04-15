import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DocType, EditalDocument } from "@/types/editais";

export function useEditalDocuments(docType?: DocType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["edital-documents", user?.id, docType],
    queryFn: async () => {
      let query = supabase
        .from("edital_documents")
        .select("*")
        .order("updated_at", { ascending: false });
      if (docType) query = query.eq("doc_type", docType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EditalDocument[];
    },
    enabled: !!user,
  });
}

export function useUpsertEditalDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      doc: { id?: string; doc_type: DocType; title: string; content: string; last_used_at?: string | null }
    ) => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        doc_type: doc.doc_type,
        title: doc.title,
        content: doc.content,
        ...(doc.last_used_at !== undefined && { last_used_at: doc.last_used_at }),
      };

      if (doc.id) {
        const { data, error } = await supabase
          .from("edital_documents")
          .update(payload as any)
          .eq("id", doc.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("edital_documents")
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edital-documents"] });
      toast.success("Documento salvo");
    },
    onError: () => toast.error("Erro ao salvar documento"),
  });
}

export function useDeleteEditalDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("edital_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edital-documents"] });
      toast.success("Documento removido");
    },
  });
}
