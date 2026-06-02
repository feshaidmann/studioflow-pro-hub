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
  /** true quando esgotamos MAX_ATTEMPTS de retry automático em erros transitórios */
  exhausted?: boolean;
}

export const MAX_EXTRACT_ATTEMPTS = 3;
/** Causas que justificam retry automático (instabilidade de upstream/IA). */
const TRANSIENT_CAUSES: ReadonlySet<ExtractCause> = new Set<ExtractCause>([
  "perplexity_timeout",
  "perplexity_upstream_error",
  "empty_response",
  "lovable_ai_error",
  "unknown_error",
]);
const RETRY_BACKOFF_MS = [1500, 3000];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const CAUSE_PT: Record<ExtractCause, string> = {
  ok: "Sucesso",
  auth_error: "Sessão expirada — faça login novamente",
  bad_request: "Faltou informação para a IA analisar o edital",
  no_perplexity_key: "Integração de IA indisponível no momento",
  perplexity_upstream_error: "A IA não conseguiu acessar o link do edital",
  perplexity_timeout: "A IA demorou demais para responder",
  empty_response: "A IA não retornou conteúdo sobre este edital",
  invalid_json: "A IA respondeu, mas não em formato de formulário",
  no_fields_extracted: "Não identificamos campos obrigatórios na página",
  lovable_ai_error: "A IA falhou ao analisar o arquivo enviado",
  file_too_large: "Arquivo excede o limite de 10 MB",
  unsupported_file_type: "Tipo de arquivo não suportado",
  unknown_error: "Erro inesperado ao consultar a IA",
};

export const CAUSE_GUIDANCE: Record<ExtractCause, string> = {
  ok: "",
  auth_error: "Saia e entre de novo na sua conta para renovar a sessão.",
  bad_request:
    "Cole a URL pública do edital (começando com https://) ou envie o PDF/DOC do regulamento pelo upload manual abaixo.",
  no_perplexity_key:
    "Nossa equipe foi avisada. Tente novamente em alguns minutos ou envie o PDF do regulamento pelo upload manual.",
  perplexity_upstream_error:
    "Confirme se o link abre em uma aba anônima sem precisar logar. Se o portal exige cadastro, baixe o PDF e use o upload manual abaixo.",
  perplexity_timeout:
    "A página deve estar lenta. Aguarde 30s e tente de novo — ou baixe o PDF do edital e envie pelo upload manual.",
  empty_response:
    "Troque por um link mais direto (página oficial do edital, não busca/portal genérico). Se preferir, envie o PDF pelo upload manual.",
  invalid_json:
    "Tente novamente. Se persistir, baixe o regulamento em PDF e use o upload manual abaixo — costuma funcionar melhor que o link.",
  no_fields_extracted:
    "A página provavelmente não contém o formulário em si. Procure o link do regulamento (geralmente PDF) e envie pelo upload manual abaixo.",
  lovable_ai_error:
    "Tente reenviar o arquivo. Se persistir, converta para PDF e envie novamente.",
  file_too_large:
    "Compacte o PDF (ex.: ilovepdf.com/compress_pdf) ou envie apenas as páginas do formulário e dos documentos exigidos.",
  unsupported_file_type:
    "Aceitamos apenas PDF, DOC, DOCX ou TXT. Converta o arquivo para um desses formatos e tente de novo.",
  unknown_error:
    "Tente de novo em alguns instantes. Se o problema persistir, envie o PDF do regulamento pelo upload manual abaixo.",
};

const CAUSE_LABEL_SHORT: Record<ExtractCause, string> = {
  ok: "OK",
  auth_error: "Sessão",
  bad_request: "Faltou link/arquivo",
  no_perplexity_key: "IA off",
  perplexity_upstream_error: "Link inacessível",
  perplexity_timeout: "Tempo esgotado",
  empty_response: "Resposta vazia",
  invalid_json: "Formato inválido",
  no_fields_extracted: "Sem campos",
  lovable_ai_error: "Falha no arquivo",
  file_too_large: "Arquivo grande",
  unsupported_file_type: "Formato inválido",
  unknown_error: "Erro",
};

export const extractCauseLabel = (c: ExtractCause) => CAUSE_LABEL_SHORT[c] ?? "Erro";
export const extractCauseGuidance = (c: ExtractCause) => CAUSE_GUIDANCE[c] ?? "";

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
  /** Tentativa atual (1..MAX_EXTRACT_ATTEMPTS) durante uma execução de extração. */
  const [attemptProgress, setAttemptProgress] = useState<{ current: number; max: number } | null>(null);
  const attemptsRef = useRef<Map<string, number>>(new Map());

  const runExtract = useCallback(async (
    key: string,
    source: "url" | "file",
    invokeBody: Record<string, unknown>,
    meta: { editalId?: string; has_url?: boolean; has_titulo?: boolean; file_mime?: string; file_size?: number },
  ) => {
    setExtracting(true);
    setExtractedFields(null);
    setLastError(null);

    let attempt = 0;
    let lastFailure: { cause: ExtractCause; httpStatus?: number; extra?: Record<string, unknown> } | null = null;

    try {
      while (attempt < MAX_EXTRACT_ATTEMPTS) {
        attempt += 1;
        attemptsRef.current.set(key, (attemptsRef.current.get(key) ?? 0) + 1);
        setAttemptProgress({ current: attempt, max: MAX_EXTRACT_ATTEMPTS });

        const startedAt = Date.now();
        trackAppEvent("edital_extract_attempt", {
          attempt,
          source,
          has_url: !!meta.has_url,
          has_titulo: !!meta.has_titulo,
          file_mime: meta.file_mime ?? null,
          file_size: meta.file_size ?? null,
          edital_id: meta.editalId ?? null,
        });

        let cause: ExtractCause = "unknown_error";
        let httpStatus: number | undefined;
        let extra: Record<string, unknown> | undefined;
        let payload: (Partial<ExtractedFields> & { fields_count?: number }) | null = null;

        try {
          const { data, error } = await supabase.functions.invoke("extract-edital-fields", {
            body: invokeBody,
          });
          if (error) {
            cause = "unknown_error";
            httpStatus = (error as any)?.status;
            extra = { error_message: error.message };
          } else {
            const p = (data ?? {}) as Partial<ExtractedFields> & {
              cause?: ExtractCause;
              http_status?: number;
              fields_count?: number;
            };
            cause = p.cause ?? "unknown_error";
            httpStatus = p.http_status;
            payload = p;
          }
        } catch (err: any) {
          console.error("Extract error:", err);
          cause = "unknown_error";
          extra = { error_message: err?.message };
        }

        // Sucesso → grava campos e encerra
        if (cause === "ok" && payload) {
          setExtractedFields({
            campos: payload.campos ?? [],
            resumo_edital: payload.resumo_edital ?? "",
            documentos_exigidos: payload.documentos_exigidos ?? [],
          });
          trackAppEvent("edital_extract_succeeded", {
            attempt,
            source,
            duration_ms: Date.now() - startedAt,
            fields_count: payload.fields_count ?? (payload.campos?.length ?? 0),
            edital_id: meta.editalId ?? null,
          });
          setLastError(null);
          return;
        }

        // Falha → registra evento
        lastFailure = { cause, httpStatus, extra };
        trackAppEvent("edital_extract_failed", {
          attempt,
          source,
          cause,
          http_status: httpStatus ?? null,
          duration_ms: Date.now() - startedAt,
          edital_id: meta.editalId ?? null,
          ...(extra ?? {}),
        });

        const isTransient = TRANSIENT_CAUSES.has(cause);
        const canRetry = isTransient && attempt < MAX_EXTRACT_ATTEMPTS;

        if (!canRetry) break;

        // Toast leve de retry para dar feedback ao usuário
        toast({
          title: `Tentando de novo (${attempt + 1}/${MAX_EXTRACT_ATTEMPTS})`,
          description: `${CAUSE_PT[cause]}. Reenviando em alguns segundos…`,
        });
        await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 3000);
      }

      // Esgotou as tentativas ou erro não-transitório
      if (lastFailure) {
        const { cause, httpStatus } = lastFailure;
        const message = CAUSE_PT[cause];
        const guidance = CAUSE_GUIDANCE[cause];
        const exhausted = TRANSIENT_CAUSES.has(cause) && attempt >= MAX_EXTRACT_ATTEMPTS;
        setLastError({ cause, message, attempt, http_status: httpStatus, exhausted });
        toast({
          title: exhausted
            ? `Falhou após ${MAX_EXTRACT_ATTEMPTS} tentativas`
            : "Não foi possível ler o edital",
          description: guidance ? `${message}. ${guidance}` : message,
          variant: "destructive",
        });
      }
    } finally {
      setExtracting(false);
      setAttemptProgress(null);
    }
  }, [toast]);


  const extractFields = useCallback(async (url?: string, titulo?: string, editalId?: string) => {
    if (!user) return;
    const cleanUrl = (url ?? "").trim();
    const cleanTitulo = (titulo ?? "").trim();

    if (!cleanUrl && !cleanTitulo) {
      const cause: ExtractCause = "bad_request";
      setLastError({ cause, message: CAUSE_PT[cause], attempt: 0 });
      toast({
        title: "Faltou o link ou título do edital",
        description: CAUSE_GUIDANCE[cause],
        variant: "destructive",
      });
      return;
    }

    if (cleanUrl) {
      try {
        const parsed = new URL(cleanUrl);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid_protocol");
      } catch {
        const cause: ExtractCause = "bad_request";
        const message = "Link inválido — use uma URL começando com https://";
        setLastError({ cause, message, attempt: 0 });
        toast({
          title: "Link inválido",
          description: `${message}. ${CAUSE_GUIDANCE[cause]}`,
          variant: "destructive",
        });
        return;
      }
    }

    const key = editalId || cleanUrl || cleanTitulo || "default";
    await runExtract(
      key,
      "url",
      { url: cleanUrl || undefined, titulo: cleanTitulo || undefined },
      { editalId, has_url: !!cleanUrl, has_titulo: !!cleanTitulo },
    );
  }, [user, toast, runExtract]);

  const extractFieldsFromText = useCallback(async (text: string, editalId?: string) => {
    if (!user) return;
    if (!text.trim()) {
      toast({
        title: "Cole o conteúdo do edital",
        description: "O campo de texto está vazio. Cole o regulamento antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    const key = `text:${editalId || "manual"}`;
    await runExtract(
      key,
      "file",
      { text },
      { editalId, has_url: false, has_titulo: false },
    );
  }, [user, toast, runExtract]);

  const setExtractedFieldsManual = useCallback((fields: ExtractedFields) => {
    setExtractedFields(fields);
  }, []);

  const extractFieldsFromFile = useCallback(async (file: File, editalId?: string) => {
    if (!user) return;

    if (!file) {
      const cause: ExtractCause = "bad_request";
      setLastError({ cause, message: "Nenhum arquivo selecionado", attempt: 0 });
      toast({
        title: "Selecione um arquivo",
        description: "Escolha o PDF/DOC do regulamento antes de clicar em extrair.",
        variant: "destructive",
      });
      return;
    }

    // Client-side validation
    if (!ALLOWED_FILE_MIME.has(file.type)) {
      const cause: ExtractCause = "unsupported_file_type";
      setLastError({ cause, message: CAUSE_PT[cause], attempt: 0 });
      toast({
        title: "Formato não suportado",
        description: `${CAUSE_PT[cause]}. ${CAUSE_GUIDANCE[cause]}`,
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      const cause: ExtractCause = "file_too_large";
      setLastError({ cause, message: CAUSE_PT[cause], attempt: 0 });
      toast({
        title: "Arquivo muito grande",
        description: `${CAUSE_PT[cause]}. ${CAUSE_GUIDANCE[cause]}`,
        variant: "destructive",
      });
      return;
    }

    let base64: string;
    try {
      base64 = await fileToBase64(file);
    } catch (err: any) {
      toast({
        title: "Não conseguimos ler o arquivo",
        description: `${err?.message ?? "Falha desconhecida"}. Verifique se ele não está corrompido e tente novamente.`,
        variant: "destructive",
      });
      return;
    }

    const key = `file:${editalId || file.name}`;
    await runExtract(
      key,
      "file",
      { file: { name: file.name, mime_type: file.type, base64 } },
      { editalId, file_mime: file.type, file_size: file.size },
    );
  }, [user, toast, runExtract]);



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

  return { extracting, extractedFields, extractFields, extractFieldsFromFile, extractFieldsFromText, setExtractedFieldsManual, saving, saveRascunho, loadRascunho, lastError, attemptProgress };
}
