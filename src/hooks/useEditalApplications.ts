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
  opportunity_id: string;
  /** Alias retrocompatível para opportunity_id */
  edital_id: string;
  tipo: "fomento" | "palco";
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
  /** Sintetizado pela RPC list_user_applications (edital ou palco) */
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
    link_status?: "ok" | "broken" | "unknown" | null;
    link_checked_at?: string | null;
  };
}

interface RPCRow {
  id: string;
  user_id: string;
  opportunity_id: string;
  tipo: "fomento" | "palco";
  status: ApplicationStatus;
  notas: string;
  data_inscricao: string | null;
  data_resultado: string | null;
  resultado: ResultadoType | null;
  valor_aprovado: number | null;
  motivo_recusa: string | null;
  licoes_aprendidas: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  titulo: string | null;
  orgao: string | null;
  estado: string | null;
  area: string | null;
  prazo: string | null;
  link: string | null;
  resumo: string | null;
  link_status: "ok" | "broken" | "unknown" | null;
  link_checked_at: string | null;
}

export function useEditalApplications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["edital-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_user_applications" as any);
      if (error) throw error;
      return ((data || []) as RPCRow[]).map((r): EditalApplication => ({
        id: r.id,
        user_id: r.user_id,
        opportunity_id: r.opportunity_id,
        edital_id: r.opportunity_id,
        tipo: r.tipo,
        project_id: r.project_id,
        status: r.status,
        notas: r.notas,
        data_inscricao: r.data_inscricao,
        data_resultado: r.data_resultado,
        resultado: r.resultado,
        valor_aprovado: r.valor_aprovado,
        motivo_recusa: r.motivo_recusa,
        licoes_aprendidas: r.licoes_aprendidas,
        created_at: r.created_at,
        updated_at: r.updated_at,
        edital: {
          id: r.opportunity_id,
          titulo: r.titulo || "Oportunidade removida",
          orgao: r.orgao,
          estado: r.estado,
          status: r.tipo === "palco" ? (r.area || null) : null,
          prazo: r.prazo,
          link: r.link,
          area: r.area,
          tipo: r.tipo === "palco" ? "palco" : "fomento",
          resumo: r.resumo,
        },
      }));
    },
    enabled: !!user,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      opportunity_id: string;
      tipo: "fomento" | "palco";
      project_id?: string | null;
      notas?: string;
      data_inscricao?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("edital_applications")
        .insert({
          user_id: user.id,
          opportunity_id: params.opportunity_id,
          tipo: params.tipo,
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
