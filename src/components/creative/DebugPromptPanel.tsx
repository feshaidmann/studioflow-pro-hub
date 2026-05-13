import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface DebugPromptPayload {
  debug: true;
  model: string;
  wantsText: boolean;
  noText: boolean;
  fields: {
    trackName: string | null;
    artistName: string | null;
    releaseDate: string | null;
    additionalText: string | null;
  };
  format: string;
  width: number;
  height: number;
  style: string | null;
  systemPrompt: string;
  textDirectives: string[];
  userPrompt: string;
  messagesPreview: any[];
}

interface Props {
  payload: DebugPromptPayload;
  onClose: () => void;
  onGenerateForReal?: () => void;
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={copy}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="text-[11px] leading-relaxed bg-muted/60 border border-border rounded-md p-3 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-foreground">
        {value || <span className="text-muted-foreground italic">(vazio)</span>}
      </pre>
    </div>
  );
}

export function DebugPromptPanel({ payload, onClose, onGenerateForReal }: Props) {
  const f = payload.fields;
  return (
    <Card className="p-4 space-y-4 border-dashed">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Debug do prompt</div>
          <div className="text-xs text-muted-foreground">
            Nada foi gerado. Estes são exatamente os textos enviados ao modelo.
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">model: {payload.model}</Badge>
        <Badge variant={payload.wantsText ? "default" : "outline"} className="text-[10px]">
          wantsText: {String(payload.wantsText)}
        </Badge>
        <Badge variant={payload.noText ? "default" : "outline"} className="text-[10px]">
          noText: {String(payload.noText)}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {payload.format} {payload.width}×{payload.height}
        </Badge>
        {payload.style && (
          <Badge variant="outline" className="text-[10px]">style: {payload.style}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-muted/40 rounded p-2">
          <div className="text-muted-foreground">trackName</div>
          <div className="font-mono break-all">{f.trackName || "—"}</div>
        </div>
        <div className="bg-muted/40 rounded p-2">
          <div className="text-muted-foreground">artistName</div>
          <div className="font-mono break-all">{f.artistName || "—"}</div>
        </div>
        <div className="bg-muted/40 rounded p-2">
          <div className="text-muted-foreground">releaseDate</div>
          <div className="font-mono break-all">{f.releaseDate || "—"}</div>
        </div>
        <div className="bg-muted/40 rounded p-2">
          <div className="text-muted-foreground">additionalText</div>
          <div className="font-mono break-all">{f.additionalText || "—"}</div>
        </div>
      </div>

      {!payload.wantsText && !payload.noText && (
        <div className="text-[11px] rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">
          Atenção: nenhum campo de texto foi preenchido e "Sem texto" está desligado.
          Sem trackName / artistName / additionalText, o modelo NÃO recebe diretiva
          de tipografia e por isso gera arte puramente visual.
        </div>
      )}

      <CopyBlock label="System prompt" value={payload.systemPrompt} />

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Diretivas de texto ({payload.textDirectives.length})
        </span>
        {payload.textDirectives.length === 0 ? (
          <div className="text-[11px] text-muted-foreground italic px-3 py-2 bg-muted/40 rounded">
            Nenhuma diretiva de texto enviada.
          </div>
        ) : (
          <ul className="text-[11px] space-y-1 bg-muted/60 border border-border rounded-md p-3 font-mono">
            {payload.textDirectives.map((d, i) => (
              <li key={i} className="whitespace-pre-wrap">{d}</li>
            ))}
          </ul>
        )}
      </div>

      <CopyBlock label="User prompt (final)" value={payload.userPrompt} />

      {onGenerateForReal && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onGenerateForReal}>
            Gerar de verdade agora
          </Button>
        </div>
      )}
    </Card>
  );
}
