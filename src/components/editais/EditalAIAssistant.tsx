import { useState, useEffect } from "react";
import { Sparkles, FileText, Languages, DollarSign, ClipboardList, Target, Copy, Loader2, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEditalAI, type AIAction, AI_ACTION_LABELS } from "@/hooks/useEditalAI";
import { useUpsertEditalDocument } from "@/hooks/useEditalDocuments";
import { toast } from "sonner";
import { AIMarkdownContent } from "@/components/ui/ai-markdown-content";

interface Project {
  id: string;
  name: string;
}

export interface AIContext {
  editalTitle?: string;
  editalType?: string;
  editalCriteria?: string;
  projectId?: string;
  projectName?: string;
  applicationId?: string;
  docType?: string;
  docLabel?: string;
}

interface Props {
  projects: Project[];
  context?: AIContext;
  defaultAction?: AIAction;
  onSaveToChecklist?: (content: string) => void;
}

const ACTIONS: { action: AIAction; icon: React.ReactNode; label: string }[] = [
  { action: "generate_memorial", icon: <FileText className="h-3.5 w-3.5" />, label: "Memorial" },
  { action: "adapt_language", icon: <Languages className="h-3.5 w-3.5" />, label: "Linguagem" },
  { action: "review_budget", icon: <DollarSign className="h-3.5 w-3.5" />, label: "Orçamento" },
  { action: "generate_checklist", icon: <ClipboardList className="h-3.5 w-3.5" />, label: "Checklist" },
  { action: "suggest_project_fit", icon: <Target className="h-3.5 w-3.5" />, label: "Fit" },
];

export default function EditalAIAssistant({ projects, context, defaultAction, onSaveToChecklist }: Props) {
  const { callAI, refine, isLoading, lastResult, setLastResult } = useEditalAI();
  const saveDocument = useUpsertEditalDocument();

  const [selectedAction, setSelectedAction] = useState<AIAction>(defaultAction || "generate_memorial");
  const [refineMode, setRefineMode] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");

  // Form fields — pre-populated from context
  const [editalTitle, setEditalTitle] = useState(context?.editalTitle || "");
  const [editalCriteria, setEditalCriteria] = useState(context?.editalCriteria || "");
  const [editalType, setEditalType] = useState(context?.editalType || "público");
  const [projectId, setProjectId] = useState(context?.projectId || "");
  const [originalText, setOriginalText] = useState("");
  const [maxWords, setMaxWords] = useState("1000");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [editalExcerpt, setEditalExcerpt] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  useEffect(() => {
    if (context?.editalTitle) setEditalTitle(context.editalTitle);
    if (context?.editalCriteria) setEditalCriteria(context.editalCriteria);
    if (context?.editalType) setEditalType(context.editalType);
    if (context?.projectId) setProjectId(context.projectId);
  }, [context]);

  useEffect(() => {
    if (defaultAction) setSelectedAction(defaultAction);
  }, [defaultAction]);

  const handleSubmit = async () => {
    let payload: Record<string, unknown> = {};

    if (selectedAction === "generate_memorial") {
      payload = {
        edital_title: editalTitle,
        edital_criteria: editalCriteria,
        project_id: projectId || undefined,
        max_words: parseInt(maxWords) || 1000,
        additional_context: additionalContext || undefined,
      };
    } else if (selectedAction === "adapt_language") {
      if (!originalText.trim()) { toast.error("Cole o texto original"); return; }
      payload = {
        original_text: originalText,
        edital_type: editalType,
        max_words: parseInt(maxWords) || 500,
      };
    } else if (selectedAction === "review_budget") {
      if (!projectId) { toast.error("Selecione um projeto"); return; }
      payload = { project_id: projectId, edital_budget_limit: budgetLimit || undefined };
    } else if (selectedAction === "generate_checklist") {
      payload = {
        edital_title: editalTitle,
        edital_type: editalType,
        edital_text_excerpt: editalExcerpt || undefined,
      };
    } else if (selectedAction === "suggest_project_fit") {
      payload = { edital_title: editalTitle, edital_criteria: editalCriteria, edital_type: editalType };
    }

    await callAI(selectedAction, payload);
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim()) return;
    await refine(refineInstruction);
    setRefineInstruction("");
    setRefineMode(false);
  };

  const copyResult = () => {
    if (lastResult) {
      navigator.clipboard.writeText(lastResult);
      toast.success("Copiado!");
    }
  };

  const handleSaveToDocBank = () => {
    if (!lastResult) return;
    const docTypeMap: Record<string, string> = {
      generate_memorial: "memorial",
      adapt_language: "outro",
      review_budget: "orcamento_base",
      generate_checklist: "outro",
      suggest_project_fit: "outro",
    };
    saveDocument.mutate({
      doc_type: docTypeMap[selectedAction] as any,
      title: `${AI_ACTION_LABELS[selectedAction]} — ${editalTitle || "Gerado por IA"}`,
      content: lastResult,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with context badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Assistente IA</span>
        {context?.editalTitle && (
          <Badge variant="outline" className="text-[10px] font-normal max-w-[200px] truncate">
            {context.editalTitle}
          </Badge>
        )}
      </div>

      {/* Horizontal action selector */}
      <div className="flex gap-1.5 flex-wrap">
        {ACTIONS.map(({ action, icon, label }) => (
          <button
            key={action}
            onClick={() => { setSelectedAction(action); setLastResult(null); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              selectedAction === action
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Compact form */}
      <div className="space-y-3">
        {(selectedAction === "generate_memorial" || selectedAction === "generate_checklist" || selectedAction === "suggest_project_fit") && (
          <div>
            <Label className="text-xs">Título do edital</Label>
            <Input value={editalTitle} onChange={(e) => setEditalTitle(e.target.value)} placeholder="Ex: Edital de Fomento à Cultura 2026" />
          </div>
        )}

        {(selectedAction === "generate_memorial" || selectedAction === "suggest_project_fit") && (
          <div>
            <Label className="text-xs">Critérios do edital</Label>
            <Textarea value={editalCriteria} onChange={(e) => setEditalCriteria(e.target.value)} placeholder="Descreva critérios, público-alvo, foco..." rows={2} />
          </div>
        )}

        {(selectedAction === "generate_memorial" || selectedAction === "review_budget") && projects.length > 0 && (
          <div>
            <Label className="text-xs">Projeto vinculado</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedAction === "adapt_language" && (
          <div>
            <Label className="text-xs">Texto original</Label>
            <Textarea value={originalText} onChange={(e) => setOriginalText(e.target.value)} placeholder="Cole aqui o texto artístico que deseja adaptar..." rows={4} />
          </div>
        )}

        {(selectedAction === "adapt_language" || selectedAction === "generate_checklist" || selectedAction === "suggest_project_fit") && (
          <div>
            <Label className="text-xs">Tipo de edital</Label>
            <Select value={editalType} onValueChange={setEditalType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="público federal">Público Federal</SelectItem>
                <SelectItem value="público estadual">Público Estadual</SelectItem>
                <SelectItem value="público municipal">Público Municipal</SelectItem>
                <SelectItem value="privado">Privado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedAction === "generate_checklist" && (
          <div>
            <Label className="text-xs">Trecho do edital (opcional)</Label>
            <Textarea value={editalExcerpt} onChange={(e) => setEditalExcerpt(e.target.value)} placeholder="Cole a seção de documentos exigidos..." rows={3} />
          </div>
        )}

        {(selectedAction === "generate_memorial" || selectedAction === "adapt_language") && (
          <div>
            <Label className="text-xs">Limite de palavras</Label>
            <Input type="number" value={maxWords} onChange={(e) => setMaxWords(e.target.value)} />
          </div>
        )}

        {selectedAction === "review_budget" && (
          <div>
            <Label className="text-xs">Teto do edital (R$)</Label>
            <Input value={budgetLimit} onChange={(e) => setBudgetLimit(e.target.value)} placeholder="Ex: 50000" />
          </div>
        )}

        {selectedAction === "generate_memorial" && (
          <div>
            <Label className="text-xs">Contexto adicional (opcional)</Label>
            <Textarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder="Informações extras sobre o projeto..." rows={2} />
          </div>
        )}

        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Gerar com IA
            </>
          )}
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && !lastResult && (
        <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[75%]" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-[60%]" />
        </div>
      )}

      {/* Result with actions */}
      {lastResult && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Gerado por IA
              </Badge>
            </div>

            <AIMarkdownContent content={lastResult} className="bg-muted/30 rounded-lg p-3 max-h-80 overflow-y-auto" />

            {/* Action bar */}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button variant="outline" size="sm" onClick={copyResult}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveToDocBank} disabled={saveDocument.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Salvar no banco
              </Button>
              {onSaveToChecklist && (
                <Button variant="outline" size="sm" onClick={() => onSaveToChecklist(lastResult)}>
                  <ClipboardList className="h-3.5 w-3.5 mr-1" />
                  Usar na candidatura
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setRefineMode(!refineMode)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refinar
              </Button>
            </div>

            {/* Refine input */}
            {refineMode && (
              <div className="flex gap-2">
                <Input
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="Ex: Deixe mais formal, adicione dados de público..."
                  onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleRefine} disabled={isLoading || !refineInstruction.trim()}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
