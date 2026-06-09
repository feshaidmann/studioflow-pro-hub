import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle, Camera, ChevronDown, FileText, Guitar,
  Layers, Loader2, Mic, Music, Sliders, Video,
} from "lucide-react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { cn } from "@/lib/utils";
import type { Project, Professional } from "@/data/mockData";
import type { Professional as GlobalProfessional } from "@/components/professionals/types";

type WizardSource = "new" | "existing";
type WizardProfType =
  | "Instrumentista" | "Produtor" | "Mix" | "Master"
  | "Compositor" | "Arranjador" | "Videomaker" | "Fotógrafo";

const PROF_SPECIALTY: Record<WizardProfType, string> = {
  Instrumentista: "", Produtor: "Produtor", Mix: "Mix Engineer",
  Master: "Mastering Engineer", Compositor: "Compositor", Arranjador: "Arranjador",
  Videomaker: "Videomaker", Fotógrafo: "Fotógrafo",
};

const PROF_ICONS: Record<WizardProfType, React.ReactNode> = {
  Instrumentista: <Guitar className="h-5 w-5" />,
  Produtor: <Layers className="h-5 w-5" />,
  Mix: <Sliders className="h-5 w-5" />,
  Master: <Mic className="h-5 w-5" />,
  Compositor: <FileText className="h-5 w-5" />,
  Arranjador: <Music className="h-5 w-5" />,
  Videomaker: <Video className="h-5 w-5" />,
  Fotógrafo: <Camera className="h-5 w-5" />,
};

export interface AddTeamWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  globalProfessionals: Array<Professional & { email?: string; phone?: string }>;
  globalsLoading: boolean;
  addProfessional: (projectId: string, prof: Omit<Professional, "id">) => Promise<void>;
  addProfessionalToGlobal: (data: { name: string; specialty: string; email: string; phone: string; bio: string; allowGlobalListing?: boolean }) => Promise<unknown>;
  addNotification: (data: { title: string; message: string; link?: string; type?: string }) => void;
  onFeeRequired: (projectId: string, profName: string, profSpecialty: string, fee: number) => void;
  t: (key: string) => string;
}

const EMPTY_CONTACT = { name: "", email: "", phone: "" };
const EMPTY_PROPOSAL = { fee: "", deadline: "", scheduleNotes: "", permissionsScope: "leitor" as "admin_convidado" | "leitor" };

export function AddTeamWizard({
  open, onOpenChange, project, globalProfessionals, globalsLoading,
  addProfessional, addProfessionalToGlobal, addNotification, onFeeRequired, t,
}: AddTeamWizardProps) {
  const [wizardSource, setWizardSource] = useState<WizardSource>("new");
  const [wizardProfType, setWizardProfType] = useState<WizardProfType | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [selectedExistingProfId, setSelectedExistingProfId] = useState("");
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState(EMPTY_CONTACT);
  const [proposal, setProposal] = useState(EMPTY_PROPOSAL);
  const [deadlineConfirmed, setDeadlineConfirmed] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({});
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, string>>({});
  const [inviteIds, setInviteIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    supabase
      .from("project_invitations")
      .select("id, professional_email, token, status")
      .eq("project_id", project.id)
      .then(({ data }) => {
        if (!data) return;
        const tokens: Record<string, string> = {};
        const statuses: Record<string, string> = {};
        const ids: Record<string, string> = {};
        data.forEach((row) => {
          if (row.token) tokens[row.professional_email] = row.token;
          if (row.status) statuses[row.professional_email] = row.status;
          if (row.id) ids[row.professional_email] = row.id;
        });
        setInviteTokens(tokens);
        setInviteStatuses(statuses);
        setInviteIds(ids);
      });
  }, [open, project.id]);

  const reset = () => {
    setWizardSource("new");
    setWizardProfType(null);
    setInstrumentFilter("");
    setSelectedExistingProfId("");
    setNewContact(EMPTY_CONTACT);
    setProposal(EMPTY_PROPOSAL);
    setDeadlineConfirmed(false);
    setOptionalOpen(false);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const deadlineExceedsProject = (deadline: string): boolean => {
    if (!deadline || !project.estimatedMonths) return false;
    let d: Date | null = null;
    const br = deadline.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (br) d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    else if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!d || isNaN(d.getTime())) return false;
    const end = new Date();
    end.setMonth(end.getMonth() + project.estimatedMonths);
    return d > end;
  };

  const createInvite = async (opts: {
    projectId: string; name: string; email: string;
    role: string; fee: number; deadline: string; scheduleNotes: string;
  }): Promise<string | null> => {
    if (!opts.email) return null;
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    const { data: row, error } = await supabase
      .from("project_invitations")
      .insert({
        project_id: opts.projectId, invited_by: userId,
        professional_name: opts.name, professional_email: opts.email,
        professional_role: opts.role, fee: opts.fee,
        deadline: opts.deadline, schedule_notes: opts.scheduleNotes,
        status: "pending", allow_global_listing: false,
      })
      .select("id, token")
      .single();
    if (error) {
      const msg = (error as { message?: string }).message ?? "";
      if (msg.includes("project_invitations_unique_pending") || (error as { code?: string }).code === "23505") {
        toast.error("Já existe um convite pendente para esse email neste projeto.");
      } else {
        toast.error("Não foi possível criar o convite. Tente novamente.");
      }
      return null;
    }
    if (row?.token) setInviteTokens((prev) => ({ ...prev, [opts.email]: row.token }));
    setInviteStatuses((prev) => ({ ...prev, [opts.email]: "pending" }));
    if (row?.id) {
      setInviteIds((prev) => ({ ...prev, [opts.email]: row.id }));
      toast.success("Convite criado! Copie o link para compartilhar.");
    }
    return row?.id ?? null;
  };

  const filteredGlobals = [...globalProfessionals].sort((a, b) => {
    if (!wizardProfType) return 0;
    if (wizardProfType === "Instrumentista") {
      if (!instrumentFilter) return 0;
      const q = instrumentFilter.toLowerCase();
      const aM = a.specialty.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
      const bM = b.specialty.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
      return aM === bM ? 0 : aM ? -1 : 1;
    }
    const target = PROF_SPECIALTY[wizardProfType].toLowerCase();
    if (!target) return 0;
    return (a.specialty.toLowerCase() === target) === (b.specialty.toLowerCase() === target) ? 0
      : a.specialty.toLowerCase() === target ? -1 : 1;
  });

  const hasDeadlineWarning = !!(proposal.deadline && project.estimatedMonths && deadlineExceedsProject(proposal.deadline));
  const selectedEmail = wizardSource === "new"
    ? newContact.email
    : ((globalProfessionals.find((x) => x.id === selectedExistingProfId) as Professional & { email?: string })?.email ?? "");
  const canSubmit = !!wizardProfType && (wizardSource === "new" ? !!newContact.name : !!selectedExistingProfId);

  const handleSubmit = async () => {
    if (hasDeadlineWarning && !deadlineConfirmed) return;
    setSaving(true);
    const derived = wizardProfType === "Instrumentista"
      ? instrumentFilter
      : (PROF_SPECIALTY[wizardProfType!] || wizardProfType || "");
    try {
      const fee = Number(proposal.fee) || 0;
      if (wizardSource === "new") {
        await addProfessionalToGlobal({ name: newContact.name, specialty: derived, email: newContact.email, phone: newContact.phone, bio: proposal.scheduleNotes, allowGlobalListing: false });
        let invId: string | null = null;
        if (newContact.email) invId = await createInvite({ projectId: project.id, name: newContact.name, email: newContact.email, role: derived || wizardProfType || "", fee, deadline: proposal.deadline, scheduleNotes: proposal.scheduleNotes });
        await addProfessional(project.id, { name: newContact.name, role: wizardProfType ?? "", instrument: derived, email: newContact.email, phone: newContact.phone, fee, notes: proposal.scheduleNotes, invitationId: invId ?? undefined, permissionsScope: proposal.permissionsScope });
        if (fee > 0) onFeeRequired(project.id, newContact.name, derived || wizardProfType || "Profissional", fee);
        else addNotification({ title: "Profissional adicionado", message: `${newContact.name} adicionado à equipe`, link: "/projects", type: "general" });
        toast.success(`${newContact.name} adicionado à equipe`);
      } else {
        const prof = globalProfessionals.find((p) => p.id === selectedExistingProfId) as Professional & { email?: string; phone?: string };
        if (!prof) { setSaving(false); return; }
        let invId: string | null = null;
        if (prof.email) invId = await createInvite({ projectId: project.id, name: prof.name, email: prof.email, role: prof.specialty || wizardProfType || "", fee, deadline: proposal.deadline, scheduleNotes: proposal.scheduleNotes });
        await addProfessional(project.id, { name: prof.name, role: wizardProfType ?? "", instrument: prof.specialty, email: prof.email || "", phone: prof.phone || "", fee, notes: proposal.scheduleNotes, invitationId: invId ?? undefined, permissionsScope: proposal.permissionsScope });
        if (fee > 0) onFeeRequired(project.id, prof.name, prof.specialty || wizardProfType || "Profissional", fee);
        else addNotification({ title: "Profissional adicionado", message: `${prof.name} adicionado à equipe`, link: "/projects", type: "general" });
        toast.success(`${prof.name} adicionado à equipe`);
      }
      handleOpenChange(false);
    } catch {
      toast.error("Erro ao adicionar profissional");
    } finally {
      setSaving(false);
    }
  };

  const optionalCount = [proposal.fee, proposal.deadline, proposal.scheduleNotes].filter((v) => v && String(v).trim() !== "" && String(v) !== "0").length;

  // suppress unused variable warning — these are updated as a side effect for potential future use
  void inviteTokens; void inviteStatuses; void inviteIds;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar à equipe</DialogTitle>
          <DialogDescription>{project.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Professional type */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Tipo de profissional</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.keys(PROF_ICONS) as WizardProfType[]).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setWizardProfType(tp)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all active:scale-95",
                    wizardProfType === tp
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 hover:bg-primary/5 hover:border-primary/40"
                  )}
                >
                  <span>{PROF_ICONS[tp]}</span>
                  <span className="text-xs font-medium">{tp}</span>
                </button>
              ))}
            </div>
          </div>

          {wizardProfType === "Instrumentista" && (
            <div className="space-y-1.5 animate-fade-in">
              <Label>Instrumento *</Label>
              <Input placeholder="ex: Guitarra, Baixo, Bateria…" value={instrumentFilter} onChange={(e) => setInstrumentFilter(e.target.value)} />
            </div>
          )}

          {!globalsLoading && filteredGlobals.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Origem do contato</p>
              <div className="flex gap-1 rounded-lg bg-secondary/40 p-1">
                {(["new", "existing"] as WizardSource[]).map((src) => (
                  <button
                    key={src}
                    onClick={() => setWizardSource(src)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      wizardSource === src ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {src === "new" ? "Novo contato" : "Minha agenda"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {wizardSource === "new" && (
            <div className="space-y-3 animate-fade-in">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="Nome completo" value={newContact.name} onChange={(e) => setNewContact((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="email@exemplo.com" value={newContact.email} onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input placeholder="+55 11 9…" value={newContact.phone} onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {wizardSource === "existing" && (
            <div className="space-y-2 animate-fade-in">
              {globalsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("misc.loading")}
                </div>
              ) : (
                <Select value={selectedExistingProfId} onValueChange={setSelectedExistingProfId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um profissional…" /></SelectTrigger>
                  <SelectContent>
                    {filteredGlobals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Access level */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Nível de acesso</p>
            <div className="flex gap-2">
              {([
                { value: "leitor" as const, label: "Leitor", desc: "Apenas dados relevantes para sua função" },
                { value: "admin_convidado" as const, label: "Admin", desc: "Gerencia o projeto, mas não pode deletar" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProposal((f) => ({ ...f, permissionsScope: opt.value }))}
                  className={cn(
                    "flex-1 rounded-lg border p-3 text-left transition-all",
                    proposal.permissionsScope === opt.value ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/40"
                  )}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Optional details */}
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", optionalOpen && "rotate-180")} />
              <span>Detalhes opcionais</span>
              {optionalCount > 0 ? (
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4">
                  {optionalCount} preenchido{optionalCount !== 1 ? "s" : ""}
                </Badge>
              ) : (
                <span className="ml-auto text-[10px] text-muted-foreground/70">3 campos</span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cachê (R$)</Label>
                  <Input type="number" placeholder="0" value={proposal.fee} onChange={(e) => setProposal((f) => ({ ...f, fee: e.target.value }))} className="font-mono-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label>Prazo de entrega</Label>
                  <DatePickerField
                    value={proposal.deadline}
                    onChange={(v) => { setProposal((f) => ({ ...f, deadline: v })); setDeadlineConfirmed(false); }}
                    disablePast
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas / Observações</Label>
                <Textarea placeholder="Dias disponíveis, horário de gravação…" value={proposal.scheduleNotes} onChange={(e) => setProposal((f) => ({ ...f, scheduleNotes: e.target.value }))} className="h-20 resize-none" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {hasDeadlineWarning && (
            <div className="flex flex-col gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">O prazo excede o cronograma estimado ({project.estimatedMonths} meses).</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={deadlineConfirmed} onCheckedChange={(v) => setDeadlineConfirmed(!!v)} />
                <span className="text-xs">Confirmar mesmo assim</span>
              </label>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving || (hasDeadlineWarning && !deadlineConfirmed)}
            className="w-full"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {selectedEmail ? "Enviar proposta" : "Adicionar à equipe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
