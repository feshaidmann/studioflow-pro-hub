import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Music, Mic2, ArrowRight, MapPin, Check, Layers,
  Lightbulb, Disc3, Radio, Rocket,
  FileMusic, Album, ListMusic,
  FolderKanban, Users, Clock, DollarSign, Upload,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── option maps ────────────────────────────────────────────── */

const MOMENTS = [
  { value: "idea", label: "Tenho uma ideia", icon: Lightbulb, stage: "inicio", impact: "Seu projeto começa em organização criativa." },
  { value: "producing", label: "Já estou produzindo", icon: Disc3, stage: "gravacao", impact: "Vamos priorizar gravação, arranjo e entregas." },
  { value: "ready", label: "Tenho música pronta", icon: Radio, stage: "master", impact: "O projeto já nasce em masterização." },
  { value: "launching", label: "Quero lançar", icon: Rocket, stage: "upload", impact: "Seu plano começa focado em distribuição." },
] as const;

const PROJECT_TYPES = [
  { value: "single", label: "Single", icon: FileMusic, desc: "1 faixa" },
  { value: "ep", label: "EP", icon: ListMusic, desc: "2–6 faixas" },
  { value: "album", label: "Álbum", icon: Album, desc: "7+ faixas" },
] as const;

const MODES = [
  { value: "basic" as const, label: "Simples", emoji: "🎯", desc: "Interface limpa, foco em projetos e tarefas." },
  { value: "advanced" as const, label: "Completo", emoji: "⚡", desc: "Tudo habilitado: tracks, financeiro detalhado, dados." },
];

const PAINS = [
  { value: "organization", label: "Organização", icon: FolderKanban, impact: "Dashboard com checklist e progresso em primeiro plano." },
  { value: "team", label: "Equipe", icon: Users, impact: "Vamos destacar convites, parceiros e responsáveis." },
  { value: "deadlines", label: "Prazos", icon: Clock, impact: "Alertas e próximas datas ganham prioridade." },
  { value: "finance", label: "Financeiro", icon: DollarSign, impact: "Receitas, custos e margem sobem no dashboard." },
  { value: "launch", label: "Lançamento", icon: Upload, impact: "Checklist de lançamento e análise técnica vêm primeiro." },
] as const;

const PROJECT_NAME_MAP: Record<string, string> = {
  single: "Meu Single",
  ep: "Meu EP",
  album: "Meu Álbum",
};

const TRACK_TEMPLATES: Record<string, string[]> = {
  single: ["Voz Principal", "Instrumental / Beat", "Referência", "Master Bus"],
  ep: ["Faixa 1", "Faixa 2", "Faixa 3", "Master Bus"],
  album: ["Pré-produção", "Faixas principais", "Interlúdios / versões", "Master Bus"],
};

const PAIN_TASKS: Record<string, { description: string; task_area: string; severity?: string }[]> = {
  organization: [
    { description: "Definir a próxima etapa do projeto", task_area: "geral", severity: "high" },
    { description: "Organizar referências e arquivos principais", task_area: "geral" },
    { description: "Listar pendências para avançar esta semana", task_area: "geral" },
  ],
  team: [
    { description: "Listar quem falta para finalizar o projeto", task_area: "equipe", severity: "high" },
    { description: "Convidar um parceiro para o projeto", task_area: "equipe" },
    { description: "Definir responsável pela próxima entrega", task_area: "equipe" },
  ],
  deadlines: [
    { description: "Definir o próximo prazo realista do projeto", task_area: "geral", severity: "high" },
    { description: "Marcar a próxima entrega crítica no checklist", task_area: "geral" },
    { description: "Separar pendências que podem atrasar o lançamento", task_area: "geral" },
  ],
  finance: [
    { description: "Definir orçamento estimado do projeto", task_area: "financeiro", severity: "high" },
    { description: "Registrar investimento inicial", task_area: "financeiro" },
    { description: "Anotar previsão de receita ou cachê", task_area: "financeiro" },
  ],
  launch: [
    { description: "Definir data prevista de lançamento", task_area: "lancamento", severity: "high" },
    { description: "Conferir LUFS/True Peak antes do upload", task_area: "lancamento" },
    { description: "Preparar capa e texto curto de divulgação", task_area: "lancamento" },
  ],
};

const MOMENT_TASKS: Record<string, { description: string; task_area: string; severity?: string }[]> = {
  idea: [{ description: "Transformar a ideia em estrutura de música", task_area: "gravacao", severity: "high" }],
  producing: [{ description: "Definir o que falta gravar ou editar", task_area: "gravacao", severity: "high" }],
  ready: [{ description: "Rodar uma análise técnica da faixa pronta", task_area: "lancamento", severity: "high" }],
  launching: [{ description: "Revisar checklist de distribuição antes do envio", task_area: "lancamento", severity: "high" }],
};

/* ── component ──────────────────────────────────────────────── */

export default function Onboarding() {
  const { updateProfile, loading: profileLoading, profile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const { addProject } = useProjects();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step data
  const [moment, setMoment] = useState("");
  const [projectType, setProjectType] = useState("");
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");
  const [pain, setPain] = useState("");
  const [artistName, setArtistName] = useState("");
  const [city, setCity] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email && !artistName) setArtistName(user.email.split("@")[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (step === 5) setTimeout(() => nameRef.current?.focus(), 300);
  }, [step]);

  /* ── guards ─────────────────────────────────────────────── */
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;

  /* ── navigation ─────────────────────────────────────────── */
  const canAdvance: Record<number, boolean> = {
    1: !!moment,
    2: !!projectType,
    3: true,
    4: !!pain,
    5: !!artistName.trim(),
    6: true,
  };

  const handleNext = () => { if (canAdvance[step]) setStep((s) => s + 1); };
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  /* ── confirm ────────────────────────────────────────────── */
  const handleConfirm = async () => {
    setSubmitting(true);
    const name = artistName.trim() || user.email?.split("@")[0] || "Artista";
    const selectedMoment = MOMENTS.find((m) => m.value === moment);
    const stage = selectedMoment?.stage || "inicio";

    // Create project
    let projectId: string | null = null;
    try {
      const project = await addProject({
        name: PROJECT_NAME_MAP[projectType] || "Meu Projeto",
        artist: name,
        bpm: 120,
        key: "C",
        stage,
        projectType: projectType as "single" | "ep" | "album",
        templateTracks: TRACK_TEMPLATES[projectType] ?? TRACK_TEMPLATES.single,
      });
      projectId = project?.id ?? null;
    } catch {
      toast.error("Erro ao criar projeto, mas seu perfil foi salvo.");
    }

    if (projectId) {
      const starterTasks = [...(MOMENT_TASKS[moment] ?? []), ...(PAIN_TASKS[pain] ?? [])].slice(0, 4);
      await supabase.from("tasks").upsert(
        starterTasks.map((task, index) => ({
          user_id: user.id,
          project_id: projectId,
          description: task.description,
          auto_generated: true,
          source: "onboarding",
          source_key: `onboarding:${projectId}:${moment}:${pain}:${index}`,
          source_module: "onboarding",
          task_area: task.task_area,
          severity: task.severity ?? "medium",
        })),
        { onConflict: "user_id,source_key", ignoreDuplicates: true }
      );
      localStorage.setItem("sfp_recent_onboarding_project", projectId);
    }

    // Update profile
    await updateProfile({
      display_name: name,
      city: city.trim(),
      user_type: "artist",
      track_view_mode: viewMode,
      current_moment: moment,
      main_pain: pain,
      onboarding_version: 2,
      onboarding_completed: true,
    });

    navigate(projectId ? `/projects/${projectId}` : "/dashboard", { replace: true });
  };

  /* ── step labels ────────────────────────────────────────── */
  const TOTAL_STEPS = 6;
  const stepLabels = ["Momento", "Tipo", "Modo", "Desafio", "Identidade", "Pronto"];
  const selectedMoment = MOMENTS.find((m) => m.value === moment);
  const selectedPain = PAINS.find((p) => p.value === pain);
  const selectedProjectType = PROJECT_TYPES.find((t) => t.value === projectType);
  const planItems = [
    selectedMoment?.impact,
    selectedPain?.impact,
    projectType ? `${TRACK_TEMPLATES[projectType]?.length ?? 4} trilhas iniciais para ${selectedProjectType?.label}.` : null,
    pain ? `${Math.min(4, ((MOMENT_TASKS[moment] ?? []).length + (PAIN_TASKS[pain] ?? []).length))} tarefas iniciais já contextualizadas.` : null,
  ].filter(Boolean) as string[];

  /* ── render helpers ─────────────────────────────────────── */
  const OptionCard = ({
    selected,
    onClick,
    icon: Icon,
    label,
    desc,
    emoji,
  }: {
    selected: boolean;
    onClick: () => void;
    icon?: React.ElementType;
    label: string;
    desc?: string;
    emoji?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all",
        selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-card/80"
      )}
    >
      <div className="flex items-center gap-3">
        {emoji ? (
          <span className="text-2xl">{emoji}</span>
        ) : Icon ? (
          <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
        ) : null}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>{label}</p>
          {desc && <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>}
        </div>
        {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">StudioFlow</h1>
          <p className="text-muted-foreground text-sm">Vamos montar seu plano inicial</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => {
            const idx = i + 1;
            const isActive = step === idx;
            const isDone = step > idx;
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-1.5 w-full rounded-full transition-all duration-300",
                    isDone ? "bg-primary" : isActive ? "bg-primary/60" : "bg-muted"
                  )}
                />
                <span className={cn("text-[8px] font-medium leading-tight", isActive ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 space-y-5 border border-border">

          {/* STEP 1 — Momento */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Onde você está agora?</p>
              <div className="space-y-2.5">
                {MOMENTS.map((m) => (
                  <OptionCard key={m.value} selected={moment === m.value} onClick={() => setMoment(m.value)} icon={m.icon} label={m.label} desc={m.impact} />
                ))}
              </div>
              <Button onClick={handleNext} disabled={!canAdvance[1]} className="w-full gap-2" size="lg">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 — Tipo de projeto */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Que tipo de projeto?</p>
              <div className="space-y-2.5">
                {PROJECT_TYPES.map((t) => (
                  <OptionCard key={t.value} selected={projectType === t.value} onClick={() => setProjectType(t.value)} icon={t.icon} label={t.label} desc={t.desc} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1" size="lg">Voltar</Button>
                <Button onClick={handleNext} disabled={!canAdvance[2]} className="flex-1 gap-2" size="lg">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Modo */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Como quer usar o StudioFlow?</p>
              </div>
              <p className="text-xs text-muted-foreground">Você pode mudar a qualquer momento em Configurações.</p>
              <div className="space-y-2.5">
                {MODES.map((m) => (
                  <OptionCard key={m.value} selected={viewMode === m.value} onClick={() => setViewMode(m.value)} emoji={m.emoji} label={m.label} desc={m.desc} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1" size="lg">Voltar</Button>
                <Button onClick={handleNext} className="flex-1 gap-2" size="lg">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 — Maior dor */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Sua maior dificuldade hoje?</p>
              <p className="text-xs text-muted-foreground">Isso nos ajuda a priorizar o que mostrar pra você.</p>
              <div className="space-y-2.5">
                {PAINS.map((p) => (
                  <OptionCard key={p.value} selected={pain === p.value} onClick={() => setPain(p.value)} icon={p.icon} label={p.label} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1" size="lg">Voltar</Button>
                <Button onClick={handleNext} disabled={!canAdvance[4]} className="flex-1 neon-glow gap-2" size="lg">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5 — Identidade */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Como você quer ser chamado?</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="artistName" className="text-xs text-muted-foreground">Nome artístico ou apelido *</Label>
                <Input
                  ref={nameRef}
                  id="artistName"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance[5]) handleNext(); }}
                  placeholder="Ex: DJ Marquinhos, Ana Silva..."
                  className="text-base"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Cidade <span className="text-muted-foreground/50">(opcional)</span>
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance[5]) handleNext(); }}
                  placeholder="Ex: São Paulo, Rio de Janeiro..."
                  maxLength={60}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1" size="lg">Voltar</Button>
                <Button onClick={handleNext} disabled={!canAdvance[5]} className="flex-1 neon-glow gap-2" size="lg">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6 — Confirmação */}
          {step === 6 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-foreground">Tudo pronto!</p>

              <div className="rounded-xl border border-border p-4 space-y-2.5">
                <SummaryRow label="Momento" value={MOMENTS.find((m) => m.value === moment)?.label || "—"} />
                <SummaryRow label="Projeto" value={`${PROJECT_TYPES.find((t) => t.value === projectType)?.label || "—"} — "${PROJECT_NAME_MAP[projectType] || "Meu Projeto"}"`} />
                <SummaryRow label="Modo" value={viewMode === "basic" ? "🎯 Simples" : "⚡ Completo"} />
                <SummaryRow label="Foco" value={PAINS.find((p) => p.value === pain)?.label || "—"} />
                <SummaryRow label="Nome" value={artistName.trim() || "—"} />
                {city.trim() && <SummaryRow label="Cidade" value={city.trim()} />}
              </div>

              <p className="text-[11px] text-muted-foreground/70 text-center">
                Vamos criar seu primeiro projeto e te levar direto pra ele.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1" size="lg">Voltar</Button>
                <Button onClick={handleConfirm} disabled={submitting} className="flex-1 neon-glow gap-2" size="lg">
                  {submitting ? "Criando..." : <>Começar <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Passo {step} de {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}

/* ── small helpers ──────────────────────────────────────────── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
