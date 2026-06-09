import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Copy, Check, Save, Loader2, FileText, ClipboardList, RefreshCw, BookmarkPlus, ChevronRight, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { useRascunhoEdital, extractCauseLabel, extractCauseGuidance, type EditalField } from "@/hooks/useRascunhoEdital";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEditalAI } from "@/hooks/useEditalAI";
import { useEditalApplications, useUpdateApplication, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus } from "@/hooks/useEditalApplications";
import { UploadEditalPanel } from "@/components/editais/UploadEditalPanel";

interface EditalInfo {
  id: string;
  titulo: string;
  link: string | null;
  orgao: string | null;
  area: string | null;
  tipo?: string | null;
}

export default function EditalInscricao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { projects } = useProjects();
  const { profile } = useProfile();
  const { extracting, extractedFields, extractFields: _extractFields, extractFieldsFromFile, setExtractedFieldsManual, saving, saveRascunho, loadRascunho, lastError, attemptProgress } = useRascunhoEdital();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  type Step = "docInput" | "filling";
  const [step, setStep] = useState<Step>("docInput");

  const [edital, setEdital] = useState<EditalInfo | null>(null);
  const [loadingEdital, setLoadingEdital] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [rascunhoId, setRascunhoId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [aiGeneratedFields, setAiGeneratedFields] = useState<Set<string>>(new Set());
  const [batchFilling, setBatchFilling] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Load application data for this edital
  const { data: allApplications = [] } = useEditalApplications();
  const updateApplication = useUpdateApplication();
  const application = useMemo(
    () => allApplications.find((a) => a.edital_id === id),
    [allApplications, id]
  );

  // Load edital info + existing draft
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoadingEdital(true);
      const { data } = await supabase
        .from("editais")
        .select("id, titulo, link, orgao, area, tipo")
        .eq("id", id)
        .single();
      setEdital(data as any);
      setLoadingEdital(false);

      const draft = await loadRascunho(id);
      if (draft) {
        const savedValues = draft.campos as Record<string, string>;
        setFormValues(savedValues);
        setRascunhoId(draft.id);
        setSelectedProject(draft.project_id || "");
        // Reconstruct campo definitions from saved keys so the form renders without re-extraction
        const reconstructed: EditalField[] = Object.keys(savedValues)
          .filter((k) => savedValues[k])
          .map((k) => ({ nome: k, tipo: "textarea", obrigatorio: false, descricao: "", opcoes: null }));
        if (reconstructed.length > 0) {
          setExtractedFieldsManual({ campos: reconstructed, resumo_edital: "", documentos_exigidos: [] });
          setStep("filling");
        }
      }
    })();
  }, [id, user, loadRascunho, setExtractedFieldsManual]);

  // When extraction succeeds, move to the filling step
  useEffect(() => {
    if (extractedFields) setStep("filling");
  }, [extractedFields]);


  // Pre-fill simple fields from profile — more aggressive matching
  const preFillProfile = useCallback(() => {
    if (!extractedFields?.campos || !profile) return;
    const vals = { ...formValues };
    let filled = 0;
    for (const campo of extractedFields.campos) {
      const key = campo.nome;
      if (vals[key]) continue;
      const lower = key.toLowerCase();
      if ((lower.includes("nome") && (lower.includes("proponente") || lower.includes("artista") || lower.includes("responsável"))) || lower === "nome completo" || lower === "nome") {
        vals[key] = profile.display_name || ""; filled++;
      } else if (lower.includes("email")) {
        vals[key] = profile.public_email || ""; filled++;
      } else if (lower.includes("telefone") || lower.includes("whatsapp") || lower.includes("celular")) {
        vals[key] = profile.whatsapp || ""; filled++;
      } else if (lower.includes("cidade") || lower.includes("município") || lower.includes("localidade")) {
        vals[key] = profile.city || ""; filled++;
      } else if (lower.includes("biografia") || lower.includes("currículo") || lower.includes("trajetória") || lower.includes("histórico")) {
        vals[key] = profile.bio || ""; filled++;
      } else if (lower.includes("área") || lower.includes("linguagem") || lower.includes("segmento")) {
        const specs = profile.specialties?.join(", ");
        if (specs) { vals[key] = specs; filled++; }
      }
    }
    setFormValues(vals);
    if (filled > 0) toast.success(`${filled} campo${filled > 1 ? "s" : ""} preenchido${filled > 1 ? "s" : ""} com seu perfil`);
  // Batch fill: top textarea fields with AI, em paralelo (até 4 simultâneas para não estourar quota)
  const handleBatchFill = useCallback(async () => {
    if (!extractedFields?.campos || !edital) return;

    // Preenche campos simples de perfil primeiro
    preFillProfile();

    // Prioriza campos vazios mais importantes (memorial / justificativa / público / resumo / biografia)
    const PRIORITY_KEYWORDS = ["memori", "justificativ", "público", "publico", "resumo", "biograf", "objetiv", "descri"];
    const emptyTextareas = extractedFields.campos.filter(
      (c) => c.tipo === "textarea" && !formValues[c.nome]?.trim()
    );
    const prioritized = [
      ...emptyTextareas.filter((c) => PRIORITY_KEYWORDS.some((k) => c.nome.toLowerCase().includes(k))),
      ...emptyTextareas.filter((c) => !PRIORITY_KEYWORDS.some((k) => c.nome.toLowerCase().includes(k))),
    ].slice(0, 4); // limite duro para o MVP

    if (prioritized.length === 0) {
      toast("Todos os campos já estão preenchidos");
      return;
    }

    setBatchFilling(true);
    setBatchProgress({ current: 0, total: prioritized.length });

    const results = await Promise.allSettled(
      prioritized.map((campo) =>
        supabase.functions.invoke("edital-ai-assistant", {
          body: {
            action: "fill_field",
            payload: {
              field_name: campo.nome,
              field_description: campo.descricao,
              max_words: 500,
              edital_title: edital.titulo,
              edital_summary: extractedFields.resumo_edital,
              project_id: selectedProject && selectedProject !== "none" ? selectedProject : undefined,
            },
          },
        })
      )
    );

    const updates: Record<string, string> = {};
    const aiKeys: string[] = [];
    let successCount = 0;
    results.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value?.data?.response) {
        updates[prioritized[idx].nome] = res.value.data.response;
        aiKeys.push(prioritized[idx].nome);
        successCount++;
      }
    });

    if (successCount > 0) {
      setFormValues((prev) => ({ ...prev, ...updates }));
      setAiGeneratedFields((prev) => {
        const next = new Set(prev);
        aiKeys.forEach((k) => next.add(k));
        return next;
      });
    }

    setBatchFilling(false);
    setBatchProgress({ current: 0, total: 0 });

    if (successCount === prioritized.length) {
      toast.success(`${successCount} campos gerados com IA`);
    } else if (successCount > 0) {
      toast.success(`${successCount} de ${prioritized.length} campos gerados (alguns falharam)`);
    } else {
      toast.error("Nenhum campo foi gerado. Tente novamente em alguns instantes.");
    }
  }, [extractedFields, edital, formValues, selectedProject, preFillProfile]);


  // Calculate progress
  const progress = useMemo(() => {
    if (!extractedFields?.campos?.length) return 0;
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
    toast.success("Textos copiados!");
  };

  const handleSave = async () => {
    const newId = await saveRascunho(id || null, selectedProject || null, formValues, progress, rascunhoId);
    if (newId) {
      setRascunhoId(newId);
      toast.success("Rascunho salvo!");
    }
  };

  const handleFieldAIGenerated = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    setAiGeneratedFields((prev) => new Set(prev).add(fieldName));
  };

  const handleMarkAsInscrito = () => {
    if (!application) return;
    updateApplication.mutate(
      { id: application.id, status: "inscrito" as ApplicationStatus },
      {
        onSuccess: () => {
          toast.success("Candidatura marcada como inscrita!");
        },
      }
    );
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
        <p className="text-muted-foreground">Oportunidade não encontrada.</p>
        <Button variant="ghost" onClick={() => navigate("/carreira")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
        </Button>
      </div>
    );
  }

  // Guarda: palcos não usam o assistente de inscrição (que é para editais de fomento)
  if (edital.tipo === "palco") {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/carreira")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar para Carreira
        </Button>
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <div>
              <h2 className="text-base font-semibold">{edital.titulo}</h2>
              {edital.orgao && <p className="text-sm text-muted-foreground">{edital.orgao}</p>}
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Esta oportunidade é um palco/festival — o acompanhamento é direto pelo regulamento oficial. Use a aba <strong>Minhas inscrições</strong> em Carreira para atualizar o status.
            </p>
            {edital.link && (
              <Button asChild>
                <a href={edital.link} target="_blank" rel="noopener noreferrer">Abrir regulamento oficial</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="cursor-pointer text-xs" onClick={() => navigate("/carreira")}>
              Editais
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs truncate max-w-[200px]">{edital.titulo}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs">Inscrição</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with application status */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/carreira")} className="mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">Assistente de inscrição</h1>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{edital.titulo}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {application && (
            <Badge variant="outline" className={APPLICATION_STATUS_COLORS[application.status as ApplicationStatus] + " text-[10px]"}>
              {APPLICATION_STATUS_LABELS[application.status as ApplicationStatus] || application.status}
            </Badge>
          )}
          {progress > 0 && (
            <Badge variant="outline" className="shrink-0">{progress}%</Badge>
          )}
          {application && (application.status === "interesse" || application.status === "preparando") && (
            <Button size="sm" variant="outline" onClick={handleMarkAsInscrito} disabled={updateApplication.isPending}>
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              Marcar inscrito
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {extractedFields && <Progress value={progress} className="h-1.5" />}

      {/* Banner: 100% complete — mark as inscrito */}
      {progress === 100 && application && application.status !== "inscrito" && application.status !== "resultado" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <p className="text-sm font-medium text-success">Formulário completo!</p>
            </div>
            <Button size="sm" onClick={handleMarkAsInscrito} disabled={updateApplication.isPending}>
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              Marcar como inscrito
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 0 — documento do edital */}
      {step === "docInput" && (
        <Card>
          <CardContent className="pt-6 pb-5 space-y-5">
            <div className="text-center space-y-2">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-base font-semibold">Forneça o documento do edital</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                A IA lê o regulamento e preenche os campos da candidatura com base no seu perfil e projeto.
              </p>
              {edital.link && (
                <a
                  href={edital.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir edital oficial
                </a>
              )}
            </div>

            {/* Project selector */}
            <div>
              <Label className="text-xs mb-1.5 block">Vincular a projeto (opcional)</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Nenhum projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.filter((p) => !p.completed).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <UploadEditalPanel
              fileInputRef={fileInputRef}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              extracting={extracting}
              onExtract={() => { if (selectedFile) extractFieldsFromFile(selectedFile, edital.id); }}
              className="w-full"
              title=""
              description="PDF, DOC, DOCX ou TXT — até 10 MB"
            />

            {/* Extraction loading feedback */}
            {extracting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                {attemptProgress && attemptProgress.current > 1
                  ? `Tentativa ${attemptProgress.current}/${attemptProgress.max} — aguarde…`
                  : "Lendo o edital…"}
              </div>
            )}

            {/* Error feedback */}
            {lastError && !extracting && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs space-y-0.5">
                <div className="font-medium text-destructive">{extractCauseLabel(lastError.cause)}</div>
                <div className="text-muted-foreground">{extractCauseGuidance(lastError.cause)}</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => navigate("/carreira")}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields form — only in filling step */}
      {step === "filling" && extractedFields && !extracting && (
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
            <Button size="sm" variant="outline" onClick={preFillProfile}>
              <User className="h-3.5 w-3.5 mr-1.5" />
              Preencher com meu perfil
            </Button>
            <Button size="sm" onClick={handleBatchFill} disabled={batchFilling}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {batchFilling
                ? `Gerando campo ${batchProgress.current} de ${batchProgress.total}...`
                : "✨ Preencher tudo com IA"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyAll}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              Copiar tudo
            </Button>
          </div>

          {/* Re-extrair a partir de outro documento */}
          <Card>
            <CardContent className="pt-4 pb-5">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium select-none">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Substituir campos com outro documento
                  <span className="text-xs text-muted-foreground font-normal ml-auto">opcional</span>
                </summary>
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Os campos serão re-extraídos do novo arquivo. Suas respostas salvas são mantidas.
                  </p>
                  <UploadEditalPanel
                    fileInputRef={fileInputRef}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    extracting={extracting}
                    onExtract={() => { if (selectedFile) extractFieldsFromFile(selectedFile, edital.id); }}
                    title=""
                    description="PDF, DOC, DOCX ou TXT — até 10 MB"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setStep("docInput"); }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Voltar à entrada do documento
                  </Button>
                </div>
              </details>
            </CardContent>
          </Card>

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
                    onAIGenerated={(v) => handleFieldAIGenerated(campo.nome, v)}
                    isAIGenerated={aiGeneratedFields.has(campo.nome)}
                    editalTitle={edital.titulo}
                    editalSummary={extractedFields.resumo_edital}
                    projectId={selectedProject && selectedProject !== "none" ? selectedProject : undefined}
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
                    onAIGenerated={(v) => handleFieldAIGenerated(campo.nome, v)}
                    isAIGenerated={aiGeneratedFields.has(campo.nome)}
                    editalTitle={edital.titulo}
                    editalSummary={extractedFields.resumo_edital}
                    projectId={selectedProject && selectedProject !== "none" ? selectedProject : undefined}
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
  onAIGenerated,
  isAIGenerated,
  editalTitle,
  editalSummary,
  projectId,
}: {
  campo: EditalField;
  value: string;
  onChange: (v: string) => void;
  onAIGenerated: (v: string) => void;
  isAIGenerated: boolean;
  editalTitle?: string;
  editalSummary?: string;
  projectId?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [savingToBank, setSavingToBank] = useState(false);
  const { user } = useAuth();

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await supabase.functions.invoke("edital-ai-assistant", {
        body: {
          action: "fill_field",
          payload: {
            field_name: campo.nome,
            field_description: campo.descricao,
            max_words: 500,
            edital_title: editalTitle,
            edital_summary: editalSummary,
            project_id: projectId,
          },
        },
      });
      if (data?.response) {
        onAIGenerated(data.response);
        setShowRefine(false);
      }
    } catch {
      // Error handled by edge function
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim() || !value) return;
    setRefining(true);
    try {
      const { data } = await supabase.functions.invoke("edital-ai-assistant", {
        body: {
          action: "refine_field",
          payload: {
            field_name: campo.nome,
            current_text: value,
            instruction: refineInstruction,
          },
        },
      });
      if (data?.response) {
        onAIGenerated(data.response);
        setRefineInstruction("");
        setShowRefine(false);
      }
    } catch {
      // Error handled
    } finally {
      setRefining(false);
    }
  };

  const handleSaveToBank = async () => {
    if (!value.trim() || !user) return;
    setSavingToBank(true);
    try {
      await supabase.from("edital_documents").insert({
        user_id: user.id,
        title: `${campo.nome}${editalTitle ? ` — ${editalTitle}` : ""}`,
        doc_type: "outro",
        content: value,
      });
      toast.success("Salvo no banco de documentos!");
    } catch {
      // ignore
    } finally {
      setSavingToBank(false);
    }
  };

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
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            {campo.nome}
            {campo.obrigatorio && <span className="text-destructive">*</span>}
            {isAIGenerated && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">IA</Badge>
            )}
          </Label>
          {value && <span className="text-[10px] text-muted-foreground">{wordCount} palavras</span>}
        </div>
        {campo.descricao && <p className="text-xs text-muted-foreground">{campo.descricao}</p>}

        {generating ? (
          <div className="flex items-center justify-center h-24 border rounded-md bg-muted/30">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Gerando com IA...</span>
          </div>
        ) : (
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {!value && !generating && (
            <Button size="sm" variant="outline" onClick={handleGenerate} className="h-7 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Gerar com IA
            </Button>
          )}
          {value && isAIGenerated && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRefine(!showRefine)}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refinar
              </Button>
              <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating} className="h-7 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Regerar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSaveToBank} disabled={savingToBank} className="h-7 text-xs">
                <BookmarkPlus className="h-3 w-3 mr-1" />
                Salvar no banco
              </Button>
            </>
          )}
        </div>

        {showRefine && (
          <div className="flex gap-1.5 mt-1">
            <Input
              placeholder="Ex: Mais formal, adicionar dados de público..."
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRefine()}
              className="text-xs h-8"
            />
            <Button size="sm" onClick={handleRefine} disabled={refining || !refineInstruction.trim()} className="h-8 text-xs shrink-0">
              {refining ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
        )}
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
