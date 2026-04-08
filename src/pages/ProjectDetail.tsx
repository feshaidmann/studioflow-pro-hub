import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useProjectChat } from "@/hooks/useProjectChat";
import {
  ChevronLeft, Music2, Pencil, MessageSquare, Send, Lock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STAGE_STEPS = ["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const;

const STAGE_LABEL: Record<string, string> = {
  inicio: "Projeto Iniciado",
  gravacao: "Gravação",
  mix: "Mix",
  master: "Master",
  upload: "Upload",
  lancado: "Lançado",
  rough: "Rascunho",
};

const TYPE_LABEL: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
  beat: "Beat / Base",
  trilha_guia: "Trilha Guia",
  feat: "Feat",
};

// Stage → progress % map (used for guests who can't call getMixPercent)
const STAGE_PERCENT: Record<string, number> = {
  rough: 0,
  inicio: 5,
  gravacao: 25,
  mix: 55,
  master: 75,
  upload: 90,
  lancado: 100,
};

// ── Chat component ──────────────────────────────────────────────
function ProjectChat({ projectId }: { projectId: string }) {
  const { messages, loading, sending, sendMessage, currentUserId } = useProjectChat(projectId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  function relTime(d: string) {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); } catch { return ""; }
  }

  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  if (!currentUserId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Faça login para acessar o chat do projeto.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[420px] lg:h-[580px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando mensagens…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Comece a conversa!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isMe ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {initials(msg.display_name)}
                </div>
                <div className={cn("max-w-[72%]", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                  {!isMe && (
                    <span className="text-[10px] text-muted-foreground px-1">{msg.display_name}</span>
                  )}
                  <div className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-snug",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 px-1">{relTime(msg.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Digite uma mensagem…"
          className="flex-1 h-9 text-sm"
          disabled={sending}
        />
        <Button size="sm" className="h-9 px-3 neon-glow" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Minimal project shape shared between owner and guest views ──
interface ProjectView {
  id: string;
  name: string;
  artist: string;
  stage: string;
  completed: boolean;
  projectType: string;
}

// ── Main Page ────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { projects, getMixPercent } = useProjects();

  // Owner-scoped lookup (from context — includes financial data)
  const ownerProject = projects.find((p) => p.id === id);

  // Guest fallback state
  const [guestProject, setGuestProject] = useState<ProjectView | null>(null);
  const [guestLoading, setGuestLoading] = useState(!ownerProject);
  const [isOwner, setIsOwner] = useState(!!ownerProject);

  useEffect(() => {
    // If found as owner, no guest lookup needed
    if (ownerProject) {
      setIsOwner(true);
      setGuestLoading(false);
      return;
    }
    if (!id) { setGuestLoading(false); return; }

    setGuestLoading(true);
    supabase
      .rpc("get_project_for_member", { p_project_id: id })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const row = data[0];
          setGuestProject({
            id: row.id,
            name: row.name,
            artist: row.artist,
            stage: row.stage,
            completed: row.completed,
            projectType: row.project_type,
          });
          setIsOwner(false);
        }
        setGuestLoading(false);
      });
  }, [id, ownerProject]);

  // Unified project view (owner wins; guest fallback)
  const project: ProjectView | null = ownerProject
    ? {
        id: ownerProject.id,
        name: ownerProject.name,
        artist: ownerProject.artist,
        stage: ownerProject.stage,
        completed: ownerProject.completed,
        projectType: ownerProject.projectType,
      }
    : guestProject;

  // Progress: owner gets precise mix %, guests get stage-based estimate
  const progress = isOwner && ownerProject
    ? getMixPercent(ownerProject.id)
    : STAGE_PERCENT[project?.stage ?? "rough"] ?? 0;

  if (guestLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground text-sm">Carregando projeto…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <Music2 className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para projetos
        </Button>
      </div>
    );
  }

  const currentStageIdx = STAGE_STEPS.indexOf(project.stage as any);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* ── Back + Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0 h-8 w-8"
          onClick={() => navigate("/projects")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold truncate neon-text">{project.name}</h1>
            {project.completed && (
              <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>
            )}
            <Badge variant="secondary" className="text-xs">{TYPE_LABEL[project.projectType] ?? project.projectType}</Badge>
          </div>
          {project.artist && (
            <p className="text-sm text-muted-foreground font-medium">{project.artist}</p>
          )}
        </div>

        {/* Edit button — owner only */}
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => navigate(`/projects?id=${project.id}`)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      {/* ── Progress bar + stage timeline ── */}
      <Card className="border-border bg-card/50">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{STAGE_LABEL[project.stage] ?? project.stage}</span>
            <span className="font-mono text-primary font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />

          <div className="flex items-center justify-between pt-1">
            {STAGE_STEPS.map((stage, i) => {
              const done = i < currentStageIdx || project.completed;
              const current = i === currentStageIdx && !project.completed;
              return (
                <div key={stage} className="flex flex-col items-center gap-1 flex-1">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all",
                    done ? "bg-success" : current ? "bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-card" : "bg-muted-foreground/25",
                  )} />
                  <span className={cn(
                    "text-[9px] text-center leading-tight",
                    current ? "text-primary font-semibold" : done ? "text-success/80" : "text-muted-foreground/50",
                  )}>
                    {STAGE_LABEL[stage]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Chat ── */}
      <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Chat da equipe</span>
        </div>
        <div className="p-3">
          <ProjectChat projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
