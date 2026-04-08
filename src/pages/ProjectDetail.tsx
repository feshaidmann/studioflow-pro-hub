import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, Music2, Pencil, MessageSquare,
  LayoutDashboard, Users, ListChecks, DollarSign, Rocket, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

import ProjectOverviewTab from "@/components/project-hub/ProjectOverviewTab";
import ProjectTeamTab from "@/components/project-hub/ProjectTeamTab";
import ProjectChat from "@/components/project-hub/ProjectChat";
import ProjectTasksTab from "@/components/project-hub/ProjectTasksTab";
import ProjectFinanceTab from "@/components/project-hub/ProjectFinanceTab";
import ProjectReleaseTab from "@/components/project-hub/ProjectReleaseTab";
import ProjectFilesTab from "@/components/project-hub/ProjectFilesTab";
import CollaboratorOverviewTab from "@/components/project-hub/CollaboratorOverviewTab";
import CollaboratorTasksTab from "@/components/project-hub/CollaboratorTasksTab";
import CollaboratorFilesTab from "@/components/project-hub/CollaboratorFilesTab";

const STAGE_PERCENT: Record<string, number> = {
  rough: 0, inicio: 5, gravacao: 25, mix: 55, master: 75, upload: 90, lancado: 100,
};

const TYPE_LABEL: Record<string, string> = {
  single: "Single", ep: "EP", album: "Álbum", beat: "Beat / Base", trilha_guia: "Trilha Guia", feat: "Feat",
};

interface ProjectView {
  id: string; name: string; artist: string; stage: string; completed: boolean; projectType: string;
}

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

  // Collaborator tabs
  const guestTabs = [
    { value: "overview", label: "Resumo", icon: LayoutDashboard },
    { value: "tasks", label: "Minhas Tarefas", icon: ListChecks },
    { value: "files", label: "Meus Arquivos", icon: FolderOpen },
    { value: "chat", label: "Conversa", icon: MessageSquare },
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
            {!isOwner && <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Colaborador</Badge>}
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
        <TabsList className={cn("w-full grid", isOwner ? "grid-cols-6" : "grid-cols-4")}>
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

        {/* ── Owner Tabs ── */}
        {isOwner && (
          <>
            <TabsContent value="overview">
              <ProjectOverviewTab project={project} progress={progress} isOwner={isOwner} onSwitchTab={setActiveTab} />
            </TabsContent>
            <TabsContent value="tasks">
              <ProjectTasksTab projectId={project.id} />
            </TabsContent>
            <TabsContent value="team">
              <ProjectTeamTab projectId={project.id} />
            </TabsContent>
            <TabsContent value="files">
              <ProjectFilesTab projectId={project.id} />
            </TabsContent>
            <TabsContent value="finance">
              <ProjectFinanceTab projectId={project.id} />
            </TabsContent>
            <TabsContent value="release">
              <ProjectReleaseTab projectId={project.id} />
            </TabsContent>
          </>
        )}

        {/* ── Collaborator Tabs ── */}
        {!isOwner && (
          <>
            <TabsContent value="overview">
              <CollaboratorOverviewTab projectId={project.id} project={project} />
            </TabsContent>
            <TabsContent value="tasks">
              <CollaboratorTasksTab projectId={project.id} />
            </TabsContent>
            <TabsContent value="files">
              <CollaboratorFilesTab projectId={project.id} />
            </TabsContent>
            <TabsContent value="chat">
              <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
                <div className="p-3">
                  <ProjectChat projectId={project.id} />
                </div>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Owner also gets chat embedded below */}
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
