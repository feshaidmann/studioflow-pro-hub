import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Copy, Check, Loader2, FileText, Mic2, Send,
  Mail, MessageCircle, Instagram, Link2, ClipboardList, CheckCircle2,
  AlertCircle, Calendar as CalendarIcon, DollarSign, Plus, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useEditalApplications, useUpdateApplication, APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/hooks/useEditalApplications";

type StepKey = "epk" | "pitch" | "contato";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "epk", label: "EPK / Release" },
  { key: "pitch", label: "Pitch" },
  { key: "contato", label: "Contato & Follow-up" },
];

const CHANNELS = [
  { v: "email", label: "E-mail", icon: Mail },
  { v: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { v: "instagram", label: "Instagram DM", icon: Instagram },
  { v: "form", label: "Formulário oficial", icon: Link2 },
  { v: "other", label: "Outro", icon: Link2 },
];

interface OutreachLog {
  id: string;
  channel: string;
  direction: string;
  summary: string;
  created_at: string;
}

interface PalcoOpp {
  id: string;
  titulo: string;
  orgao: string;
  estado: string | null;
  resumo: string | null;
  link: string | null;
  area: string | null; // usado como tipo_palco quando palco
  cachet_medio?: string | null;
}

function CopyBtn({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado!");
        setTimeout(() => setCopied(false), 1500);
      }}
      disabled={!text}
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
      {label}
    </Button>
  );
}

export default function PalcoProposta() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { profile } = useProfile();
  const { data: allApps = [], refetch: refetchApps } = useEditalApplications();
  const updateApp = useUpdateApplication();

  const application = useMemo(
    () => allApps.find((a) => a.id === applicationId),
    [allApps, applicationId],
  );

  const [palco, setPalco] = useState<PalcoOpp | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StepKey>("epk");

  

  // Editable form state (synced from edital_applications extra fields)
  const [epkContent, setEpkContent] = useState("");
  const [pitchSubject, setPitchSubject] = useState("");
  const [pitchContent, setPitchContent] = useState("");
  const [contactChannel, setContactChannel] = useState("");
  const [contactRecipient, setContactRecipient] = useState("");
  const [contactedAt, setContactedAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string>("");

  const [generatingEpk, setGeneratingEpk] = useState(false);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [savingExtras, setSavingExtras] = useState(false);
  const [pitchVariations, setPitchVariations] = useState<{ formal?: string; cordial?: string; direto?: string } | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);

  const [outreach, setOutreach] = useState<OutreachLog[]>([]);
  const [newLogChannel, setNewLogChannel] = useState("note");
  const [newLogSummary, setNewLogSummary] = useState("");
  const [loggingOutreach, setLoggingOutreach] = useState(false);

  // Load extras + outreach + palco from DB (extras are on the row itself)
  useEffect(() => {
    if (!applicationId || !user) return;
    (async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from("edital_applications")
        .select("id, opportunity_id, tipo, project_id, notas, status, data_inscricao, epk_content, pitch_content, pitch_subject, contact_channel, contact_recipient, contacted_at")
        .eq("id", applicationId)
        .single();

      if (row) {
        setEpkContent((row as any).epk_content || "");
        setPitchSubject((row as any).pitch_subject || "");
        setPitchContent((row as any).pitch_content || "");
        setContactChannel((row as any).contact_channel || "");
        setContactRecipient((row as any).contact_recipient || "");
        setContactedAt((row as any).contacted_at || null);
        setNotes(row.notas || "");
        setProjectId(row.project_id || "");

        const { data: p } = await supabase
          .from("editais")
          .select("id, titulo, orgao, estado, resumo, link, area")
          .eq("id", (row as any).opportunity_id)
          .single();
        if (p) setPalco(p as PalcoOpp);
      }

      const { data: logs } = await supabase
        .from("palco_outreach_log")
        .select("id, channel, direction, summary, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      setOutreach((logs || []) as OutreachLog[]);

      setLoading(false);
    })();
  }, [applicationId, user]);

  const saveExtras = useCallback(async (patch: Record<string, any>) => {
    if (!applicationId) return;
    setSavingExtras(true);
    const { error } = await supabase
      .from("edital_applications")
      .update(patch as any)
      .eq("id", applicationId);
    setSavingExtras(false);
    if (error) {
      toast.error("Erro ao salvar");
      return false;
    }
    return true;
  }, [applicationId]);

  const handleGenerateEpk = async () => {
    if (!palco) return;
    setGeneratingEpk(true);
    try {
      const { data, error } = await supabase.functions.invoke("palco-pitch-generate", {
        body: { action: "generate_epk", palco, project_id: projectId || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const epk = (data?.epk || "").trim();
      if (!epk) throw new Error("Resposta vazia da IA");
      setEpkContent(epk);
      await saveExtras({ epk_content: epk });
      toast.success("EPK gerado");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar o EPK");
    } finally {
      setGeneratingEpk(false);
    }
  };

  const handleGeneratePitches = async () => {
    if (!palco) return;
    setGeneratingPitch(true);
    try {
      const { data, error } = await supabase.functions.invoke("palco-pitch-generate", {
        body: { action: "generate_pitches", palco, project_id: projectId || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const variations = data?.variations || {};
      setPitchVariations(variations);
      setSubjectSuggestions(Array.isArray(data?.subject_suggestions) ? data.subject_suggestions : []);
      if (!pitchContent && variations.cordial) {
        setPitchContent(variations.cordial);
      }
      if (!pitchSubject && data?.subject_suggestions?.[0]) {
        setPitchSubject(data.subject_suggestions[0]);
      }
      toast.success("Variações geradas");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar a proposta");
    } finally {
      setGeneratingPitch(false);
    }
  };

  const markAsContacted = async () => {
    const now = new Date().toISOString();
    setContactedAt(now);
    await saveExtras({
      contact_channel: contactChannel,
      contact_recipient: contactRecipient,
      contacted_at: now,
    });
    // Move o status do pipeline para "preparando" se ainda estiver em "interesse"
    if (application?.status === "interesse") {
      await updateApp.mutateAsync({ id: application.id, status: "preparando" });
    }
    // Cria log automático
    await supabase.from("palco_outreach_log").insert({
      user_id: user!.id,
      application_id: applicationId!,
      channel: contactChannel || "other",
      direction: "sent",
      summary: `Proposta enviada via ${contactChannel || "canal"}${contactRecipient ? " para " + contactRecipient : ""}`,
    } as any);
    const { data: logs } = await supabase
      .from("palco_outreach_log")
      .select("id, channel, direction, summary, created_at")
      .eq("application_id", applicationId!)
      .order("created_at", { ascending: false });
    setOutreach((logs || []) as OutreachLog[]);
    toast.success("Contato registrado");
  };

  const addOutreachLog = async () => {
    if (!newLogSummary.trim() || !applicationId || !user) return;
    setLoggingOutreach(true);
    const { error } = await supabase.from("palco_outreach_log").insert({
      user_id: user.id,
      application_id: applicationId,
      channel: newLogChannel,
      direction: "note",
      summary: newLogSummary.trim(),
    } as any);
    if (error) {
      toast.error("Erro ao registrar");
      setLoggingOutreach(false);
      return;
    }
    setNewLogSummary("");
    const { data: logs } = await supabase
      .from("palco_outreach_log")
      .select("id, channel, direction, summary, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });
    setOutreach((logs || []) as OutreachLog[]);
    setLoggingOutreach(false);
  };

  const changeStatus = async (next: ApplicationStatus) => {
    if (!application) return;
    await updateApp.mutateAsync({ id: application.id, status: next });
    refetchApps();
  };

  const daysSinceContact = useMemo(() => {
    if (!contactedAt) return null;
    const diff = Date.now() - new Date(contactedAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [contactedAt]);

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!application || !palco) {
    return (
      <div className="container max-w-2xl mx-auto p-6 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-lg font-semibold mb-2">Proposta não encontrada</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Esta candidatura pode ter sido removida ou você não tem acesso a ela.
        </p>
        <Button onClick={() => navigate("/carreira")}>Voltar para Carreira</Button>
      </div>
    );
  }

  const mailtoHref = contactChannel === "email" && contactRecipient
    ? `mailto:${contactRecipient}?subject=${encodeURIComponent(pitchSubject || "Proposta de apresentação")}&body=${encodeURIComponent(pitchContent || "")}`
    : null;

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/carreira?tab=inscricoes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        {savingExtras && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 ml-auto">
            <Loader2 className="h-3 w-3 animate-spin" /> salvando
          </span>
        )}
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink onClick={() => navigate("/carreira")}>Carreira</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Proposta</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Palco summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30 gap-1 mb-2">
                <Mic2 className="h-3 w-3" /> {palco.area || "Palco"}
              </Badge>
              <h1 className="text-lg font-semibold leading-tight">{palco.titulo}</h1>
              <p className="text-sm text-muted-foreground">{palco.orgao}{palco.estado ? ` · ${palco.estado}` : ""}</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Select value={application.status} onValueChange={(v) => changeStatus(v as ApplicationStatus)}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICATION_STATUS_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {palco.link && (
                <a href={palco.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Página oficial
                </a>
              )}
            </div>
          </div>
          {palco.resumo && <p className="text-xs text-muted-foreground mt-3 whitespace-pre-wrap line-clamp-3">{palco.resumo}</p>}

          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Projeto vinculado (opcional)</Label>
            <Select
              value={projectId}
              onValueChange={async (v) => {
                setProjectId(v);
                await saveExtras({ project_id: v || null });
              }}
            >
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="— Sem projeto —" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stepper */}
      <Tabs value={step} onValueChange={(v) => setStep(v as StepKey)}>
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto">
          {STEPS.map((s, i) => (
            <TabsTrigger key={s.key} value={s.key} className="flex flex-col py-2 text-[11px] gap-0.5">
              <span className="text-[10px] text-muted-foreground">Etapa {i + 1}</span>
              <span>{s.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Step content */}
      {step === "epk" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> EPK / Release</h2>
                <p className="text-xs text-muted-foreground">Material de apresentação que acompanha sua proposta.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerateEpk} disabled={generatingEpk}>
                  {generatingEpk ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {epkContent ? "Regenerar com IA" : "Gerar com IA"}
                </Button>
                <CopyBtn text={epkContent} />
              </div>
            </div>
            <Textarea
              value={epkContent}
              onChange={(e) => setEpkContent(e.target.value)}
              onBlur={() => saveExtras({ epk_content: epkContent })}
              placeholder="Clique em &quot;Gerar com IA&quot; para criar um EPK a partir do seu perfil e do projeto, ou escreva manualmente."
              rows={14}
              className="font-mono text-xs"
            />
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setStep("pitch")}>
                Próximo: Proposta →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "pitch" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold inline-flex items-center gap-1.5"><Send className="h-4 w-4" /> Carta de proposta</h2>
                <p className="text-xs text-muted-foreground">Mensagem curta para o curador / produtor do palco.</p>
              </div>
              <Button size="sm" onClick={handleGeneratePitches} disabled={generatingPitch}>
                {generatingPitch ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Gerar 3 variações
              </Button>
            </div>

            {subjectSuggestions.length > 0 && (
              <div>
                <Label className="text-xs">Sugestões de assunto</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {subjectSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-accent text-left"
                      onClick={() => { setPitchSubject(s); saveExtras({ pitch_subject: s }); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Assunto</Label>
              <Input
                value={pitchSubject}
                onChange={(e) => setPitchSubject(e.target.value)}
                onBlur={() => saveExtras({ pitch_subject: pitchSubject })}
                placeholder="Ex.: Proposta de apresentação — [Artista] no [Palco]"
                className="mt-1"
              />
            </div>

            {pitchVariations && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["formal", "cordial", "direto"] as const).map((tone) => (
                  pitchVariations[tone] ? (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => { setPitchContent(pitchVariations[tone]!); saveExtras({ pitch_content: pitchVariations[tone] }); }}
                      className="text-left text-xs border border-border rounded-lg p-2 hover:bg-accent transition-colors"
                    >
                      <div className="font-medium capitalize mb-1">{tone}</div>
                      <div className="text-muted-foreground line-clamp-4 whitespace-pre-wrap">{pitchVariations[tone]}</div>
                    </button>
                  ) : null
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Texto da proposta</Label>
                <CopyBtn text={pitchContent} />
              </div>
              <Textarea
                value={pitchContent}
                onChange={(e) => setPitchContent(e.target.value)}
                onBlur={() => saveExtras({ pitch_content: pitchContent })}
                rows={12}
                placeholder="Escreva ou cole a mensagem aqui. Personalize antes de enviar."
              />
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setStep("contato")}>
                Próximo: Contato →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {step === "contato" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="font-semibold inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> Canal de contato</h2>
              <p className="text-xs text-muted-foreground">Como você vai enviar a proposta? Registramos para acompanhar a resposta.</p>
            </div>

            <div>
              <Label className="text-xs">Canal</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mt-1">
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  const active = contactChannel === c.v;
                  return (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => { setContactChannel(c.v); saveExtras({ contact_channel: c.v }); }}
                      className={
                        "text-xs px-2 py-2 rounded-md border inline-flex flex-col items-center gap-1 transition-colors " +
                        (active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs">Destinatário (e-mail, @handle ou URL)</Label>
              <Input
                value={contactRecipient}
                onChange={(e) => setContactRecipient(e.target.value)}
                onBlur={() => saveExtras({ contact_recipient: contactRecipient })}
                placeholder={contactChannel === "email" ? "curador@palco.com" : "@curador ou link do formulário"}
                className="mt-1"
              />
            </div>



            <div className="flex flex-wrap gap-2">
              {mailtoHref && (
                <Button size="sm" variant="outline" asChild>
                  <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-3.5 w-3.5 mr-1" /> Abrir no e-mail
                  </a>
                </Button>
              )}
              <CopyBtn text={pitchContent} label="Copiar mensagem" />
              {contactedAt ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 inline-flex items-center gap-1 ml-auto">
                  <CheckCircle2 className="h-3 w-3" /> Enviado em {new Date(contactedAt).toLocaleDateString("pt-BR")}
                </Badge>
              ) : (
                <Button size="sm" onClick={markAsContacted} className="ml-auto" disabled={!contactChannel}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Marcar como enviado
                </Button>
              )}
            </div>

            <div>
              <Label className="text-xs">Notas internas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => updateApp.mutate({ id: application.id, notas: notes })}
                rows={3}
                placeholder='Ex.: "Indicado por Fulana", "Falar com a curadora Maria"…'
                className="mt-1"
              />
            </div>

            {/* ----- Follow-up section ----- */}
            <div className="border-t border-border pt-4 mt-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold inline-flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Acompanhamento</h3>
                  <p className="text-xs text-muted-foreground">Registre cada interação para não perder o follow-up.</p>
                </div>
                {daysSinceContact !== null && daysSinceContact >= 7 && application.status !== "resultado" && (
                  <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/40">
                    <AlertCircle className="h-3 w-3 mr-1" /> Hora de fazer follow-up ({daysSinceContact}d)
                  </Badge>
                )}
              </div>

              {/* Quick status buttons */}
              <div className="flex flex-wrap gap-1.5">
                {(["interesse", "preparando", "inscrito", "resultado"] as ApplicationStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={application.status === s ? "default" : "outline"}
                    onClick={() => changeStatus(s)}
                  >
                    {APPLICATION_STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>

              {/* Quick win — quando o palco é confirmado */}
              {application.status === "resultado" && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                  <div className="text-sm font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Palco confirmado?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate("/agenda")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1" /> Criar evento na Agenda
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/finance")}>
                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Registrar cachet
                    </Button>
                  </div>
                </div>
              )}

              {/* Add log */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <Label className="text-xs">Nova interação / nota</Label>
                <div className="flex gap-2">
                  <Select value={newLogChannel} onValueChange={setNewLogChannel}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Nota</SelectItem>
                      {CHANNELS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newLogSummary}
                    onChange={(e) => setNewLogSummary(e.target.value)}
                    placeholder='Ex.: "Curador respondeu pedindo demo"'
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={addOutreachLog} disabled={loggingOutreach || !newLogSummary.trim()}>
                    {loggingOutreach ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                {outreach.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sem interações registradas ainda. Marque "enviado" acima ou adicione uma nota.
                  </p>
                ) : (
                  outreach.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs border-l-2 border-primary/30 pl-3 py-1">
                      <div className="flex-1">
                        <div className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          <span className="capitalize">{log.channel}</span>
                        </div>
                        <div>{log.summary}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
