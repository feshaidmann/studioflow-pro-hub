import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ApplicationStatus = "interesse" | "preparando" | "inscrito" | "resultado";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  interesse: "Interesse",
  preparando: "Preparando",
  inscrito: "Inscrito",
  resultado: "Resultado",
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  interesse: "bg-primary/15 text-primary border-primary/30 font-medium",
  preparando: "bg-warning/20 text-warning-foreground border-warning/40 font-medium",
  inscrito: "bg-success/20 text-success border-success/40 font-medium",
  resultado: "bg-accent/15 text-accent-foreground border-accent/30 font-medium",
};

export type ResultadoType = "aprovado" | "reprovado" | "lista_espera" | "desistencia";

export const RESULTADO_LABELS: Record<ResultadoType, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  lista_espera: "Lista de espera",
  desistencia: "Desistência",
};

export const RESULTADO_COLORS: Record<ResultadoType, string> = {
  aprovado: "bg-success/20 text-success border-success/40 font-medium",
  reprovado: "bg-destructive/15 text-destructive border-destructive/30 font-medium",
  lista_espera: "bg-warning/20 text-warning-foreground border-warning/40 font-medium",
  desistencia: "bg-muted text-muted-foreground border-border",
};

export interface EditalApplication {
  id: string;
  user_id: string;
  edital_id: string;
  project_id: string | null;
  status: ApplicationStatus;
  notas: string;
  data_inscricao: string | null;
  data_resultado: string | null;
  resultado: ResultadoType | null;
  valor_aprovado: number | null;
  motivo_recusa: string | null;
  licoes_aprendidas: string | null;
  created_at: string;
  updated_at: string;
  edital?: {
    id: string;
    titulo: string;
    orgao: string | null;
    estado: string | null;
    status: string | null;
    prazo: string | null;
    link: string | null;
    area: string | null;
    tipo: string | null;
    resumo?: string | null;
  };
}

export function useEditalApplications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["edital-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edital_applications")
        .select("*, edital:editais(id, titulo, orgao, estado, status, prazo, link, area, tipo, resumo)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EditalApplication[];
    },
    enabled: !!user,
  });

  return query;
}

export function useCreateApplication() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { edital_id: string; project_id?: string | null; notas?: string; data_inscricao?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("edital_applications")
        .insert({
          user_id: user.id,
          edital_id: params.edital_id,
          project_id: params.project_id || null,
          notas: params.notas || "",
          status: "interesse",
          data_inscricao: params.data_inscricao || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edital-applications"] });
      toast.success("Candidatura iniciada");
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate") || err?.code === "23505") {
        toast.error("Você já tem uma candidatura para este edital");
      } else {
        toast.error("Erro ao iniciar candidatura");
      }
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; status?: ApplicationStatus; notas?: string; project_id?: string | null; data_inscricao?: string | null; data_resultado?: string | null; resultado?: ResultadoType | null; valor_aprovado?: number | null; motivo_recusa?: string; licoes_aprendidas?: string }) => {
      const { id, ...fields } = params;
      const { error } = await supabase
        .from("edital_applications")
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edital-applications"] });
      toast.success("Candidatura atualizada");
    },
    onError: () => toast.error("Erro ao atualizar candidatura"),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("edital_applications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edital-applications"] });
      toast.success("Candidatura removida");
    },
    onError: () => toast.error("Erro ao remover candidatura"),
  });
}
