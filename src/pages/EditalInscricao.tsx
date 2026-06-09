import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Loader2,
  FileText,
  ExternalLink,
  Upload,
  CheckCircle2,
  Calendar,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEditalAnalysis } from "@/hooks/useEditalAnalysis";
import { useProjects } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEditalApplications,
  useUpdateApplication,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  type ApplicationStatus,
} from "@/hooks/useEditalApplications";

interface EditalInfo {
  id: string;
  titulo: string;
  link: string | null;
  orgao: string | null;
  area: string | null;
  tipo?: string | null;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export default function EditalInscricao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { analysis, analyzing, warning, analyze, loadFromApplication, clear } = useEditalAnalysis();

  const [edital, setEdital] = useState<EditalInfo | null>(null);
  const [loadingEdital, setLoadingEdital] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("none");
  const [sourceMode, setSourceMode] = useState<"upload" | "paste">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedCarta, setCopiedCarta] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allApplications = [] } = useEditalApplications();
  const updateApplication = useUpdateApplication();
  const application = useMemo(
    () => allApplications.find((a) => a.edital_id === id),
    [allApplications, id],
  );

  // Carrega edital + análise persistida (se houver)
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoadingEdital(true);
      const { data: editalData } = await supabase
        .from("editais")
        .select("id, titulo, link, orgao, area, tipo")
        .eq("id", id)
        .single();
      setEdital(editalData as EditalInfo | null);
      setLoadingEdital(false);

      // tenta carregar análise já salva
      const { data: appData } = await supabase
        .from("edital_applications")
        .select("analise_ia, project_id")
        .eq("edital_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (appData?.analise_ia) loadFromApplication(appData.analise_ia);
      if (appData?.project_id) setSelectedProject(appData.project_id);
    })();
  }, [id, user, loadFromApplication]);

  const handleFile = (f: File | null) => {
    if (!f) {
      setSelectedFile(null);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Arquivo excede 10 MB");
      return;
    }
    setSelectedFile(f);
  };

  const handleAnalyze = useCallback(async () => {
    if (!edital) return;
    const source =
      sourceMode === "upload" && selectedFile
        ? ({ type: "file", file: selectedFile } as const)
        : sourceMode === "paste" && pastedText.trim().length >= 50
        ? ({ type: "text", text: pastedText.trim() } as const)
        : null;
    if (!source) {
      toast.error(
        sourceMode === "upload"
          ? "Escolha um arquivo PDF, DOC, DOCX ou TXT (até 10 MB)."
          : "Cole pelo menos 50 caracteres do texto do edital.",
      );
      return;
    }
    await analyze({
      source,
      editalId: edital.id,
      editalTitle: edital.titulo,
      projectId: selectedProject !== "none" ? selectedProject : undefined,
    });
  }, [edital, sourceMode, selectedFile, pastedText, selectedProject, analyze]);

  const handleCopyAnalysis = () => {
    if (!analysis) return;
    const lines: string[] = [];
    lines.push(`# ${edital?.titulo ?? "Edital"}`);
    lines.push("");
    lines.push(`## Resumo\n${analysis.resumo}`);
    if (analysis.publico_alvo) lines.push(`\n## Público-alvo\n${analysis.publico_alvo}`);
    if (analysis.valor) lines.push(`\n## Valor\n${analysis.valor}`);
    if (analysis.prazos?.length) {
      lines.push("\n## Prazos");
      analysis.prazos.forEach((p) => {
        lines.push(`- ${p.label}: ${p.data}${p.observacao ? ` (${p.observacao})` : ""}`);
      });
    }
    if (analysis.documentos?.length) {
      lines.push("\n## Documentos exigidos");
      analysis.documentos.forEach((d) => lines.push(`- ${d}`));
    }
    if (analysis.carta_sugerida) {
      lines.push("\n## Carta sugerida\n" + analysis.carta_sugerida);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Análise copiada!");
  };

  const handleCopyCarta = () => {
    if (!analysis?.carta_sugerida) return;
    navigator.clipboard.writeText(analysis.carta_sugerida);
    setCopiedCarta(true);
    setTimeout(() => setCopiedCarta(false), 2000);
    toast.success("Carta copiada!");
  };

  const handleMarkAsInscrito = () => {
    if (!application) return;
    updateApplication.mutate(
      { id: application.id, status: "inscrito" as ApplicationStatus },
      {
        onSuccess: () => toast.success("Candidatura marcada como inscrita!"),
      },
    );
  };

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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/carreira")} className="cursor-pointer">
              Carreira
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-[60vw]">{edital.titulo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Cabeçalho do edital */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="text-lg">{edital.titulo}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {[edital.orgao, edital.area].filter(Boolean).join(" · ") || "Edital cultural"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {application && (
                <Badge className={APPLICATION_STATUS_COLORS[application.status]}>
                  {APPLICATION_STATUS_LABELS[application.status]}
                </Badge>
              )}
              {edital.link && (
                <Button variant="outline" size="sm" asChild>
                  <a href={edital.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir portal
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Entrada do edital */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            1. Forneça o conteúdo do edital
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Baixe o PDF do edital ou copie o texto da página oficial. Sua IA gera uma análise objetiva e um rascunho de carta para você adaptar.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as "upload" | "paste")}>
            <TabsList className="rounded-[0.7rem]">
              <TabsTrigger value="upload" className="rounded-[0.6rem]">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload de arquivo
              </TabsTrigger>
              <TabsTrigger value="paste" className="rounded-[0.6rem]">
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Colar texto
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-3 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIME}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                {selectedFile ? selectedFile.name : "Escolher arquivo (PDF, DOC, DOCX, TXT — até 10 MB)"}
              </Button>
            </TabsContent>

            <TabsContent value="paste" className="mt-3 space-y-2">
              <Textarea
                rows={8}
                placeholder="Cole aqui o texto integral do edital (mínimo 50 caracteres)..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={analyzing}
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {pastedText.length.toLocaleString("pt-BR")} caracteres
              </p>
            </TabsContent>
          </Tabs>

          {projects.length > 0 && (
            <div>
              <Label className="text-xs">Projeto vinculado (opcional — personaliza a carta)</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject} disabled={analyzing}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhum projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum projeto</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.artist ? `— ${p.artist}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analisando edital com IA...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                {analysis ? "Regenerar análise" : "Analisar edital"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado da análise */}
      {analysis && !analyzing && (
        <>
          {warning && (
            <div className="rounded-[0.7rem] border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3">
              {warning}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> 2. Análise gerada
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyAnalysis}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                Copiar tudo
              </Button>
              <Button size="sm" variant="ghost" onClick={clear}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Nova análise
              </Button>
            </div>
          </div>

          {/* Resumo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{analysis.resumo}</p>
              {(analysis.publico_alvo || analysis.valor) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  {analysis.publico_alvo && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Público-alvo</p>
                      <p className="text-sm">{analysis.publico_alvo}</p>
                    </div>
                  )}
                  {analysis.valor && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor</p>
                      <p className="text-sm">{analysis.valor}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prazos */}
          {analysis.prazos?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Prazos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {analysis.prazos.map((p, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-medium">{p.label}</p>
                        {p.observacao && (
                          <p className="text-xs text-muted-foreground">{p.observacao}</p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{p.data}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Documentos exigidos */}
          {analysis.documentos?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" /> Documentos exigidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {analysis.documentos.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Carta sugerida */}
          {analysis.carta_sugerida && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Rascunho de carta / memorial</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleCopyCarta}>
                    {copiedCarta ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    Copiar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Base reutilizável. Adapte com sua voz antes de colar no formulário oficial.
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="font-serif text-sm leading-relaxed"
                  rows={14}
                  value={analysis.carta_sugerida}
                  readOnly
                />
              </CardContent>
            </Card>
          )}

          {/* Próximos passos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">3. Próximos passos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {application && application.status !== "inscrito" && (
                <Button size="sm" onClick={handleMarkAsInscrito} disabled={updateApplication.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Marcar como inscrito
                </Button>
              )}
              {edital.link && (
                <Button size="sm" variant="outline" asChild>
                  <a href={edital.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir portal oficial
                  </a>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => navigate("/carreira")}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar à Carreira
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
