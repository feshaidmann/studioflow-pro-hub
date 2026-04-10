import { useState } from "react";
import { useReleaseChecklist, RELEASE_SECTIONS, type SectionDef } from "@/hooks/useReleaseChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Truck, FileText, Scale, Image, Globe, CheckCircle2,
  ChevronDown, Loader2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_ICON: Record<string, React.ElementType> = {
  distribuicao: Truck,
  metadados: FileText,
  juridico: Scale,
  conteudo: Image,
  plataformas: Globe,
  status_final: CheckCircle2,
};

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
            <Badge variant={allDone ? "default" : "secondary"} className={cn("text-[10px] px-1.5", allDone && "bg-success/20 text-success border-success/30")}>
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
              <div key={item.key} className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors", state.checked ? "bg-success/5" : "hover:bg-muted/30")}>
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
                  <span className={cn("text-sm flex-1", state.checked && "line-through text-muted-foreground")}>{item.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ProjectReleaseTab({ projectId }: { projectId: string }) {
  const { items, loading, saving, toggleCheck, setValue, progress, checkedItems, totalItems } = useReleaseChecklist(projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCriticalPending = !items.pronto_distribuir?.checked || !items.pronto_publicar?.checked || !items.pendencias_criticas?.checked;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
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

      {/* Sections */}
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
