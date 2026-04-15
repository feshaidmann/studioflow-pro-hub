import { useState } from "react";
import { Sparkles, FileText, Languages, DollarSign, ClipboardList, Target, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditalAI, type AIAction, AI_ACTION_LABELS } from "@/hooks/useEditalAI";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface Props {
  projects: Project[];
}

const ACTIONS: { action: AIAction; icon: React.ReactNode; desc: string }[] = [
  { action: "generate_memorial", icon: <FileText className="h-4 w-4" />, desc: "Gerar memorial descritivo a partir do seu projeto" },
  { action: "adapt_language", icon: <Languages className="h-4 w-4" />, desc: "Adaptar texto artístico para linguagem de edital" },
  { action: "review_budget", icon: <DollarSign className="h-4 w-4" />, desc: "Revisar orçamento do projeto para adequar ao edital" },
  { action: "generate_checklist", icon: <ClipboardList className="h-4 w-4" />, desc: "Extrair lista de documentos exigidos pelo edital" },
  { action: "suggest_project_fit", icon: <Target className="h-4 w-4" />, desc: "Sugerir qual projeto tem melhor fit com o edital" },
];

export default function EditalAIAssistant({ projects }: Props) {
  const { callAI, isLoading, lastResult, setLastResult } = useEditalAI();
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);

  // Form fields
  const [editalTitle, setEditalTitle] = useState("");
  const [editalCriteria, setEditalCriteria] = useState("");
  const [editalType, setEditalType] = useState("público");
  const [projectId, setProjectId] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [maxWords, setMaxWords] = useState("1000");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [editalExcerpt, setEditalExcerpt] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const handleSubmit = async () => {
    if (!selectedAction) return;

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
      payload = {
        original_text: originalText,
        edital_type: editalType,
        max_words: parseInt(maxWords) || 500,
      };
    } else if (selectedAction === "review_budget") {
      if (!projectId) { toast.error("Selecione um projeto"); return; }
      payload = {
        project_id: projectId,
        edital_budget_limit: budgetLimit || undefined,
      };
    } else if (selectedAction === "generate_checklist") {
      payload = {
        edital_title: editalTitle,
        edital_type: editalType,
        edital_text_excerpt: editalExcerpt || undefined,
      };
    } else if (selectedAction === "suggest_project_fit") {
      payload = {
        edital_title: editalTitle,
        edital_criteria: editalCriteria,
        edital_type: editalType,
      };
    }

    await callAI(selectedAction, payload);
  };

  const copyResult = () => {
    if (lastResult) {
      navigator.clipboard.writeText(lastResult);
      toast.success("Copiado!");
    }
  };

  if (!selectedAction) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-medium text-sm">Assistente IA para Editais</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Use inteligência artificial para elaborar documentos, adaptar linguagem e analisar editais culturais.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIONS.map(({ action, icon, desc }) => (
            <Card
              key={action}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedAction(action)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{AI_ACTION_LABELS[action]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {AI_ACTION_LABELS[selectedAction]}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => { setSelectedAction(null); setLastResult(null); }}>
          ← Voltar
        </Button>
      </div>

      {/* Form fields based on action */}
      <Card>
        <CardContent className="pt-4 space-y-3">
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
              <Textarea value={editalExcerpt} onChange={(e) => setEditalExcerpt(e.target.value)} placeholder="Cole aqui a seção de documentos exigidos..." rows={3} />
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
        </CardContent>
      </Card>

      {/* Result */}
      {lastResult && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Resultado</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyResult}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {lastResult}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
