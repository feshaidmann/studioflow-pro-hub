import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EditalAnalysis {
  resumo: string;
  prazos: Array<{ label: string; data: string; observacao?: string }>;
  documentos: string[];
  valor?: string;
  publico_alvo?: string;
  carta_sugerida: string;
}

export interface AnalyzeInput {
  source: { type: "file"; file: File } | { type: "text"; text: string };
  editalId?: string;
  editalTitle?: string;
  projectId?: string;
}

async function fileToBase64(file: File): Promise<{ base64: string; mime_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1] || "";
      resolve({ base64, mime_type: file.type || "application/octet-stream" });
    };
    reader.readAsDataURL(file);
  });
}

export function useEditalAnalysis() {
  const [analysis, setAnalysis] = useState<EditalAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const analyze = useCallback(async (input: AnalyzeInput) => {
    setAnalyzing(true);
    setWarning(null);
    try {
      const body: Record<string, unknown> = {
        edital_id: input.editalId,
        edital_title: input.editalTitle,
        project_id: input.projectId,
      };
      if (input.source.type === "file") {
        body.file = await fileToBase64(input.source.file);
      } else {
        body.text = input.source.text;
      }

      const { data, error } = await supabase.functions.invoke("analyze-edital", { body });
      if (error) {
        toast.error(error.message || "Falha ao analisar edital");
        return null;
      }
      if (data?.error) {
        toast.error(data.error);
        return null;
      }
      if (data?.warning) {
        setWarning(data.warning);
        toast.warning(data.warning);
      }
      const result = data?.analise as EditalAnalysis | undefined;
      if (!result) {
        toast.error("Resposta vazia da IA");
        return null;
      }
      setAnalysis(result);
      return result;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const loadFromApplication = useCallback((stored: unknown) => {
    if (stored && typeof stored === "object") {
      setAnalysis(stored as EditalAnalysis);
    }
  }, []);

  const clear = useCallback(() => {
    setAnalysis(null);
    setWarning(null);
  }, []);

  return { analysis, analyzing, warning, analyze, loadFromApplication, clear };
}
