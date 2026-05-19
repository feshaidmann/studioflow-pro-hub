import { useState, useEffect, useRef } from "react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Plus, Check, X as XIcon, Users, UserPlus, Mail, Phone, DollarSign, Music, Activity, Pencil, Trash2, CheckCircle2, AlertTriangle, Clock, ChevronLeft, Loader2, Guitar, Mic, Sliders, Layers, ChevronDown, Trophy, Upload, MessageSquare, ArrowRight, FileText, Video, Camera, MoreVertical, Calendar, Sparkles, Rocket } from "lucide-react";
import { Label } from "@/components/ui/label";
import { type Project, type Professional, type ProjectType } from "@/data/mockData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfile } from "@/contexts/ProfileContext";
import { GENRE_OPTIONS, AUDIENCE_SIZE_OPTIONS } from "@/constants/genreOptions";

import { useProfessionals } from "@/hooks/useProfessionals";

import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProjectFinanceCard from "@/components/finance/ProjectFinanceCard";
import TransactionForm from "@/components/finance/TransactionForm";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import MasterAnalyzerModal from "@/components/MasterAnalyzerModal";
import RatePartnersModal from "@/components/RatePartnersModal";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";

const stages = ["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const;

type WizardSource = "new" | "existing";
type WizardProfType = "Instrumentista" | "Produtor" | "Mix" | "Master" | "Compositor" | "Arranjador" | "Videomaker" | "Fotógrafo";

type ProjectTemplate = "none" | "single_basico" | "banda_completa" | "producao_eletronica" | "podcast";
const PROJECT_TEMPLATES: Record<ProjectTemplate, { label: string; description: string; tracks: string[] }> = {
  none: { label: "Em branco", description: "Sem tracks pré-definidas", tracks: [] },
  single_basico: { label: "Single Básico", description: "Voz, Violão, Beat, Master Bus", tracks: ["Voz Principal", "Violão", "Beat", "Master Bus"] },
  banda_completa: { label: "Banda Completa", description: "Voz, Guitarra, Baixo, Bateria, Teclado, Master Bus", tracks: ["Voz Principal", "Backing Vocal", "Guitarra", "Baixo", "Bateria", "Teclado", "Master Bus"] },
  producao_eletronica: { label: "Produção Eletrônica", description: "Beat, Synth, Bass, FX, Vocal, Master Bus", tracks: ["Beat", "Synth Lead", "Synth Pad", "Bass", "FX", "Vocal", "Master Bus"] },
  podcast: { label: "Podcast / Voz", description: "Host, Convidado, BG Music, Master Bus", tracks: ["Host", "Convidado", "BG Music", "Master Bus"] },
};

const profTypeSpecialty: Record<WizardProfType, string> = {
  Instrumentista: "",
  Produtor: "Produtor",
  Mix: "Mix Engineer",
  Master: "Mastering Engineer",
  Compositor: "Compositor",
  Arranjador: "Arranjador",
  Videomaker: "Videomaker",
  Fotógrafo: "Fotógrafo",
};

const profTypeIcons: Record<WizardProfType, React.ReactNode> = {
  Instrumentista: <Guitar className="h-5 w-5" />,
  Produtor: <Layers className="h-5 w-5" />,
  Mix: <Sliders className="h-5 w-5" />,
  Master: <Mic className="h-5 w-5" />,
  Compositor: <FileText className="h-5 w-5" />,
  Arranjador: <Music className="h-5 w-5" />,
  Videomaker: <Video className="h-5 w-5" />,
  Fotógrafo: <Camera className="h-5 w-5" />,
};

type PaymentMode = "single" | "installments";



export default function Projects() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { displayName, profile } = useProfile();
  const {
    projects, professionals, masterResults,
    addProject, updateProject, deleteProject,
    getMixPercent, getProjectFinancials,
    addProfessional, removeProfessional, addProfessionalToGlobal,
    addTransaction, transactions,
  } = useProjects();
  const { professionals: globalProfessionals, loading: globalsLoading } = useProfessionals();

  /* ── Filters ── */
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getProjectStatus = (project: Project): { label: string; color: string; key: string } => {
    if (project.completed) return { label: "Concluído", color: "text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)]", key: "concluido" };
    const financials = getProjectFinancials(project.id);
    const budget = project.totalContractValue ?? 0;
    const budgetOver = budget > 0 && financials.totalExpense / budget > 0.9;

    if (budgetOver) return { label: "Orçamento em risco", color: "text-warning border-warning/30 bg-warning/10", key: "risco" };
    if (project.stage === "master" || project.stage === "upload") return { label: "Quase lá", color: "text-primary border-primary/30 bg-primary/10", key: "quase" };
    if (project.mixPercent === 0 && project.stage === "inicio") return { label: "Recém criado", color: "text-muted-foreground border-border bg-muted/30", key: "parado" };
    return { label: "No prazo", color: "text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)]", key: "no_prazo" };
  };
  const { addNotification } = useNotifications();

  /* ── Guest projects (projects where user is an invited member) ── */
  const [guestProjects, setGuestProjects] = useState<Array<{ id: string; name: string; artist: string; stage: string; completed: boolean; project_type: string; role: string }>>([]);
  useEffect(() => {
    supabase.rpc("get_member_projects").then(({ data }) => {
      if (data) setGuestProjects(data);
    });
  }, []);

  /* ── State ── */
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showTeam, setShowTeam] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", artist: "", bpm: "120", key: "C", stage: "inicio" as Project["stage"], projectType: "single" as ProjectType, trackCount: "", uploadDate: "", template: "none" as ProjectTemplate, genre: "", audienceSize: "" });

  /* ── Wizard state (single-step) ── */
  const [wizardSource, setWizardSource] = useState<WizardSource>("new");
  const [wizardProfType, setWizardProfType] = useState<WizardProfType | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [selectedExistingProfId, setSelectedExistingProfId] = useState("");
  const [wizardSaving, setWizardSaving] = useState(false);
  const [newContactForm, setNewContactForm] = useState({ name: "", email: "", phone: "" });
  const [proposalForm, setProposalForm] = useState({ fee: "", deadline: "", scheduleNotes: "", permissionsScope: "leitor" as "admin_convidado" | "leitor" });
  const [deadlineWarningConfirmed, setDeadlineWarningConfirmed] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  /* ── Payment modal state ── */
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{ projectId: string; profName: string; profSpecialty: string; fee: number } | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("single");
  const [installmentCount, setInstallmentCount] = useState("2");

  /* ── Invite tokens (for wizard submission) ── */
  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({});
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, string>>({});
  const [inviteIds, setInviteIds] = useState<Record<string, string>>({});

  /* ── Notes debounce timer ── */
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!selectedProject) return;
    supabase.from("project_invitations").select("id, professional_email, token, status").eq("project_id", selectedProject.id).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      const statusMap: Record<string, string> = {};
      const idMap: Record<string, string> = {};
      data.forEach((row) => {
        if (row.token) map[row.professional_email] = row.token;
        if (row.status) statusMap[row.professional_email] = row.status;
        if (row.id) idMap[row.professional_email] = row.id;
      });
      setInviteTokens(map);
      setInviteStatuses(statusMap);
      setInviteIds(idMap);
    });
  }, [selectedProject?.id]);

  useEffect(() => {
    const idParam = searchParams.get("id");
    const newParam = searchParams.get("new");
    if (newParam === "1") {
      setForm((prev) => ({ ...prev, artist: prev.artist || displayName }));
      setDialogOpen(true);
      setSearchParams((prev) => { prev.delete("new"); return prev; }, { replace: true });
    }
    if (!idParam || projects.length === 0) return;
    const found = projects.find((p) => p.id === idParam);
    if (found) setSelectedProject(found);
  }, [searchParams, projects]);


  const resetWizard = () => {
    setWizardSource("new");
    setWizardProfType(null);
    setInstrumentFilter("");
    setSelectedExistingProfId("");
    setNewContactForm({ name: "", email: "", phone: "" });
    setProposalForm({ fee: "", deadline: "", scheduleNotes: "", permissionsScope: "leitor" });
    setDeadlineWarningConfirmed(false);
    setOptionalOpen(false);
    setWizardSaving(false);
  };

  const checkDeadlineExceedsProject = (deadline: string): boolean => {
    if (!deadline || !selectedProject?.estimatedMonths) return false;
    let deadlineDate: Date | null = null;
    const brMatch = deadline.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const isoMatch = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (brMatch) deadlineDate = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    else if (isoMatch) deadlineDate = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
    const projectEnd = new Date();
    projectEnd.setMonth(projectEnd.getMonth() + selectedProject.estimatedMonths);
    return deadlineDate > projectEnd;
  };

  const handleTeamDialogChange = (open: boolean) => {
    setTeamDialogOpen(open);
    if (!open) resetWizard();
  };

  const filteredGlobals = [...globalProfessionals].sort((a, b) => {
    if (!wizardProfType) return 0;
    if (wizardProfType === "Instrumentista") {
      if (!instrumentFilter) return 0;
      const aMatch = a.specialty.toLowerCase().includes(instrumentFilter.toLowerCase()) || a.name.toLowerCase().includes(instrumentFilter.toLowerCase());
      const bMatch = b.specialty.toLowerCase().includes(instrumentFilter.toLowerCase()) || b.name.toLowerCase().includes(instrumentFilter.toLowerCase());
      return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
    }
    const target = profTypeSpecialty[wizardProfType].toLowerCase();
    if (!target) return 0;
    const aMatch = a.specialty.toLowerCase() === target;
    const bMatch = b.specialty.toLowerCase() === target;
    return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
  });


  const createInviteRecord = async (opts: { projectId: string; name: string; email: string; role: string; fee: number; deadline: string; scheduleNotes: string }): Promise<string | null> => {
    if (!opts.email) return null;
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    const { data: row, error: insertErr } = await supabase.from("project_invitations").insert({
      project_id: opts.projectId,
      invited_by: userId,
      professional_name: opts.name,
      professional_email: opts.email,
      professional_role: opts.role,
      fee: opts.fee,
      deadline: opts.deadline,
      schedule_notes: opts.scheduleNotes,
      status: "pending",
      allow_global_listing: false,
    }).select("id, token").single();
    if (insertErr) {
      const msg = (insertErr as any).message ?? "";
      if (msg.includes("project_invitations_unique_pending") || (insertErr as any).code === "23505") {
        toast.error("Já existe um convite pendente para esse email neste projeto.");
      } else {
        toast.error("Não foi possível criar o convite. Tente novamente.");
      }
      return null;
    }
    if (row?.token) {
      setInviteTokens((prev) => ({ ...prev, [opts.email]: row.token }));
      setInviteStatuses((prev) => ({ ...prev, [opts.email]: "pending" }));
    }
    if (row?.id) {
      setInviteIds((prev) => ({ ...prev, [opts.email]: row.id }));
      toast.success("Convite criado! Copie o link para compartilhar.");
    }
    return row?.id ?? null;
  };

  const createFeeTransactions = async (projectId: string, profName: string, profSpecialty: string, fee: number, mode: PaymentMode, installments: number) => {
    const today = new Date();
    if (mode === "single") {
      await addTransaction({ projectId, type: "expense", description: `Cachê — ${profName} (${profSpecialty})`, amount: fee, date: today.toISOString().slice(0, 10), category: "Músicos e Session", paid: false });
    } else {
      const perInstall = Math.round((fee / installments) * 100) / 100;
      for (let i = 0; i < installments; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + i);
        await addTransaction({ projectId, type: "expense", description: `Cachê — ${profName} (${profSpecialty}) (parcela ${i + 1}/${installments})`, amount: perInstall, date: d.toISOString().slice(0, 10), category: "Músicos e Session", paid: false });
      }
    }
    addNotification({ title: "Profissional adicionado", message: `${profName} adicionado à equipe com cachê de R$ ${fee.toLocaleString()}`, link: "/projects", type: "general" });
  };

  const triggerPaymentModal = (projectId: string, profName: string, profSpecialty: string, fee: number) => {
    setPendingPaymentData({ projectId, profName, profSpecialty, fee });
    setPaymentMode("single");
    setInstallmentCount("2");
    setPaymentModalOpen(true);
  };

  const handlePaymentConfirm = async () => {
    if (!pendingPaymentData) return;
    const { projectId, profName, profSpecialty, fee } = pendingPaymentData;
    await createFeeTransactions(projectId, profName, profSpecialty, fee, paymentMode, Number(installmentCount));
    setPaymentModalOpen(false);
    setPendingPaymentData(null);
  };

  /* ── Unified submit ── */
  const handleSubmitProposal = async () => {
    if (!selectedProject) return;
    const hasWarning = !!(proposalForm.deadline && selectedProject?.estimatedMonths && checkDeadlineExceedsProject(proposalForm.deadline));
    if (hasWarning && !deadlineWarningConfirmed) return;
    setWizardSaving(true);
    const derivedSpecialty = wizardProfType === "Instrumentista" ? instrumentFilter : (profTypeSpecialty[wizardProfType!] || wizardProfType || "");
    try {
      const fee = Number(proposalForm.fee) || 0;
      if (wizardSource === "new") {
        await addProfessionalToGlobal({ name: newContactForm.name, specialty: derivedSpecialty, email: newContactForm.email, phone: newContactForm.phone, bio: proposalForm.scheduleNotes, allowGlobalListing: false });
        let invitationId: string | null = null;
        if (newContactForm.email) invitationId = await createInviteRecord({ projectId: selectedProject.id, name: newContactForm.name, email: newContactForm.email, role: derivedSpecialty || wizardProfType || "", fee, deadline: proposalForm.deadline, scheduleNotes: proposalForm.scheduleNotes });
        await addProfessional(selectedProject.id, { name: newContactForm.name, role: wizardProfType ?? "", instrument: derivedSpecialty, email: newContactForm.email, phone: newContactForm.phone, fee, notes: proposalForm.scheduleNotes, invitationId: invitationId ?? undefined, permissionsScope: proposalForm.permissionsScope });
        if (fee > 0) triggerPaymentModal(selectedProject.id, newContactForm.name, derivedSpecialty || wizardProfType || "Profissional", fee);
        else addNotification({ title: "Profissional adicionado", message: `${newContactForm.name} adicionado à equipe`, link: "/projects", type: "general" });
        toast.success(`${newContactForm.name} adicionado à equipe ✅`);
      } else {
        const prof = globalProfessionals.find((p) => p.id === selectedExistingProfId);
        if (!prof) { setWizardSaving(false); return; }
        let invitationId: string | null = null;
        if ((prof as any).email) invitationId = await createInviteRecord({ projectId: selectedProject.id, name: prof.name, email: (prof as any).email, role: prof.specialty || wizardProfType || "", fee, deadline: proposalForm.deadline, scheduleNotes: proposalForm.scheduleNotes });
        await addProfessional(selectedProject.id, { name: prof.name, role: wizardProfType ?? "", instrument: prof.specialty, email: (prof as any).email || "", phone: (prof as any).phone || "", fee, notes: proposalForm.scheduleNotes, invitationId: invitationId ?? undefined, permissionsScope: proposalForm.permissionsScope });
        if (fee > 0) triggerPaymentModal(selectedProject.id, prof.name, prof.specialty || wizardProfType || "Profissional", fee);
        else addNotification({ title: "Profissional adicionado", message: `${prof.name} adicionado à equipe`, link: "/projects", type: "general" });
        toast.success(`${prof.name} adicionado à equipe ✅`);
      }
      setTeamDialogOpen(false);
      resetWizard();
    } catch {
      toast.error("Erro ao adicionar profissional");
    } finally {
      setWizardSaving(false);
    }
  };

  /* ── Derived wizard helpers ── */
  const proposalHasDeadlineWarning = !!(proposalForm.deadline && selectedProject?.estimatedMonths && checkDeadlineExceedsProject(proposalForm.deadline));
  const wizardSelectedName = wizardSource === "new" ? newContactForm.name : globalProfessionals.find((x) => x.id === selectedExistingProfId)?.name ?? "";
  const wizardSelectedEmail = wizardSource === "new" ? newContactForm.email : (globalProfessionals.find((x) => x.id === selectedExistingProfId) as any)?.email ?? "";
  const canContinueToProposal = (() => {
    if (!wizardProfType) return false;
    if (wizardSource === "new") return !!newContactForm.name;
    return !!selectedExistingProfId;
  })();

  /* ── Edit/Delete state ── */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", artist: "", bpm: "120", key: "C", stage: "inicio" as Project["stage"], projectType: "single" as ProjectType, trackCount: "", uploadDate: "", genre: "", audienceSize: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);
  const [masterAnalyzerModalOpen, setMasterAnalyzerModalOpen] = useState(false);
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [ratePartnersOpen, setRatePartnersOpen] = useState(false);
  const [completedProjectMembers, setCompletedProjectMembers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [completedProjectId, setCompletedProjectId] = useState<string>("");
  const [completedProjectName, setCompletedProjectName] = useState<string>("");
  const { addTask } = useTasks();

  const stageLabel = (s: string) => t(`stage.${s}`);

  const handleConfirmUpload = async () => {
    if (!selectedProject) return;
    setConfirmUploadOpen(false);
    setMasterAnalyzerModalOpen(false);
    toast.success("✅ Master analisado! Avance o projeto para 'Lançado' para concluí-lo.");
  };

  const handleLancadoCompletion = async (projectId: string, projectName: string) => {
    await updateProject(projectId, { completed: true, stage: "lancado" });
    setSelectedProject((prev) => prev ? { ...prev, completed: true, stage: "lancado" } : null);
    addNotification({ title: "Projeto lançado! 🎉", message: `${projectName} foi lançado com sucesso`, link: "/projects", type: "stage" });
    toast.success("🎉 Projeto lançado e concluído!");

    const { data: members } = await supabase
      .from("project_members")
      .select("id, name, email, role")
      .eq("project_id", projectId);

    setCompletedProjectMembers((members ?? []) as { id: string; name: string; email: string; role: string }[]);
    setCompletedProjectId(projectId);
    setCompletedProjectName(projectName);
    setRatePartnersOpen(true);
  };

  const handleCancelWithTask = async () => {
    if (!selectedProject) return;
    await addTask({ description: `Verificar master — ${selectedProject.name}`, projectId: selectedProject.id, source: "master_check", autoGenerated: false });
    setMasterAnalyzerModalOpen(false);
    toast.success("Tarefa adicionada: Verificar master do projeto ✅");
  };

  const handleAddProject = async () => {
    if (!form.genre) { toast.error("Selecione o gênero principal"); return; }
    if ((form.projectType === "ep" || form.projectType === "album") && (!form.trackCount || Number(form.trackCount) < 1)) { toast.error(t("projects.trackCount") + " é obrigatório para EP/Álbum"); return; }
    let uploadDateStr = "";
    if (form.uploadDate) {
      try {
        const parts = form.uploadDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (parts) uploadDateStr = `${parts[3]}-${parts[2]}-${parts[1]}`;
      } catch { /* ignore */ }
    }
    const needsTrackCount = form.projectType === "ep" || form.projectType === "album";
    const templateTracks = form.template !== "none" ? PROJECT_TEMPLATES[form.template].tracks : null;
    try {
      const newProj = await addProject({
        name: form.name,
        artist: form.artist,
        bpm: Number(form.bpm),
        key: form.key,
        stage: form.stage,
        projectType: form.projectType,
        trackCount: needsTrackCount ? (form.trackCount ? Number(form.trackCount) : null) : null,
        totalContractValue: null,
        amountPaid: null,
        estimatedMonths: null,
        uploadDate: uploadDateStr,
        templateTracks: templateTracks,
        genre: form.genre || null,
        audienceSizeAtStart: form.audienceSize || null,
        artistState: (profile as any)?.state ?? null,
      });
      if (!newProj) {
        toast.error("Erro ao criar projeto. Verifique sua conexão e tente novamente.");
        return;
      }
      setForm({ name: "", artist: "", bpm: "120", key: "C", stage: "inicio", projectType: "single", trackCount: "", uploadDate: "", template: "none", genre: "", audienceSize: "" });
      setDialogOpen(false);
      addNotification({ title: "Novo projeto criado", message: `${newProj.name} foi adicionado aos seus projetos`, link: "/projects", type: "stage" });
      toast.success(`Projeto "${newProj.name}" criado! Adicione sua equipe para começar. 🎵`);
    } catch (e) {
      toast.error("Erro ao criar projeto. Tente novamente.");
    }
  };

  const openEditDialog = (project: Project) => {
    let uploadDateDisplay = "";
    if (project.uploadDate) {
      // uploadDate is stored as yyyy-MM-dd; convert to dd/MM/yyyy for the picker
      const parts = project.uploadDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (parts) uploadDateDisplay = `${parts[3]}/${parts[2]}/${parts[1]}`;
    }
    setEditForm({ id: project.id, name: project.name, artist: project.artist, bpm: String(project.bpm), key: project.key, stage: project.stage, projectType: project.projectType || "single", trackCount: project.trackCount ? String(project.trackCount) : "", uploadDate: uploadDateDisplay, genre: (project as any).genre ?? "", audienceSize: (project as any).audienceSizeAtStart ?? "" });
    setEditDialogOpen(true);
  };

  const handleEditProject = async () => {
    if ((editForm.projectType === "ep" || editForm.projectType === "album") && (!editForm.trackCount || Number(editForm.trackCount) < 1)) { toast.error(t("projects.trackCount") + " é obrigatório para EP/Álbum"); return; }
    let uploadDateStr = "";
    if (editForm.uploadDate) {
      const parts = editForm.uploadDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (parts) uploadDateStr = `${parts[3]}-${parts[2]}-${parts[1]}`;
    }
    const needsTrackCount = editForm.projectType === "ep" || editForm.projectType === "album";
    const isLancado = editForm.stage === "lancado";
    const wasAlreadyCompleted = projects.find((p) => p.id === editForm.id)?.completed ?? false;
    const updates: Partial<Project> = {
      name: editForm.name,
      artist: editForm.artist,
      bpm: Number(editForm.bpm),
      key: editForm.key,
      stage: editForm.stage,
      projectType: editForm.projectType,
      trackCount: needsTrackCount ? (editForm.trackCount ? Number(editForm.trackCount) : null) : null,
      uploadDate: uploadDateStr,
      genre: editForm.genre || null,
      audienceSizeAtStart: editForm.audienceSize || null,
      ...(isLancado ? { completed: true } : {}),
    };
    await updateProject(editForm.id, updates);
    if (selectedProject?.id === editForm.id) setSelectedProject((prev) => prev ? { ...prev, ...updates } : null);
    setEditDialogOpen(false);
    if (isLancado && !wasAlreadyCompleted) {
      await handleLancadoCompletion(editForm.id, editForm.name);
    } else {
      toast.success("Projeto atualizado! Confira as mudanças na timeline.");
    }
  };

  const openDeleteDialog = (projectId: string) => { setDeleteTargetId(projectId); setDeleteDialogOpen(true); };

  const handleDeleteProject = () => {
    if (!deleteTargetId) return;
    deleteProject(deleteTargetId);
    if (selectedProject?.id === deleteTargetId) setSelectedProject(null);
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
    toast.success("Projeto removido do seu histórico.");
  };

  const deleteTargetProject = projects.find((p) => p.id === deleteTargetId);
  const teamForSelected = selectedProject ? professionals[selectedProject.id] || [] : [];
  const masterForSelected = selectedProject ? masterResults[selectedProject.id] : undefined;

  const activosCount = projects.filter((p) => !p.completed).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Mobile sticky header com CTA primário */}
      <MobileStickyHeader
        title={t("projects.title")}
        subtitle={`${activosCount} ${activosCount === 1 ? "ativo" : "ativos"}`}
        cta={
          <Button
            size="sm"
            className="h-9 active:scale-95 transition-transform"
            onClick={() => { setForm((prev) => ({ ...prev, artist: prev.artist || displayName })); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        }
      />

      <div className="hidden md:flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{t("projects.title")}</h1>
          {(() => {
            const activos = projects.filter((p) => !p.completed);
            const quase = activos.filter((p) => getProjectStatus(p).key === "quase").length;
            const concluidos = projects.length - activos.length;
            const parts: string[] = [];
            parts.push(`${activos.length} ${activos.length === 1 ? "ativo" : "ativos"}`);
            if (quase > 0) parts.push(`${quase} quase pronto${quase > 1 ? "s" : ""}`);
            if (concluidos > 0) parts.push(`${concluidos} concluído${concluidos > 1 ? "s" : ""}`);
            return <p className="text-xs text-muted-foreground mt-1">{parts.join(" · ")}</p>;
          })()}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setForm((prev) => ({ ...prev, artist: prev.artist || displayName })); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="active:scale-95 transition-transform shrink-0"><Plus className="h-4 w-4 mr-1" /> {t("projects.addProject")}</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle>{t("projects.newProject")}</DialogTitle>
              <DialogDescription>
                {t("projects.newProjectDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">{t("projects.projectName")}</Label>
                <Input id="proj-name" placeholder={t("projects.projectNamePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-artist">Artista</Label>
                <Input id="proj-artist" placeholder={t("projects.artistPlaceholder")} value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="proj-bpm">{t("projects.bpm")}</Label><Input id="proj-bpm" placeholder="128" type="number" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })} className="font-mono-nums" /></div>
                <div className="space-y-1.5"><Label htmlFor="proj-key">{t("projects.key")}</Label><Input id="proj-key" placeholder={t("projects.keyPlaceholder")} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("projects.currentStage")}</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Project["stage"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const).map((s) => <SelectItem key={s} value={s}>{t(`stage.${s}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("projects.projectType")}</Label>
                <Select value={form.projectType} onValueChange={(v) => setForm({ ...form, projectType: v as ProjectType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t("projects.single")}</SelectItem>
                    <SelectItem value="ep">{t("projects.ep")}</SelectItem>
                    <SelectItem value="album">{t("projects.album")}</SelectItem>
                    <SelectItem value="beat">{t("projects.beat")}</SelectItem>
                    <SelectItem value="trilha_guia">{t("projects.trilha_guia")}</SelectItem>
                    <SelectItem value="feat">{t("projects.feat")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.projectType === "ep" || form.projectType === "album") && (
                <div className="space-y-1.5"><Label>{t("projects.trackCount")}</Label><Input type="number" min="1" placeholder="8" value={form.trackCount} onChange={(e) => setForm({ ...form, trackCount: e.target.value })} className="font-mono-nums" /></div>
              )}
              <div className="space-y-1.5">
                <Label>Gênero principal *</Label>
                <Select value={form.genre} onValueChange={(v) => setForm({ ...form, genre: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gênero" /></SelectTrigger>
                  <SelectContent>
                    {GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Usamos para te mostrar referências do seu estilo.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Seus seguidores hoje</Label>
                <Select value={form.audienceSize} onValueChange={(v) => setForm({ ...form, audienceSize: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_SIZE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Usamos para comparar seu crescimento ao longo do tempo.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Data estimada de lançamento</Label>
                <DatePickerField
                  value={form.uploadDate}
                  onChange={(val) => setForm({ ...form, uploadDate: val })}
                  placeholder="Selecionar data de lançamento"
                />
              </div>
              {/* Template selection */}
              <div className="space-y-1.5">
                <Label>Template de tracks</Label>
                <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v as ProjectTemplate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PROJECT_TEMPLATES) as [ProjectTemplate, typeof PROJECT_TEMPLATES[ProjectTemplate]][]).map(([key, tmpl]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{tmpl.label}</span>
                          <span className="text-[10px] text-muted-foreground">{tmpl.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddProject} disabled={!form.name} className="active:scale-95 transition-transform">{t("projects.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Guest projects: projects where the user is an invited member ── */}
      {guestProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Projetos em que você participa</h2>
            <Badge variant="secondary" className="text-xs">{guestProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {guestProjects.map((gp) => (
              <Card key={gp.id} className="glass-card border-border/60 hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{gp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{gp.artist}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{gp.completed ? "Concluído" : t(`stage.${gp.stage}`)}</Badge>
                  </div>
                  {gp.role && (
                    <p className="text-xs text-muted-foreground">
                      Sua função: <span className="text-foreground font-medium">{gp.role}</span>
                    </p>
                  )}
                  <Link to={`/projects/${gp.id}`}>
                    <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs mt-1 border-primary/30 hover:border-primary/60 hover:bg-primary/10">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Ver projeto e chat
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedProject ? (
        <Card className="glass-card animate-scale-in border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedProject.name} — {t("projects.timeline")}</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(selectedProject)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(selectedProject.id)}><Trash2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}><XIcon className="h-4 w-4" /></Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{selectedProject.artist} · <span className="font-mono-nums">{selectedProject.bpm}</span> BPM · {selectedProject.key}</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {(["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const).map((stage, i, arr) => {
                const stageList = ["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const;
                const stageIdx = stageList.indexOf(selectedProject.stage as typeof stageList[number]);
                const completed = selectedProject.completed || i < stageIdx;
                const current = !selectedProject.completed && i === stageIdx;
                const isLast = i === arr.length - 1;
                const isDisabled = selectedProject.completed;
                return (
                  <div key={stage} className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isDisabled}
                      title={isDisabled ? undefined : `Ir para: ${stageLabel(stage)}`}
                      onClick={async () => {
                        if (isDisabled || current) return;
                        if (stage === "lancado") {
                          await updateProject(selectedProject.id, { stage: "lancado" });
                          setSelectedProject((prev) => prev ? { ...prev, stage: "lancado" } : null);
                          handleLancadoCompletion(selectedProject.id, selectedProject.name);
                        } else {
                          await updateProject(selectedProject.id, { stage });
                          setSelectedProject((prev) => prev ? { ...prev, stage } : null);
                          toast.success(`Estágio atualizado: ${stageLabel(stage)}`);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg min-w-[88px] text-center transition-all border",
                        "focus:outline-none",
                        isDisabled
                          ? "cursor-default opacity-80"
                          : current
                          ? "cursor-default"
                          : "cursor-pointer hover:scale-105 hover:shadow-md",
                        completed
                          ? "bg-success/15 border-success/40 text-success"
                          : current
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <span className="text-[11px] font-medium leading-tight">{stageLabel(stage)}</span>
                      {completed
                        ? <Check className="h-3.5 w-3.5" />
                        : current
                        ? <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        : <div className="h-2 w-2 rounded-full bg-border/60" />
                      }
                    </button>
                    {!isLast && (
                      <div className={cn("h-0.5 w-4 shrink-0 rounded-full transition-colors", completed ? "bg-success/60" : "bg-border/40")} />
                    )}
                  </div>
                );
              })}
            </div>

            {selectedProject.completed ? (
              <div className="mt-4 rounded-lg bg-success/10 border border-success/30 p-3 flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">Projeto lançado e concluído! 🎉</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs h-7 border-success/40 text-success hover:bg-success/10"
                  onClick={async () => {
                    await updateProject(selectedProject.id, { completed: false, stage: "upload" });
                    setSelectedProject((prev) => prev ? { ...prev, completed: false, stage: "upload" } : null);
                    toast.success("Projeto reaberto ✅");
                  }}
                >
                  Reabrir
                </Button>
              </div>
            ) : selectedProject.stage === "upload" && (
              <Button onClick={() => setMasterAnalyzerModalOpen(true)} className="mt-4 w-full active:scale-95 transition-transform gap-2">
                <Upload className="h-4 w-4" />Analisar Master (Upload)
              </Button>
            )}

            {masterForSelected && (
              <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Master Analysis</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{masterForSelected.fileName}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div><span className="text-muted-foreground">LUFS: </span><span className={cn("font-mono-nums font-bold", masterForSelected.lufs <= -14 ? "text-success" : "text-destructive")}>{masterForSelected.lufs.toFixed(1)}</span></div>
                  <div><span className="text-muted-foreground">Peak: </span><span className={cn("font-mono-nums font-bold", masterForSelected.truePeak <= -1 ? "text-success" : masterForSelected.truePeak <= 0 ? "text-warning" : "text-destructive")}>{masterForSelected.truePeak.toFixed(1)} dBTP</span></div>
                  <div><span className="text-muted-foreground">DR: </span><span className={cn("font-mono-nums font-bold", masterForSelected.dynamicRange >= 7 ? "text-success" : "text-warning")}>{masterForSelected.dynamicRange.toFixed(1)} LU</span></div>
                </div>
              </div>
            )}

            <ProjectFinanceCard projectId={selectedProject.id} onNewTransaction={() => setTxFormOpen(true)} onViewAll={() => navigate("/finance")} />

            {/* Observações do projeto */}
            <div className="mt-6 border-t border-border pt-4">
              <Label className="text-sm font-medium mb-2 block">Observações</Label>
              <Textarea
                placeholder="Anotações sobre o projeto, referências, acordos, próximos passos…"
                value={selectedProject.notes ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  // Update local state immediately for snappy UI
                  setSelectedProject((prev) => prev ? { ...prev, notes: val } : null);
                  // Debounce DB write so we don't hammer Supabase per keystroke
                  if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
                  notesDebounceRef.current = setTimeout(() => {
                    updateProject(selectedProject.id, { notes: val });
                  }, 600);
                }}
                className="resize-none h-28"
              />
            </div>

            {/* Team Section */}
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setShowTeam(!showTeam)} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                  <Users className="h-4 w-4" />
                  Colaboradores ({teamForSelected.length})
                </button>
                <Dialog open={teamDialogOpen} onOpenChange={handleTeamDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs"><UserPlus className="h-3 w-3 mr-1" /> {t("team.add")}</Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Adicionar à equipe</DialogTitle>
                      <DialogDescription>{selectedProject.name}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      {/* Professional type grid */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Tipo de profissional</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {(["Instrumentista", "Produtor", "Mix", "Master", "Compositor", "Arranjador", "Videomaker", "Fotógrafo"] as WizardProfType[]).map((tp) => (
                            <button
                              key={tp}
                              onClick={() => setWizardProfType(tp)}
                              className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all active:scale-95", wizardProfType === tp ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 hover:bg-primary/5 hover:border-primary/40")}
                            >
                              <span>{profTypeIcons[tp]}</span>
                              <span className="text-xs font-medium">{tp}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Instrument input inline (only for Instrumentista) */}
                      {wizardProfType === "Instrumentista" && (
                        <div className="space-y-1.5 animate-fade-in">
                          <Label>Instrumento *</Label>
                          <Input placeholder="ex: Guitarra, Baixo, Bateria…" value={instrumentFilter} onChange={(e) => setInstrumentFilter(e.target.value)} />
                        </div>
                      )}

                      {/* Contact source — hide toggle if no contacts exist */}
                      {!globalsLoading && filteredGlobals.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Origem do contato</p>
                          <div className="flex gap-1 rounded-lg bg-secondary/40 p-1">
                            {(["new", "existing"] as WizardSource[]).map((src) => {
                              const labels: Record<WizardSource, string> = { new: "Novo contato", existing: "Minha agenda" };
                              return (
                                <button key={src} onClick={() => setWizardSource(src)} className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all", wizardSource === src ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                                  {labels[src]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* New contact form (no specialty field — derived automatically) */}
                      {wizardSource === "new" && (
                        <div className="space-y-3 animate-fade-in">
                          <div className="space-y-1.5"><Label>Nome *</Label><Input placeholder="Nome completo" value={newContactForm.name} onChange={(e) => setNewContactForm((f) => ({ ...f, name: e.target.value }))} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" placeholder="email@exemplo.com" value={newContactForm.email} onChange={(e) => setNewContactForm((f) => ({ ...f, email: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Telefone</Label><Input placeholder="+55 11 9…" value={newContactForm.phone} onChange={(e) => setNewContactForm((f) => ({ ...f, phone: e.target.value }))} /></div>
                          </div>
                        </div>
                      )}

                      {/* Existing contact selector */}
                      {wizardSource === "existing" && (
                        <div className="space-y-2 animate-fade-in">
                          {globalsLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("misc.loading")}</div>
                          ) : (
                            <Select value={selectedExistingProfId} onValueChange={setSelectedExistingProfId}>
                              <SelectTrigger><SelectValue placeholder="Selecione um profissional…" /></SelectTrigger>
                              <SelectContent>
                                {filteredGlobals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}

                      {/* Access level — inline toggle with descriptions */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Nível de acesso</p>
                        <div className="flex gap-2">
                          {([
                            { value: "leitor", label: "Leitor", desc: "Apenas dados relevantes para sua função" },
                            { value: "admin_convidado", label: "Admin", desc: "Gerencia o projeto, mas não pode deletar" },
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setProposalForm((f) => ({ ...f, permissionsScope: opt.value }))}
                              className={cn("flex-1 rounded-lg border p-3 text-left transition-all", proposalForm.permissionsScope === opt.value ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/40")}
                            >
                              <span className="text-sm font-medium">{opt.label}</span>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Collapsible optional details */}
                      {(() => {
                        const optionalCount = [proposalForm.fee, proposalForm.deadline, proposalForm.scheduleNotes]
                          .filter((v) => v && String(v).trim() !== "" && String(v) !== "0").length;
                        return (
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
                                  <Input type="number" placeholder="0" value={proposalForm.fee} onChange={(e) => setProposalForm((f) => ({ ...f, fee: e.target.value }))} className="font-mono-nums" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Prazo de entrega</Label>
                                  <DatePickerField value={proposalForm.deadline} onChange={(v) => { setProposalForm((f) => ({ ...f, deadline: v })); setDeadlineWarningConfirmed(false); }} disablePast />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label>Notas / Observações</Label>
                                <Textarea placeholder="Dias disponíveis, horário de gravação…" value={proposalForm.scheduleNotes} onChange={(e) => setProposalForm((f) => ({ ...f, scheduleNotes: e.target.value }))} className="h-20 resize-none" />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })()}
                      {/* Deadline warning */}
                      {proposalHasDeadlineWarning && (
                        <div className="flex flex-col gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3 animate-fade-in">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                            <p className="text-xs text-warning">O prazo excede o cronograma estimado ({selectedProject?.estimatedMonths} meses).</p>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={deadlineWarningConfirmed} onCheckedChange={(v) => setDeadlineWarningConfirmed(!!v)} />
                            <span className="text-xs">Confirmar mesmo assim</span>
                          </label>
                        </div>
                      )}

                      {/* Submit */}
                      <Button onClick={handleSubmitProposal} disabled={!canContinueToProposal || wizardSaving || (proposalHasDeadlineWarning && !deadlineWarningConfirmed)} className="w-full">
                        {wizardSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {wizardSelectedEmail ? "Enviar proposta" : "Adicionar à equipe"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {showTeam && (
                <div className="space-y-2 animate-fade-in">
                  {teamForSelected.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{t("team.empty")}</p>
                  ) : (
                    <>
                      {teamForSelected.map((prof) => (
                        <div key={prof.id} className="rounded-lg bg-secondary/30 border border-border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="font-medium text-sm">{prof.name}</span>
                              <Badge variant="secondary" className="text-xs">{prof.role}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProfessional(selectedProject.id, prof.id)}><XIcon className="h-3 w-3" /></Button>
                          </div>
                          {prof.instrument && prof.instrument !== "—" && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Music className="h-3 w-3" />{prof.instrument}</p>
                          )}
                        </div>
                      ))}
                      <Link to={`/projects/${selectedProject.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 mt-1">
                          <Users className="h-3.5 w-3.5" />
                          Ver equipe completa e convites
                          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {(() => {
            const allActive = projects.filter((p) => !p.completed);
            const activeProjects = allActive.filter((p) => {
              if (stageFilter !== "all" && p.stage !== stageFilter) return false;
              if (statusFilter !== "all" && getProjectStatus(p).key !== statusFilter) return false;
              return true;
            });
            const showFilters = allActive.length > 3 || stageFilter !== "all" || statusFilter !== "all";

            // Próximo passo contextual por estágio
            const nextStepByStage: Record<string, { label: string; route: (id: string) => string; icon: React.ReactNode }> = {
              inicio: { label: "Convidar equipe", route: (id) => `/projects/${id}#team`, icon: <Users className="h-3.5 w-3.5" /> },
              gravacao: { label: "Agendar sessão", route: (id) => `/agenda?new=1&project=${id}`, icon: <Calendar className="h-3.5 w-3.5" /> },
              mix: { label: "Acompanhar mix", route: (id) => `/projects/${id}`, icon: <Sliders className="h-3.5 w-3.5" /> },
              master: { label: "Analisar master", route: (id) => `/projects/${id}#master`, icon: <Sparkles className="h-3.5 w-3.5" /> },
              upload: { label: "Preparar lançamento", route: (id) => `/projects/${id}#release`, icon: <Upload className="h-3.5 w-3.5" /> },
              lancado: { label: "Ver pós-lançamento", route: (id) => `/projects/${id}#release`, icon: <Rocket className="h-3.5 w-3.5" /> },
            };

            // Projeto mais avançado para o bloco "Continue"
            const stageOrder = ["inicio", "gravacao", "mix", "master", "upload", "lancado"];
            const mostAdvanced = [...allActive].sort((a, b) => stageOrder.indexOf(b.stage) - stageOrder.indexOf(a.stage))[0];

            return (
              <>
                {/* Filtros progressivos: chips horizontais */}
                {showFilters && (
                  <div className="-mx-1 overflow-x-auto pb-1">
                    <div className="flex gap-1.5 px-1 min-w-min">
                      {([
                        { value: "all", label: "Todos" },
                        { value: "no_prazo", label: "No prazo" },
                        { value: "quase", label: "Quase lá" },
                        { value: "risco", label: "Em risco" },
                        { value: "parado", label: "Parado" },
                      ] as const).map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setStatusFilter(f.value)}
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95",
                            statusFilter === f.value
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project list */}
                <div className="space-y-3">
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>{stageFilter !== "all" || statusFilter !== "all" ? "Nenhum projeto encontrado com esses filtros." : t("projects.empty")}</p>
                    </div>
                  ) : (
                    activeProjects.map((project) => {
                      const status = getProjectStatus(project);
                      const stageIdx = stageOrder.indexOf(project.stage);
                      const progressPct = Math.round(((stageIdx + 1) / stageOrder.length) * 100);
                      const next = nextStepByStage[project.stage];
                      return (
                        <Card
                          key={project.id}
                          role="button"
                          tabIndex={0}
                          className="glass-card cursor-pointer hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.99]"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          onKeyDown={(e) => { if (e.key === "Enter") navigate(`/projects/${project.id}`); }}
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Linha 1: título + menu kebab */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.artist}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 -mr-1 -mt-1 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label="Mais ações"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem asChild>
                                    <Link to={`/projects/${project.id}`}><ArrowRight className="h-4 w-4 mr-2" />Abrir projeto</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to={`/projects/${project.id}#chat`}><MessageSquare className="h-4 w-4 mr-2" />Conversar com a equipe</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(project); }}>
                                    <Pencil className="h-4 w-4 mr-2" />Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteDialog(project.id); }}>
                                    <Trash2 className="h-4 w-4 mr-2" />Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Linha 2: estágio + status */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <Badge variant="outline" className="text-[10px]">{t(`stage.${project.stage}`)}</Badge>
                                {project.projectType && project.projectType !== "single" && (
                                  <Badge variant="secondary" className="text-[10px]">{t(`projects.${project.projectType}`)}</Badge>
                                )}
                              </div>
                              <Badge variant="outline" className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                            </div>

                            {/* Linha 3: barra de progresso */}
                            <div className="space-y-1">
                              <Progress value={progressPct} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground font-mono-nums text-right">{progressPct}%</p>
                            </div>

                            {/* Linha 4: próximo passo contextual */}
                            {next && (
                              <Link
                                to={next.route(project.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary hover:bg-primary/10 transition-colors"
                              >
                                <span className="flex items-center gap-1.5 font-medium">
                                  {next.icon}
                                  Próximo: {next.label}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Bloco "Continue de onde parou" */}
                {activeProjects.length > 0 && mostAdvanced && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide px-1">
                      Continue em <span className="text-foreground font-medium normal-case tracking-normal">{mostAdvanced.name}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/agenda?new=1&project=${mostAdvanced.id}`}
                        className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]"
                      >
                        <Calendar className="h-4 w-4 text-primary mb-1.5" />
                        <p className="text-xs font-medium leading-tight">Agendar sessão</p>
                      </Link>
                      <Link
                        to={`/projects/${mostAdvanced.id}#master`}
                        className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]"
                      >
                        <Sparkles className="h-4 w-4 text-primary mb-1.5" />
                        <p className="text-xs font-medium leading-tight">Analisar master</p>
                      </Link>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Completed projects */}
          {projects.filter((p) => p.completed).length > 0 && (
            <Collapsible open={completedSectionOpen} onOpenChange={setCompletedSectionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Projetos concluídos ({projects.filter((p) => p.completed).length})</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", completedSectionOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {projects.filter((p) => p.completed).map((project) => (
                  <Card key={project.id} className="glass-card opacity-60 hover:opacity-90 transition-opacity cursor-pointer" onClick={() => setSelectedProject(project)}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{project.name}</span>
                        <p className="text-xs text-muted-foreground">{project.artist}</p>
                      </div>
                      <Trophy className="h-4 w-4 text-success" />
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>{t("projects.editProject")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="edit-name">{t("projects.projectName")}</Label><Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="edit-artist">{t("projects.artistProducer")}</Label><Input id="edit-artist" value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("projects.bpm")}</Label><Input type="number" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: e.target.value })} className="font-mono-nums" /></div>
              <div className="space-y-1.5"><Label>{t("projects.key")}</Label><Input value={editForm.key} onChange={(e) => setEditForm({ ...editForm, key: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("projects.currentStage")}</Label>
              <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v as Project["stage"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const).map((s) => <SelectItem key={s} value={s}>{t(`stage.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("projects.projectType")}</Label>
              <Select value={editForm.projectType} onValueChange={(v) => setEditForm({ ...editForm, projectType: v as ProjectType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t("projects.single")}</SelectItem>
                  <SelectItem value="ep">{t("projects.ep")}</SelectItem>
                  <SelectItem value="album">{t("projects.album")}</SelectItem>
                  <SelectItem value="beat">{t("projects.beat")}</SelectItem>
                  <SelectItem value="trilha_guia">{t("projects.trilha_guia")}</SelectItem>
                  <SelectItem value="feat">{t("projects.feat")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editForm.projectType === "ep" || editForm.projectType === "album") && (
              <div className="space-y-1.5"><Label>{t("projects.trackCount")}</Label><Input type="number" min="1" value={editForm.trackCount} onChange={(e) => setEditForm({ ...editForm, trackCount: e.target.value })} className="font-mono-nums" /></div>
            )}
            <div className="space-y-1.5">
              <Label>Gênero principal</Label>
              <Select value={editForm.genre} onValueChange={(v) => setEditForm({ ...editForm, genre: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o gênero" /></SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Seus seguidores hoje</Label>
              <Select value={editForm.audienceSize} onValueChange={(v) => setEditForm({ ...editForm, audienceSize: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_SIZE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data estimada de lançamento</Label>
              <DatePickerField
                value={editForm.uploadDate}
                onChange={(val) => setEditForm({ ...editForm, uploadDate: val })}
                placeholder="Selecionar data de lançamento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditProject} disabled={!editForm.name} className="active:scale-95 transition-transform">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleteTargetProject?.name}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Registrar pagamento</DialogTitle>
            <DialogDescription>{pendingPaymentData?.profName} · R$ {pendingPaymentData?.fee.toLocaleString()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={paymentMode === "single"} onChange={() => setPaymentMode("single")} className="accent-primary" />
                  <span className="text-sm">À vista</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={paymentMode === "installments"} onChange={() => setPaymentMode("installments")} className="accent-primary" />
                  <span className="text-sm">Parcelado</span>
                </label>
              </div>
            </div>
            {paymentMode === "installments" && (
              <div className="space-y-1.5">
                <Label>Número de parcelas</Label>
                <Input type="number" min="2" max="24" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="font-mono-nums w-24" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Pular</Button>
            <Button onClick={handlePaymentConfirm}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Form */}
      {selectedProject && (
        <TransactionForm
          open={txFormOpen}
          onOpenChange={setTxFormOpen}
          lockedProjectId={selectedProject.id}
        />
      )}

      {/* Master Analyzer Modal */}
      {selectedProject && (
        <MasterAnalyzerModal
          open={masterAnalyzerModalOpen}
          onOpenChange={setMasterAnalyzerModalOpen}
          project={selectedProject}
          onConfirmUpload={handleConfirmUpload}
          onCancelWithTask={handleCancelWithTask}
        />
      )}

      <RatePartnersModal
        open={ratePartnersOpen}
        onClose={() => setRatePartnersOpen(false)}
        projectId={completedProjectId}
        projectName={completedProjectName}
        members={completedProjectMembers}
      />
    </div>
  );
}
