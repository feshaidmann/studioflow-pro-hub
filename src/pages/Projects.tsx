import { useState, useEffect } from "react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogClose, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, DollarSign, MessageSquare, ArrowRight, Disc3, Users, ChevronDown } from "lucide-react";
import { ImportSpotifyCatalogDialog } from "@/components/spotify-import/ImportSpotifyCatalogDialog";
import { SpotifyCatalogSection } from "@/components/spotify-import/SpotifyCatalogSection";
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
import TransactionForm from "@/components/finance/TransactionForm";
import { useTasks } from "@/hooks/useTasks";
import MasterAnalyzerModal from "@/components/MasterAnalyzerModal";
import RatePartnersModal from "@/components/RatePartnersModal";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { ProjectDetailCard } from "@/components/projects/ProjectDetailCard";
import { ProjectListView } from "@/components/projects/ProjectListView";
import { CompletedProjectsSection } from "@/components/projects/CompletedProjectsSection";

type ProjectTemplate = "none" | "single_basico" | "banda_completa" | "producao_eletronica" | "podcast";

const PROJECT_TEMPLATES: Record<ProjectTemplate, { label: string; description: string; tracks: string[] }> = {
  none: { label: "Em branco", description: "Sem tracks pré-definidas", tracks: [] },
  single_basico: { label: "Single Básico", description: "Voz, Violão, Beat, Master Bus", tracks: ["Voz Principal", "Violão", "Beat", "Master Bus"] },
  banda_completa: { label: "Banda Completa", description: "Voz, Guitarra, Baixo, Bateria, Teclado, Master Bus", tracks: ["Voz Principal", "Backing Vocal", "Guitarra", "Baixo", "Bateria", "Teclado", "Master Bus"] },
  producao_eletronica: { label: "Produção Eletrônica", description: "Beat, Synth, Bass, FX, Vocal, Master Bus", tracks: ["Beat", "Synth Lead", "Synth Pad", "Bass", "FX", "Vocal", "Master Bus"] },
  podcast: { label: "Podcast / Voz", description: "Host, Convidado, BG Music, Master Bus", tracks: ["Host", "Convidado", "BG Music", "Master Bus"] },
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
    getProjectFinancials,
    addProfessional, removeProfessional, addProfessionalToGlobal,
    addTransaction,
  } = useProjects();
  const { professionals: globalProfessionals, loading: globalsLoading } = useProfessionals();
  const { addNotification } = useNotifications();
  const { addTask } = useTasks();

  /* ── Core state ── */
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [spotifyImportOpen, setSpotifyImportOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", artist: "", bpm: "120", key: "C",
    stage: "inicio" as Project["stage"], projectType: "single" as ProjectType,
    trackCount: "", uploadDate: "", template: "none" as ProjectTemplate,
    genre: "", audienceSize: "",
  });

  /* ── Guest projects ── */
  const [guestProjects, setGuestProjects] = useState<Array<{
    id: string; name: string; artist: string; stage: string;
    completed: boolean; project_type: string; role: string;
  }>>([]);
  useEffect(() => {
    supabase.rpc("get_member_projects").then(({ data }) => { if (data) setGuestProjects(data); });
  }, []);

  /* ── URL param handling ── */
  useEffect(() => {
    const idParam = searchParams.get("id");
    const newParam = searchParams.get("new");
    if (newParam === "1") {
      setForm((prev) => ({ ...prev, artist: prev.artist || displayName, genre: prev.genre || profile?.primary_genre || "" }));
      setShowAdvanced(false);
      setDialogOpen(true);
      setSearchParams((prev) => { prev.delete("new"); return prev; }, { replace: true });
    }
    if (!idParam || projects.length === 0) return;
    const found = projects.find((p) => p.id === idParam);
    if (found) setSelectedProject(found);
  }, [searchParams, projects]);

  /* ── Edit / Delete state ── */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "", name: "", artist: "", bpm: "120", key: "C",
    stage: "inicio" as Project["stage"], projectType: "single" as ProjectType,
    trackCount: "", uploadDate: "", genre: "", audienceSize: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* ── Master / Transaction modals ── */
  const [masterAnalyzerModalOpen, setMasterAnalyzerModalOpen] = useState(false);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);

  /* ── Payment modal ── */
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    projectId: string; profName: string; profSpecialty: string; fee: number;
  } | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("single");
  const [installmentCount, setInstallmentCount] = useState("2");

  /* ── Rate partners ── */
  const [ratePartnersOpen, setRatePartnersOpen] = useState(false);
  const [completedProjectMembers, setCompletedProjectMembers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [completedProjectId, setCompletedProjectId] = useState("");
  const [completedProjectName, setCompletedProjectName] = useState("");

  /* ── Helpers ── */
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

  const triggerPaymentModal = (projectId: string, profName: string, profSpecialty: string, fee: number) => {
    setPendingPaymentData({ projectId, profName, profSpecialty, fee });
    setPaymentMode("single");
    setInstallmentCount("2");
    setPaymentModalOpen(true);
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

  const handlePaymentConfirm = async () => {
    if (!pendingPaymentData) return;
    const { projectId, profName, profSpecialty, fee } = pendingPaymentData;
    await createFeeTransactions(projectId, profName, profSpecialty, fee, paymentMode, Number(installmentCount));
    setPaymentModalOpen(false);
    setPendingPaymentData(null);
  };

  const handleLancadoCompletion = async (projectId: string, projectName: string) => {
    await updateProject(projectId, { completed: true, stage: "lancado" });
    setSelectedProject((prev) => prev ? { ...prev, completed: true, stage: "lancado" } : null);
    addNotification({ title: "Projeto lançado!", message: `${projectName} foi lançado com sucesso`, link: "/projects", type: "stage" });
    toast.success("Projeto lançado e concluído!");
    const { data: members } = await supabase.from("project_members").select("id, name, email, role").eq("project_id", projectId);
    setCompletedProjectMembers((members ?? []) as { id: string; name: string; email: string; role: string }[]);
    setCompletedProjectId(projectId);
    setCompletedProjectName(projectName);
    setRatePartnersOpen(true);
  };

  const handleConfirmUpload = async () => {
    setConfirmUploadOpen(false);
    setMasterAnalyzerModalOpen(false);
    toast.success("Master analisado! Avance o projeto para 'Lançado' para concluí-lo.");
  };

  const handleCancelWithTask = async () => {
    if (!selectedProject) return;
    await addTask({ description: `Verificar master — ${selectedProject.name}`, projectId: selectedProject.id, source: "master_check", autoGenerated: false });
    setMasterAnalyzerModalOpen(false);
    toast.success("Tarefa adicionada: Verificar master do projeto");
  };

  const handleAddProject = async () => {
    if (!form.genre) { toast.error("Selecione o gênero principal"); return; }
    if ((form.projectType === "ep" || form.projectType === "album") && (!form.trackCount || Number(form.trackCount) < 1)) {
      toast.error(t("projects.trackCount") + " é obrigatório para EP/Álbum"); return;
    }
    let uploadDateStr = "";
    if (form.uploadDate) {
      const parts = form.uploadDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (parts) uploadDateStr = `${parts[3]}-${parts[2]}-${parts[1]}`;
    }
    const needsTrackCount = form.projectType === "ep" || form.projectType === "album";
    const templateTracks = form.template !== "none" ? PROJECT_TEMPLATES[form.template].tracks : null;
    try {
      const newProj = await addProject({
        name: form.name, artist: form.artist, bpm: Number(form.bpm), key: form.key,
        stage: form.stage, projectType: form.projectType,
        trackCount: needsTrackCount ? (form.trackCount ? Number(form.trackCount) : null) : null,
        totalContractValue: null, amountPaid: null, estimatedMonths: null,
        uploadDate: uploadDateStr, templateTracks: templateTracks,
        genre: form.genre || null, audienceSizeAtStart: form.audienceSize || null,
        artistState: (profile as any)?.state ?? null,
      });
      if (!newProj) { toast.error("Erro ao criar projeto. Verifique sua conexão e tente novamente."); return; }
      if (projects.length === 0) {
        localStorage.setItem("sfp_recent_onboarding_project", newProj.id);
        window.dispatchEvent(new Event("sfp:recent-onboarding-project-changed"));
      }
      setForm({ name: "", artist: "", bpm: "120", key: "C", stage: "inicio", projectType: "single", trackCount: "", uploadDate: "", template: "none", genre: "", audienceSize: "" });
      setDialogOpen(false);
      setSelectedProject(newProj);
      addNotification({ title: "Novo projeto criado", message: `${newProj.name} foi adicionado aos seus projetos`, link: "/projects", type: "stage" });
      toast.success(`Projeto "${newProj.name}" criado!`);
    } catch {
      toast.error("Erro ao criar projeto. Tente novamente.");
    }
  };

  const openEditDialog = (project: Project) => {
    let uploadDateDisplay = "";
    if (project.uploadDate) {
      const parts = project.uploadDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (parts) uploadDateDisplay = `${parts[3]}/${parts[2]}/${parts[1]}`;
    }
    setEditForm({
      id: project.id, name: project.name, artist: project.artist,
      bpm: String(project.bpm), key: project.key, stage: project.stage,
      projectType: project.projectType || "single",
      trackCount: project.trackCount ? String(project.trackCount) : "",
      uploadDate: uploadDateDisplay,
      genre: (project as any).genre ?? "", audienceSize: (project as any).audienceSizeAtStart ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleEditProject = async () => {
    if ((editForm.projectType === "ep" || editForm.projectType === "album") && (!editForm.trackCount || Number(editForm.trackCount) < 1)) {
      toast.error(t("projects.trackCount") + " é obrigatório para EP/Álbum"); return;
    }
    let uploadDateStr = "";
    if (editForm.uploadDate) {
      const parts = editForm.uploadDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (parts) uploadDateStr = `${parts[3]}-${parts[2]}-${parts[1]}`;
    }
    const needsTrackCount = editForm.projectType === "ep" || editForm.projectType === "album";
    const isLancado = editForm.stage === "lancado";
    const wasAlreadyCompleted = projects.find((p) => p.id === editForm.id)?.completed ?? false;
    const updates: Partial<Project> = {
      name: editForm.name, artist: editForm.artist, bpm: Number(editForm.bpm), key: editForm.key,
      stage: editForm.stage, projectType: editForm.projectType,
      trackCount: needsTrackCount ? (editForm.trackCount ? Number(editForm.trackCount) : null) : null,
      uploadDate: uploadDateStr, genre: editForm.genre || null, audienceSizeAtStart: editForm.audienceSize || null,
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
      <MobileStickyHeader
        title={t("projects.title")}
        subtitle={`${activosCount} ${activosCount === 1 ? "ativo" : "ativos"}`}
        cta={
          <Button
            size="sm" className="h-9 active:scale-95 transition-transform"
            onClick={() => { setForm((prev) => ({ ...prev, artist: prev.artist || displayName, genre: prev.genre || profile?.primary_genre || "" })); setShowAdvanced(false); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        }
      />

      {/* Desktop header */}
      <div className="hidden md:flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{t("projects.title")}</h1>
          {(() => {
            const activos = projects.filter((p) => !p.completed);
            const quase = activos.filter((p) => getProjectStatus(p).key === "quase").length;
            const concluidos = projects.length - activos.length;
            const parts: string[] = [`${activos.length} ${activos.length === 1 ? "ativo" : "ativos"}`];
            if (quase > 0) parts.push(`${quase} quase pronto${quase > 1 ? "s" : ""}`);
            if (concluidos > 0) parts.push(`${concluidos} concluído${concluidos > 1 ? "s" : ""}`);
            return <p className="text-xs text-muted-foreground mt-1">{parts.join(" · ")}</p>;
          })()}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" className="active:scale-95 transition-transform" onClick={() => setSpotifyImportOpen(true)}>
            <Disc3 className="h-4 w-4 mr-1" /> Importar do Spotify
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (open) {
              setForm((prev) => ({ ...prev, artist: prev.artist || displayName, genre: prev.genre || profile?.primary_genre || "" }));
              setShowAdvanced(false);
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="active:scale-95 transition-transform"><Plus className="h-4 w-4 mr-1" /> {t("projects.addProject")}</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border">
              <DialogHeader>
                <DialogTitle>{t("projects.newProject")}</DialogTitle>
                <DialogDescription>{t("projects.newProjectDesc")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Essential fields */}
                <div className="space-y-1.5">
                  <Label htmlFor="proj-name">{t("projects.projectName")}</Label>
                  <Input id="proj-name" placeholder={t("projects.projectNamePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="space-y-1.5">
                    <Label>Gênero *</Label>
                    <Select value={form.genre} onValueChange={(v) => setForm({ ...form, genre: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {(form.projectType === "ep" || form.projectType === "album") && (
                  <div className="space-y-1.5">
                    <Label>{t("projects.trackCount")}</Label>
                    <Input type="number" min="1" placeholder="8" value={form.trackCount} onChange={(e) => setForm({ ...form, trackCount: e.target.value })} className="font-mono-nums" />
                  </div>
                )}

                {/* Advanced toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-0.5"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
                  {showAdvanced ? "Menos opções" : "Mais opções"}
                </button>

                {/* Advanced fields */}
                {showAdvanced && (
                  <div className="space-y-4 pt-1 border-t border-border/40">
                    <div className="space-y-1.5">
                      <Label htmlFor="proj-artist">Artista</Label>
                      <Input id="proj-artist" placeholder={t("projects.artistPlaceholder")} value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>{t("projects.bpm")}</Label><Input type="number" min="40" max="250" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })} className="font-mono-nums" /></div>
                      <div className="space-y-1.5"><Label>{t("projects.key")}</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></div>
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
                      <Label>Seguidores atuais</Label>
                      <Select value={form.audienceSize} onValueChange={(v) => setForm({ ...form, audienceSize: v })}>
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>{AUDIENCE_SIZE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">Para comparar seu crescimento ao longo do tempo.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data estimada de lançamento</Label>
                      <DatePickerField value={form.uploadDate} onChange={(val) => setForm({ ...form, uploadDate: val })} placeholder="Selecionar data" />
                    </div>
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
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleAddProject} disabled={!form.name || !form.genre} className="active:scale-95 transition-transform">{t("projects.create")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ImportSpotifyCatalogDialog open={spotifyImportOpen} onOpenChange={setSpotifyImportOpen} />
      <SpotifyCatalogSection />

      {/* Guest projects */}
      {guestProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Projetos em que você participa</h2>
            <Badge variant="secondary" className="text-xs">{guestProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {guestProjects.map((gp) => (
              <div key={gp.id} className="glass-card rounded-lg border border-border/60 hover:border-primary/40 transition-colors p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{gp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{gp.artist}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{gp.completed ? "Concluído" : t(`stage.${gp.stage}`)}</Badge>
                </div>
                {gp.role && (
                  <p className="text-xs text-muted-foreground">Sua função: <span className="text-foreground font-medium">{gp.role}</span></p>
                )}
                <Link to={`/projects/${gp.id}`}>
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs mt-1 border-primary/30 hover:border-primary/60 hover:bg-primary/10">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Ver projeto e chat
                    <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: detail view OR list + completed */}
      {selectedProject ? (
        <ProjectDetailCard
          project={selectedProject}
          teamMembers={teamForSelected}
          masterResult={masterForSelected}
          updateProject={updateProject}
          removeProfessional={removeProfessional}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          onClose={() => setSelectedProject(null)}
          onNewTransaction={() => setTxFormOpen(true)}
          onMasterAnalyze={() => setMasterAnalyzerModalOpen(true)}
          onLancadoCompleted={handleLancadoCompletion}
          setProject={setSelectedProject}
          globalProfessionals={globalProfessionals as Array<Professional & { email?: string; phone?: string }>}
          globalsLoading={globalsLoading}
          addProfessional={addProfessional}
          addProfessionalToGlobal={addProfessionalToGlobal}
          addNotification={addNotification}
          onFeeRequired={triggerPaymentModal}
          t={t}
        />
      ) : (
        <>
          <ProjectListView
            projects={projects}
            getProjectStatus={getProjectStatus}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onCreateNew={() => setDialogOpen(true)}
            t={t}
          />
          <CompletedProjectsSection projects={projects} />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>{t("projects.editProject")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t("projects.projectName")}</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("projects.artistProducer")}</Label><Input value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("projects.bpm")}</Label><Input type="number" min="40" max="250" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: e.target.value })} className="font-mono-nums" /></div>
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
                <SelectContent>{GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Seus seguidores hoje</Label>
              <Select value={editForm.audienceSize} onValueChange={(v) => setEditForm({ ...editForm, audienceSize: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{AUDIENCE_SIZE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data estimada de lançamento</Label>
              <DatePickerField value={editForm.uploadDate} onChange={(val) => setEditForm({ ...editForm, uploadDate: val })} placeholder="Selecionar data de lançamento" />
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

      {selectedProject && (
        <TransactionForm open={txFormOpen} onOpenChange={setTxFormOpen} lockedProjectId={selectedProject.id} />
      )}

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
