import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ApplicationDoc } from "@/types/editais";

export function useApplicationDocs(applicationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["application-docs", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edital_application_docs")
        .select("*")
        .eq("application_id", applicationId!)
        .order("is_required", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ApplicationDoc[];
    },
    enabled: !!user && !!applicationId,
  });
}

export function useAddApplicationDoc() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      application_id: string;
      doc_label: string;
      doc_type?: string | null;
      is_required?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("edital_application_docs")
        .insert({
          user_id: user.id,
          application_id: params.application_id,
          doc_label: params.doc_label,
          doc_type: params.doc_type || null,
          is_required: params.is_required ?? true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-docs"] });
      toast.success("Item adicionado ao checklist");
    },
    onError: () => toast.error("Erro ao adicionar item"),
  });
}

export function useToggleDocCompleted() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("edital_application_docs")
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-docs"] });
    },
  });
}

export function useLinkDocumentToAppDoc() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appDocId,
      editalDocumentId,
      customContent,
    }: {
      appDocId: string;
      editalDocumentId?: string;
      customContent?: string;
    }) => {
      const { error } = await supabase
        .from("edital_application_docs")
        .update({
          edital_document_id: editalDocumentId || null,
          custom_content: customContent || null,
          is_completed: true,
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", appDocId);
      if (error) throw error;

      if (editalDocumentId) {
        await supabase
          .from("edital_documents")
          .update({ last_used_at: new Date().toISOString() } as any)
          .eq("id", editalDocumentId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-docs"] });
      qc.invalidateQueries({ queryKey: ["edital-documents"] });
      toast.success("Documento vinculado");
    },
    onError: () => toast.error("Erro ao vincular documento"),
  });
}

export function useDeleteApplicationDoc() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("edital_application_docs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-docs"] });
      toast.success("Item removido do checklist");
    },
  });
}
