import { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload } from "lucide-react";

interface UploadEditalPanelProps {
  fileInputRef: RefObject<HTMLInputElement>;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  extracting: boolean;
  onExtract: () => void;
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Painel reutilizável de upload manual do edital (PDF/DOC/DOCX/TXT, até 10 MB).
 * Usado: (1) na tela de fallback quando o scraping do link falha,
 *        (2) durante o loading da auto-extração (atalho para quem já tem o PDF),
 *        (3) ao lado do formulário extraído (para re-extrair com fonte oficial).
 */
export function UploadEditalPanel({
  fileInputRef,
  selectedFile,
  setSelectedFile,
  extracting,
  onExtract,
  className = "",
  title = "Ou envie o edital manualmente",
  description = "Baixe o PDF do edital e envie aqui — a IA lê o arquivo direto. PDF, DOC, DOCX ou TXT, até 10 MB.",
}: UploadEditalPanelProps) {
  return (
    <div className={`w-full max-w-sm space-y-3 ${className}`}>
      <div>
        <Label className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setSelectedFile(f);
        }}
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={extracting}
        type="button"
      >
        <FileText className="h-4 w-4 mr-1.5" />
        {selectedFile ? selectedFile.name : "Escolher arquivo"}
      </Button>
      <Button
        className="w-full"
        disabled={!selectedFile || extracting}
        onClick={onExtract}
        type="button"
      >
        <Upload className="h-4 w-4 mr-1.5" />
        Extrair do arquivo
      </Button>
    </div>
  );
}
