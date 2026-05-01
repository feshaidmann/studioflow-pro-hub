import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReleaseChecklist, RELEASE_SECTIONS, type SectionDef } from "@/hooks/useReleaseChecklist";
import { useSavedAnalyses } from "@/hooks/useSavedAnalyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Truck, FileText, Scale, Image, Globe, CheckCircle2,
  ChevronDown, Loader2, AlertTriangle, Megaphone, Palette, Dna,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_ICON: Record<string, React.ElementType> = {
  distribuicao: Truck,
  metadados: FileText,
  juridico: Scale,
  conteudo: Image,
  plataformas: Globe,
  divulgacao: Megaphone,
  status_final: CheckCircle2,
};

// ── Seções que têm relação direta com materiais visuais
// Usadas para calcular o hint de "pendências de conteúdo"
const CONTENT_KEYS = ["capa", "thumbnail", "teaser", "reels", "stories"];

function SectionBlock({ section, items, toggleCheck, setValue }: {
  section: SectionDef;
  items: ReturnType<typeof useReleaseChecklist>["items"];
  toggleCheck: (k: string) => void;
  setValue: (k: string, v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = SECTION_ICON[section.key] ?? FileText;
  const done = section.items.filter((i) => items[i.key]?.checked).length;
  const total = section.items.length;
  const allDone = done === total;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-2.5">
            <Icon className={cn("h-4 w-4", allDone ? "text-success" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">{section.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={allDone ? "default" : "secondary"}
              className={cn("text-[10px] px-1.5", allDone && "bg-success/20 text-success border-success/30")}
            >
              {done}/{total}
            </Badge>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1.5 pl-2 pr-1 pb-2 pt-1">
          {section.items.map((item) => {
            const state = items[item.key] ?? { checked: false, value: "" };
            return (
              <div
                key={item.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
                  state.checked ? "bg-success/5" : "hover:bg-muted/30",
                )}
              >
                <Checkbox
                  checked={state.checked}
                  onCheckedChange={() => {
                    if (item.type === "check") toggleCheck(item.key);
                  }}
                  disabled={item.type === "text"}
                  className="shrink-0"
                />
                {item.type === "text" ? (
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-muted-foreground block mb-0.5">{item.label}</label>
                    <Input
                      value={state.value}
                      onChange={(e) => setValue(item.key, e.target.value)}
                      placeholder={`Informar ${item.label.toLowerCase()}`}
                      className="h-7 text-xs"
                    />
                  </div>
                ) : (
                  <span className={cn("text-sm flex-1", state.checked && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Cartão de entrada para o módulo Criativo ──────────────────────────────
interface CreativeEntryCardProps {
  projectId: string;
  projectName: string;
  artistName: string;
}

function CreativeEntryCard({ projectId, projectName, artistName }: CreativeEntryCardProps) {
  const navigate = useNavigate();
  const { savedAnalyses } = useSavedAnalyses();

  // Procura a análise de DNA mais recente vinculada a este projeto
  const linkedDna = savedAnalyses.find((a) => a.project_id === projectId);

  const handleCreate = () => {
    const params = new URLSearchParams({ project: projectId });
    if (linkedDna) params.set("dna", linkedDna.id);
    navigate(`/criativo?${params.toString()}`);
  };

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Palette className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold">Materiais de divulgação</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Crie artes e legendas para o lançamento de{" "}
              <span className="font-medium text-foreground">{projectName}</span>
              {artistName ? ` — ${artistName}` : ""}.
            </p>

            {/* Badge de DNA se disponível */}
            {linkedDna && (
              <div className="flex items-center gap-1.5 mt-2">
                <Dna className="h-3 w-3 text-primary" />
                <span className="text-[11px] text-primary">
                  DNA Musical disponível — {linkedDna.track_name || "faixa analisada"}
                </span>
              </div>
            )}
          </div>

          <Button
            size="sm"
            className="shrink-0 h-8 px-3 text-xs gap-1.5"
            onClick={handleCreate}
          >
            <Palette className="h-3.5 w-3.5" />
            Criar materiais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
interface ProjectReleaseTabProps {
  projectId: string;
  projectName?: string;
  artistName?: string;
}

export default function ProjectReleaseTab({
  projectId,
  projectName = "este projeto",
  artistName = "",
}: ProjectReleaseTabProps) {
  const { items, loading, saving, toggleCheck, setValue, progress, checkedItems, totalItems } =
    useReleaseChecklist(projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCriticalPending =
    !items.pronto_distribuir?.checked ||
    !items.pronto_publicar?.checked ||
    !items.pendencias_criticas?.checked;

  // Conta quantos itens de conteúdo visual ainda estão pendentes
  const pendingContentItems = CONTENT_KEYS.filter((k) => !items[k]?.checked).length;

  return (
    <div className="space-y-4">

      {/* Entrada para o módulo Criativo — aparece no topo */}
      <CreativeEntryCard
        projectId={projectId}
        projectName={projectName}
        artistName={artistName}
      />

      {/* Hint contextual se há itens de conteúdo visual pendentes */}
      {pendingContentItems > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {pendingContentItems === 1
              ? "1 item de conteúdo visual ainda pendente na seção Conteúdo."
              : `${pendingContentItems} itens de conteúdo visual pendentes na seção Conteúdo.`}{" "}
            Use o botão acima para criar os materiais.
          </p>
        </div>
      )}

      {/* Resumo de progresso */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Progresso do Lançamento</CardTitle>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{checkedItems}/{totalItems} itens</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-medium">{progress}%</span>
            {progress === 100 ? (
              <Badge className="bg-success/20 text-success border-success/30 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Pronto
              </Badge>
            ) : hasCriticalPending ? (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" /> Pendências
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Seções do checklist */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-3 space-y-1">
          {RELEASE_SECTIONS.map((section) => (
            <SectionBlock
              key={section.key}
              section={section}
              items={items}
              toggleCheck={toggleCheck}
              setValue={setValue}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
