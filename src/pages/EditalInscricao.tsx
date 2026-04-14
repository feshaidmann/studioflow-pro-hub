import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Copy, Check, Save, Loader2, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useRascunhoEdital, type EditalField } from "@/hooks/useRascunhoEdital";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface EditalInfo {
  id: string;
  titulo: string;
  link: string | null;
  orgao: string | null;
  area: string | null;
}

export default function EditalInscricao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { projects } = useProjects();
  const { profile } = useProfile();
  const { extracting, extractedFields, extractFields, saving, saveRascunho, loadRascunho } = useRascunhoEdital();

  const [edital, setEdital] = useState<EditalInfo | null>(null);
  const [loadingEdital, setLoadingEdital] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [rascunhoId, setRascunhoId] = useState<string | undefined>();
  const [step, setStep] = useState(0); // 0=config, 1=fields, 2=docs, 3=review
  const [copied, setCopied] = useState(false);

  // Load edital info
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoadingEdital(true);
      const { data } = await supabase
        .from("editais")
        .select("id, titulo, link, orgao, area")
        .eq("id", id)
        .single();
      setEdital(data as any);
      setLoadingEdital(false);

      // Load existing draft
      const draft = await loadRascunho(id);
      if (draft) {
        setFormValues(draft.campos as Record<string, string>);
        setRascunhoId(draft.id);
        setSelectedProject(draft.project_id || "");
      }
    })();
  }, [id, user, loadRascunho]);

  // Extract fields
  const handleExtract = () => {
    if (!edital) return;
    extractFields(edital.link || undefined, edital.titulo);
  };

  // Pre-fill from profile/project
  const handlePreFill = useCallback(() => {
    if (!extractedFields?.campos || !profile) return;
    const vals = { ...formValues };
    for (const campo of extractedFields.campos) {
      const key = campo.nome;
      if (vals[key]) continue; // don't overwrite existing
      const lower = key.toLowerCase();
      if (lower.includes("nome") && lower.includes("proponente")) vals[key] = profile.display_name || "";
      else if (lower.includes("email")) vals[key] = profile.public_email || "";
      else if (lower.includes("telefone") || lower.includes("whatsapp")) vals[key] = profile.whatsapp || "";
      else if (lower.includes("cidade") || lower.includes("município")) vals[key] = profile.city || "";
    }
    setFormValues(vals);
    toast({ title: "Campos pré-preenchidos com dados do perfil" });
  }, [extractedFields, profile, formValues, toast]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!extractedFields?.campos.length) return 0;
    const filled = extractedFields.campos.filter((c) => formValues[c.nome]?.trim()).length;
    return Math.round((filled / extractedFields.campos.length) * 100);
  }, [extractedFields, formValues]);

  // Auto-save debounced
  useEffect(() => {
    if (!id || !extractedFields) return;
    const timer = setTimeout(() => {
      saveRascunho(id, selectedProject || null, formValues, progress, rascunhoId).then((newId) => {
        if (newId && !rascunhoId) setRascunhoId(newId);
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [formValues, progress]);

  const handleCopyAll = () => {
    const lines = Object.entries(formValues)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Textos copiados!" });
  };

  const handleSave = async () => {
    const newId = await saveRascunho(id || null, selectedProject || null, formValues, progress, rascunhoId);
    if (newId) {
      setRascunhoId(newId);
      toast({ title: "Rascunho salvo!" });
    }
  };

  const fields = extractedFields?.campos || [];
  const requiredFields = fields.filter((f) => f.obrigatorio);
  const optionalFields = fields.filter((f) => !f.obrigatorio);

  if (loadingEdital) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!edital) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">Edital não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate("/editais")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/editais")} className="mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">Assistente de inscrição</h1>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{edital.titulo}</p>
        </div>
        {progress > 0 && (
          <Badge variant="outline" className="shrink-0">{progress}%</Badge>
        )}
      </div>

      {/* Progress bar */}
      {extractedFields && <Progress value={progress} className="h-1.5" />}

      {/* Step 0: Setup */}
      {!extractedFields && !extracting && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-col items-center text-center py-6">
              <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-medium mb-2">Preparar inscrição</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                A IA vai analisar o edital e extrair os campos obrigatórios do formulário de inscrição para você preencher aqui.
              </p>

              <div className="w-full max-w-sm space-y-3">
                <div>
                  <Label>Vincular a um projeto (opcional)</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {projects.filter((p) => !p.completed).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleExtract}>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Extrair campos do edital
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {extracting && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analisando edital e extraindo campos...</p>
          </CardContent>
        </Card>
      )}

      {/* Fields form */}
      {extractedFields && !extracting && (
        <>
          {/* Summary */}
          {extractedFields.resumo_edital && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo do edital</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{extractedFields.resumo_edital}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions bar */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handlePreFill}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Pré-preencher com perfil
            </Button>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyAll}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              Copiar todos os textos
            </Button>
          </div>

          {/* Required fields */}
          {requiredFields.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campos obrigatórios ({requiredFields.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requiredFields.map((campo) => (
                  <FieldInput
                    key={campo.nome}
                    campo={campo}
                    value={formValues[campo.nome] || ""}
                    onChange={(v) => setFormValues((prev) => ({ ...prev, [campo.nome]: v }))}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Optional fields */}
          {optionalFields.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campos opcionais ({optionalFields.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {optionalFields.map((campo) => (
                  <FieldInput
                    key={campo.nome}
                    campo={campo}
                    value={formValues[campo.nome] || ""}
                    onChange={(v) => setFormValues((prev) => ({ ...prev, [campo.nome]: v }))}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Required documents */}
          {extractedFields.documentos_exigidos?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Documentos exigidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {extractedFields.documentos_exigidos.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function FieldInput({
  campo,
  value,
  onChange,
}: {
  campo: EditalField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (campo.tipo === "select" && campo.opcoes?.length) {
    return (
      <div>
        <Label className="flex items-center gap-1.5">
          {campo.nome}
          {campo.obrigatorio && <span className="text-destructive">*</span>}
        </Label>
        {campo.descricao && <p className="text-xs text-muted-foreground mb-1">{campo.descricao}</p>}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {campo.opcoes.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (campo.tipo === "textarea") {
    return (
      <div>
        <Label className="flex items-center gap-1.5">
          {campo.nome}
          {campo.obrigatorio && <span className="text-destructive">*</span>}
        </Label>
        {campo.descricao && <p className="text-xs text-muted-foreground mb-1">{campo.descricao}</p>}
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
      </div>
    );
  }

  return (
    <div>
      <Label className="flex items-center gap-1.5">
        {campo.nome}
        {campo.obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      {campo.descricao && <p className="text-xs text-muted-foreground mb-1">{campo.descricao}</p>}
      <Input
        type={campo.tipo === "date" ? "date" : campo.tipo === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
