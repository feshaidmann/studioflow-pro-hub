import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackAppEvent } from "@/lib/analytics";

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

export type ExtractCause =
  | "ok"
  | "auth_error"
  | "bad_request"
  | "no_perplexity_key"
  | "perplexity_upstream_error"
  | "perplexity_timeout"
  | "empty_response"
  | "invalid_json"
  | "no_fields_extracted"
  | "lovable_ai_error"
  | "file_too_large"
  | "unsupported_file_type"
  | "unknown_error";

export interface ExtractError {
  cause: ExtractCause;
  message: string;
  attempt: number;
  http_status?: number;
}

const CAUSE_PT: Record<ExtractCause, string> = {
  ok: "Sucesso",
  auth_error: "Sessão expirada — faça login novamente",
  bad_request: "Edital sem link, título ou arquivo suficiente",
  no_perplexity_key: "Integração de IA indisponível no momento",
  perplexity_upstream_error: "A IA não respondeu — tente novamente",
  perplexity_timeout: "A IA demorou demais — tente novamente",
  empty_response: "A IA não retornou conteúdo",
  invalid_json: "A IA não retornou um formulário válido",
  no_fields_extracted: "Não conseguimos identificar campos automaticamente",
  lovable_ai_error: "A IA falhou ao analisar o arquivo",
  file_too_large: "Arquivo excede 10 MB",
  unsupported_file_type: "Tipo de arquivo não suportado (use PDF, DOC, DOCX ou TXT)",
  unknown_error: "Erro inesperado",
};

const CAUSE_LABEL_SHORT: Record<ExtractCause, string> = {
  ok: "OK",
  auth_error: "Sessão",
  bad_request: "Entrada inválida",
  no_perplexity_key: "IA off",
  perplexity_upstream_error: "IA falhou",
  perplexity_timeout: "Timeout",
  empty_response: "Resposta vazia",
  invalid_json: "JSON inválido",
  no_fields_extracted: "Sem campos",
  lovable_ai_error: "IA arquivo",
  file_too_large: "Arquivo grande",
  unsupported_file_type: "Formato inválido",
  unknown_error: "Erro",
};

export const extractCauseLabel = (c: ExtractCause) => CAUSE_LABEL_SHORT[c] ?? "Erro";

const ALLOWED_FILE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any);
  }
  return btoa(binary);
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
  const [lastError, setLastError] = useState<ExtractError | null>(null);
  const attemptsRef = useRef<Map<string, number>>(new Map());

  const extractFields = useCallback(async (url?: string, titulo?: string, editalId?: string) => {
    if (!user) return;
    const key = editalId || url || titulo || "default";
    const attempt = (attemptsRef.current.get(key) ?? 0) + 1;
    attemptsRef.current.set(key, attempt);

    const startedAt = Date.now();
    setExtracting(true);
    setExtractedFields(null);
    setLastError(null);

    trackAppEvent("edital_extract_attempt", {
      attempt,
      has_url: !!url,
      has_titulo: !!titulo,
      edital_id: editalId ?? null,
    });

    const fail = (cause: ExtractCause, httpStatus?: number, extra?: Record<string, unknown>) => {
      const message = CAUSE_PT[cause];
      setLastError({ cause, message, attempt, http_status: httpStatus });
      toast({ title: "Não foi possível extrair", description: `${message} (tentativa ${attempt})`, variant: "destructive" });
      trackAppEvent("edital_extract_failed", {
        attempt,
        cause,
        http_status: httpStatus ?? null,
        duration_ms: Date.now() - startedAt,
        edital_id: editalId ?? null,
        ...(extra ?? {}),
      });
    };

    try {
      const { data, error } = await supabase.functions.invoke("extract-edital-fields", {
        body: { url, titulo },
      });
      if (error) {
        fail("unknown_error", (error as any)?.status, { error_message: error.message });
        return;
      }
      const payload = (data ?? {}) as Partial<ExtractedFields> & {
        cause?: ExtractCause;
        http_status?: number;
        fields_count?: number;
      };
      const cause: ExtractCause = payload.cause ?? "unknown_error";
      if (cause !== "ok") {
        fail(cause, payload.http_status);
        return;
      }
      setExtractedFields({
        campos: payload.campos ?? [],
        resumo_edital: payload.resumo_edital ?? "",
        documentos_exigidos: payload.documentos_exigidos ?? [],
      });
      trackAppEvent("edital_extract_succeeded", {
        attempt,
        duration_ms: Date.now() - startedAt,
        fields_count: payload.fields_count ?? (payload.campos?.length ?? 0),
        edital_id: editalId ?? null,
      });
    } catch (err: any) {
      console.error("Extract error:", err);
      fail("unknown_error", undefined, { error_message: err?.message });
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

  return { extracting, extractedFields, extractFields, saving, saveRascunho, loadRascunho, lastError };
}
