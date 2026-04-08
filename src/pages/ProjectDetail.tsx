import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectChat } from "@/hooks/useProjectChat";
import {
  ChevronLeft, Music2, Pencil, MessageSquare, Send, Lock,
  LayoutDashboard, Users, ListChecks, DollarSign, Rocket, FolderOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import ProjectOverviewTab from "@/components/project-hub/ProjectOverviewTab";
import ProjectTeamTab from "@/components/project-hub/ProjectTeamTab";
import ProjectTasksTab from "@/components/project-hub/ProjectTasksTab";
import ProjectFinanceTab from "@/components/project-hub/ProjectFinanceTab";
import ProjectReleaseTab from "@/components/project-hub/ProjectReleaseTab";
import ProjectFilesTab from "@/components/project-hub/ProjectFilesTab";

const STAGE_PERCENT: Record<string, number> = {
  rough: 0, inicio: 5, gravacao: 25, mix: 55, master: 75, upload: 90, lancado: 100,
};

const TYPE_LABEL: Record<string, string> = {
  single: "Single", ep: "EP", album: "Álbum", beat: "Beat / Base", trilha_guia: "Trilha Guia", feat: "Feat",
};

// ── Chat component (extracted inline) ──
function ProjectChat({ projectId }: { projectId: string }) {
  const { messages, loading, sending, sendMessage, currentUserId } = useProjectChat(projectId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => { if (!input.trim()) return; await sendMessage(input); setInput(""); };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  function relTime(d: string) { try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); } catch { return ""; } }
  function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

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
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma mensagem ainda. Comece a conversa!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", isMe ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  {initials(msg.display_name)}
                </div>
                <div className={cn("max-w-[72%]", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                  {!isMe && <span className="text-[10px] text-muted-foreground px-1">{msg.display_name}</span>}
                  <div className={cn("rounded-2xl px-3 py-2 text-sm leading-snug", isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
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
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Digite uma mensagem…" className="flex-1 h-9 text-sm" disabled={sending} />
        <Button size="sm" className="h-9 px-3 neon-glow" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Project view shape ──
interface ProjectView {
  id: string; name: string; artist: string; stage: string; completed: boolean; projectType: string;
}

// ── Main Page ──
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { projects, getMixPercent } = useProjects();
  const [activeTab, setActiveTab] = useState("overview");

  const ownerProject = projects.find((p) => p.id === id);
  const [guestProject, setGuestProject] = useState<ProjectView | null>(null);
  const [guestLoading, setGuestLoading] = useState(!ownerProject);
  const [isOwner, setIsOwner] = useState(!!ownerProject);

  useEffect(() => {
    if (ownerProject) { setIsOwner(true); setGuestLoading(false); return; }
    if (!id) { setGuestLoading(false); return; }
    setGuestLoading(true);
    supabase.rpc("get_project_for_member", { p_project_id: id }).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        const row = data[0];
        setGuestProject({ id: row.id, name: row.name, artist: row.artist, stage: row.stage, completed: row.completed, projectType: row.project_type });
        setIsOwner(false);
      }
      setGuestLoading(false);
    });
  }, [id, ownerProject]);

  const project: ProjectView | null = ownerProject
    ? { id: ownerProject.id, name: ownerProject.name, artist: ownerProject.artist, stage: ownerProject.stage, completed: ownerProject.completed, projectType: ownerProject.projectType }
    : guestProject;

  const progress = isOwner && ownerProject ? getMixPercent(ownerProject.id) : STAGE_PERCENT[project?.stage ?? "rough"] ?? 0;

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

  // Owner tab definitions
  const ownerTabs = [
    { value: "overview", label: "Visão Geral", icon: LayoutDashboard },
    { value: "tasks", label: "Tarefas", icon: ListChecks },
    { value: "team", label: "Equipe", icon: Users },
    { value: "files", label: "Arquivos", icon: FolderOpen },
    { value: "finance", label: "Financeiro", icon: DollarSign },
    { value: "release", label: "Lançamento", icon: Rocket },
  ];

  // Guest tabs (limited)
  const guestTabs = [
    { value: "overview", label: "Visão Geral", icon: LayoutDashboard },
    { value: "chat", label: "Chat", icon: MessageSquare },
  ];

  const tabs = isOwner ? ownerTabs : guestTabs;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* ── Back + Header ── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0 h-8 w-8" onClick={() => navigate("/projects")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold truncate neon-text">{project.name}</h1>
            {project.completed && <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>}
            <Badge variant="secondary" className="text-xs">{TYPE_LABEL[project.projectType] ?? project.projectType}</Badge>
          </div>
          {project.artist && <p className="text-sm text-muted-foreground font-medium">{project.artist}</p>}
        </div>
        {isOwner && (
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate(`/projects?id=${project.id}`)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </div>

      {/* ── Hub Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn("w-full grid", `grid-cols-${tabs.length}`)}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1 text-xs">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab
            project={project}
            progress={progress}
            isOwner={isOwner}
            onSwitchTab={setActiveTab}
          />
        </TabsContent>

        {isOwner && (
          <TabsContent value="tasks">
            <ProjectTasksTab projectId={project.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="team">
            <ProjectTeamTab projectId={project.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="files">
            <ProjectFilesTab projectId={project.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="finance">
            <ProjectFinanceTab projectId={project.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="release">
            <ProjectReleaseTab projectId={project.id} />
          </TabsContent>
        )}

        {/* Guest-only chat tab */}
        {!isOwner && (
          <TabsContent value="chat">
            <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
              <div className="p-3">
                <ProjectChat projectId={project.id} />
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Owner also gets chat, but embedded below tabs for context */}
      {isOwner && (
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
            onClick={() => {
              const el = document.getElementById("project-chat-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <MessageSquare className="h-4 w-4 text-primary" />
            Chat da Equipe
          </button>
          <div id="project-chat-section" className="p-3 border-t border-border">
            <ProjectChat projectId={project.id} />
          </div>
        </div>
      )}
    </div>
  );
}
