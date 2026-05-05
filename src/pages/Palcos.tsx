import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic2, Search, Save, ExternalLink, Star, MapPin, Users,
  Music2, ChevronDown, Filter, X, Sparkles, ArrowRight,
  Calendar, DollarSign, Info, ClipboardList, AlertCircle, RefreshCw,
  MoreHorizontal, Trophy, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import {
  usePalcos, type PalcoCurado, type TipoPalco,
  TIPO_PALCO_LABELS, TIPO_PALCO_COLORS, PORTE_LABELS,
} from "@/hooks/usePalcos";
import { useProjects } from "@/contexts/ProjectContext";
import {
  useCreateApplication, useEditalApplications, useUpdateApplication, useDeleteApplication,
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  type ApplicationStatus, type EditalApplication,
} from "@/hooks/useEditalApplications";
import { useTasks } from "@/hooks/useTasks";
import ApplicationChecklist from "@/components/editais/ApplicationChecklist";
import EditalResultModal from "@/components/editais/EditalResultModal";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Templates de checklist por tipo de palco ─────────────────────────────
const PALCO_CHECKLIST_TEMPLATES: Record<TipoPalco, { label: string; type: string; required: boolean }[]> = {
  festival: [
    { label: "Press kit completo (bio + fotos)",  type: "portfolio_links", required: true },
    { label: "Rider técnico (equipamentos)",       type: "outro",           required: true },
    { label: "Links de streaming atualizados",     type: "portfolio_links", required: true },
    { label: "Foto profissional (alta resolução)", type: "outro",           required: false },
    { label: "Vídeo ao vivo recente",              type: "outro",           required: false },
  ],
  showcase: [
    { label: "Demo gravado (3 a 5 faixas)",  type: "portfolio_links", required: true },
    { label: "Bio curta (até 100 palavras)", type: "bio_curta",       required: true },
    { label: "Links de redes sociais",        type: "portfolio_links", required: true },
    { label: "EPK (Electronic Press Kit)",    type: "outro",           required: false },
  ],
  circuito: [
    { label: "Bio artística completa",            type: "bio_media",       required: true },
    { label: "Portfólio de shows anteriores",     type: "portfolio_links", required: true },
    { label: "Rider técnico",                      type: "outro",           required: true },
    { label: "Cachê e condições de apresentação", type: "outro",           required: false },
  ],
  residencia: [
    { label: "Proposta artística / memorial", type: "memorial",        required: true },
    { label: "Currículo artístico",            type: "curriculo",       required: true },
    { label: "Amostras de trabalho",           type: "portfolio_links", required: true },
    { label: "Plano de execução",              type: "plano_execucao",  required: false },
  ],
  abertura: [
    { label: "Demo ou EP recente", type: "portfolio_links", required: true },
    { label: "Links de streaming", type: "portfolio_links", required: true },
    { label: "Bio curta",          type: "bio_curta",       required: false },
  ],
};

// ── Exemplos de busca ─────────────────────────────────────────────────────
const SEARCH_EXAMPLES = [
  "Festivais de MPB abertos em São Paulo",
  "Showcases para artistas independentes no Brasil",
  "SESC apresentações inscrições abertas",
  "Circuito cultural nordeste música",
];

// ── Palcos Curado Calendar — destaques do semestre ────────────────────────
const PALCO_CALENDAR = [
  { nome: "SESC Apresentações",       query: "SESC apresentações inscrições abertas música",        status: "Aberto"   },
  { nome: "Rec-Beat Festival",        query: "Rec-Beat festival seleção bandas inscrição",           status: "Previsto" },
  { nome: "Festival de Garanhuns",    query: "Festival de Inverno Garanhuns seleção artistas",       status: "Previsto" },
  { nome: "Natura Musical",          query: "Natura Musical showcases inscrição artistas",           status: "Previsto" },
  { nome: "Palco Giratório SESC",    query: "Palco Giratório SESC seleção turnê nacional",           status: "Previsto" },
  { nome: "Circuito Cultural SP",    query: "Circuito Cultural Paulista edital artistas apresentação","status": "Previsto" },
];

function statusColor(status: string) {
  if (status === "Aberto")   return "bg-green-500/25 text-green-900 border-green-500/50 font-semibold";
  if (status === "Encerrado") return "bg-red-500/25 text-red-900 border-red-500/50 font-semibold";
  return "bg-amber-500/25 text-amber-900 border-amber-500/50 font-semibold";
}

// ── Card de detalhe de palco ──────────────────────────────────────────────
function PalcoDetailSheet({
  palco, open, onOpenChange, onCandidatar,
}: {
  palco: PalcoCurado | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCandidatar?: (palco: PalcoCurado) => void;
}) {
  if (!palco) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left leading-snug pr-6">{palco.nome}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusColor(palco.status)}>{palco.status}</Badge>
            <Badge variant="outline" className={TIPO_PALCO_COLORS[palco.tipo_palco]}>
              {TIPO_PALCO_LABELS[palco.tipo_palco]}
            </Badge>
            {palco.estado && <Badge variant="outline" className="text-xs">{palco.estado}</Badge>}
            <Badge variant="secondary" className="text-xs">{PORTE_LABELS[palco.porte]}</Badge>
          </div>

          {/* Cachê */}
          {palco.cachet_medio && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-200">
              <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm font-semibold text-green-700">{palco.cachet_medio}</span>
            </div>
          )}

          {/* Resumo */}
          {palco.resumo && (
            <p className="text-sm leading-relaxed text-muted-foreground">{palco.resumo}</p>
          )}

          {/* Grid de info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Organizador</p>
              <p className="font-medium">{palco.organizador}</p>
            </div>
            {palco.prazo && (
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="font-medium">{new Date(palco.prazo + "T12:00:00-03:00").toLocaleDateString("pt-BR")}</p>
              </div>
            )}
            {palco.periodo_inscricao && (
              <div>
                <p className="text-xs text-muted-foreground">Período típico</p>
                <p className="font-medium">{palco.periodo_inscricao}</p>
              </div>
            )}
            {palco.publico_estimado && (
              <div>
                <p className="text-xs text-muted-foreground">Público estimado</p>
                <p className="font-medium">{palco.publico_estimado}</p>
              </div>
            )}
          </div>

          {/* Gêneros */}
          {palco.generos.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Gêneros compatíveis</p>
              <div className="flex flex-wrap gap-1.5">
                {palco.generos.map((g) => (
                  <Badge key={g} variant="secondary" className="text-[11px]">{g}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Edital notice */}
          {!palco.tem_edital && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-900/10 p-3">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Esta oportunidade funciona por indicação ou portfólio — sem processo de seleção formal público.
                Entre em contato diretamente com o organizador.
              </p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {palco.link && (
              <Button size="sm" asChild>
                <a href={palco.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Abrir inscrição
                </a>
              </Button>
            )}
            {onCandidatar && (
              <Button size="sm" variant="outline" onClick={() => { onCandidatar(palco); onOpenChange(false); }}>
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />Acompanhar candidatura
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Dialog de início de candidatura ──────────────────────────────────────
function StartCandidaturaDialog({
  palco, open, onOpenChange, projects, onConfirm,
}: {
  palco: PalcoCurado | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projects: { id: string; name: string }[];
  onConfirm: (params: { edital_id: string; project_id?: string | null; notas?: string; tipo: "palco"; data_inscricao?: string }) => void;
}) {
  const [projectId, setProjectId] = useState("none");
  const [notas, setNotas] = useState("");
  const [dataInscricao, setDataInscricao] = useState("");

  if (!palco) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Acompanhar candidatura</DialogTitle>
          <DialogDescription className="text-sm">{palco.nome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Vincular a um projeto (opcional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nota (opcional)</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex: Prazo apertado, prioridade alta" />
          </div>
          <div>
            <Label className="text-xs">Data prevista de inscrição <span className="text-muted-foreground/60">(opcional)</span></Label>
            <Input type="date" value={dataInscricao} onChange={(e) => setDataInscricao(e.target.value)} className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const sk = `${palco.nome}_${palco.organizador}`.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");

            const { data: upserted } = await supabase
              .from("editais")
              .upsert({
                user_id: session.user.id,
                project_id: projectId !== "none" ? projectId : null,
                tipo: "palco",
                titulo: palco.nome,
                orgao: palco.organizador,
                estado: palco.estado || "",
                area: "Música",
                status: palco.status,
                prazo: palco.prazo || null,
                link: palco.link || "",
                origem_url: palco.link || "",
                inferido: false,
                session_key: sk,
                valor: palco.cachet_medio || "",
                publico_alvo: palco.publico_estimado || "",
                resumo: palco.resumo || "",
                documentos_resumo: "",
              } as any, { onConflict: "user_id,session_key" })
              .select("id")
              .single();

            if (upserted?.id) {
              onConfirm({
                edital_id: upserted.id,
                project_id: projectId !== "none" ? projectId : null,
                notas: notas.trim() || undefined,
                tipo: "palco",
                data_inscricao: dataInscricao || undefined,
              });
            }
            setProjectId("none");
            setNotas("");
            setDataInscricao("");
            onOpenChange(false);
          }}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Card de palco ─────────────────────────────────────────────────────────
function PalcoCard({
  palco, score, onViewDetail, onCandidatar, existingApplication, onViewCandidatura,
}: {
  palco: PalcoCurado;
  score?: number;
  onViewDetail: (p: PalcoCurado) => void;
  onCandidatar: (p: PalcoCurado) => void;
  existingApplication?: EditalApplication | null;
  onViewCandidatura?: (app: EditalApplication) => void;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => onViewDetail(palco)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{palco.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{palco.organizador}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={`text-[10px] ${statusColor(palco.status)}`}>
            {palco.status}
          </Badge>
          {typeof score === "number" && score > 0 && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={`text-[10px] ${
                    score >= 15 ? "bg-green-500/25 text-green-900 border-green-500/50 font-semibold" :
                    score >= 8  ? "bg-amber-500/25 text-amber-900 border-amber-500/50 font-semibold" :
                                  "bg-muted text-muted-foreground"
                  }`}>
                    <Star className="h-2.5 w-2.5 mr-0.5" />
                    Match
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {score >= 15 ? "Alta compatibilidade com seu perfil" :
                   score >= 8  ? "Compatibilidade média" : "Compatibilidade baixa"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {existingApplication && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={`text-[10px] ${APPLICATION_STATUS_COLORS[existingApplication.status]}`}>
                    <ClipboardList className="h-2.5 w-2.5 mr-0.5" />
                    {APPLICATION_STATUS_LABELS[existingApplication.status]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Você já está acompanhando este palco
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {palco.resumo && (
        <p className="text-xs text-muted-foreground line-clamp-2">{palco.resumo}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {palco.estado && (
          <span className="flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />{palco.estado}
          </span>
        )}
        {palco.publico_estimado && (
          <span className="flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />{palco.publico_estimado}
          </span>
        )}
        {palco.cachet_medio && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-2.5 w-2.5" />{palco.cachet_medio}
          </span>
        )}
      </div>

      {palco.generos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {palco.generos.slice(0, 4).map((g) => (
            <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0">{g}</Badge>
          ))}
          {palco.generos.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{palco.generos.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <Badge variant="outline" className={`text-[10px] ${TIPO_PALCO_COLORS[palco.tipo_palco]}`}>
          {TIPO_PALCO_LABELS[palco.tipo_palco]}
        </Badge>
        {existingApplication ? (
          <Button
            size="sm" variant="outline"
            className="h-7 ml-auto text-xs gap-1"
            onClick={() => onViewCandidatura?.(existingApplication)}
          >
            <ArrowRight className="h-3 w-3" />
            Ver status
          </Button>
        ) : (
          <Button
            size="sm" variant="default"
            className="h-7 ml-auto text-xs gap-1"
            onClick={() => onCandidatar(palco)}
          >
            <ClipboardList className="h-3 w-3" />
            Candidatar
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Pipeline (4 colunas) — Minhas candidaturas de palco ───────────────────
function PalcoPipelineCard({
  app, nextStatus, statuses, onUpdate, onDelete, onOpenChecklist, onOpenResult,
}: {
  app: EditalApplication;
  nextStatus: ApplicationStatus | null;
  statuses: ApplicationStatus[];
  onUpdate: (p: { id: string; status?: ApplicationStatus; notas?: string }) => void;
  onDelete: (id: string) => void;
  onOpenChecklist: (id: string) => void;
  onOpenResult: (id: string) => void;
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug flex-1">
            {app.edital?.titulo || "Palco"}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {nextStatus && (
                <DropdownMenuItem onClick={() => onUpdate({ id: app.id, status: nextStatus })}>
                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                  Mover → {APPLICATION_STATUS_LABELS[nextStatus]}
                </DropdownMenuItem>
              )}
              {statuses.filter((s) => s !== app.status && s !== nextStatus).map((s) => (
                <DropdownMenuItem key={s} onClick={() => onUpdate({ id: app.id, status: s })}>
                  Mover → {APPLICATION_STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => onOpenChecklist(app.id)}>
                <ClipboardList className="h-3.5 w-3.5 mr-2" />
                Checklist de documentos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenResult(app.id)}>
                <Trophy className="h-3.5 w-3.5 mr-2" />
                Registrar resultado
              </DropdownMenuItem>
              {app.edital?.link && (
                <DropdownMenuItem asChild>
                  <a href={app.edital.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Abrir inscrição
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(app.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {app.edital?.orgao && (
          <p className="text-xs text-muted-foreground">{app.edital.orgao}</p>
        )}
        {app.edital?.prazo && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Prazo: {new Date(app.edital.prazo + "T12:00:00-03:00").toLocaleDateString("pt-BR")}
          </p>
        )}
        {app.notas && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">{app.notas}</p>
        )}
        {nextStatus && (
          <Button
            size="sm"
            variant={app.status === "interesse" ? "outline" : "default"}
            className="h-7 text-xs w-full"
            onClick={() => onUpdate({ id: app.id, status: nextStatus })}
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            Mover para {APPLICATION_STATUS_LABELS[nextStatus]}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PalcoPipelineView({
  applications, onUpdate, onDelete, onOpenChecklist, onOpenResult,
}: {
  applications: EditalApplication[];
  onUpdate: (p: { id: string; status?: ApplicationStatus; notas?: string }) => void;
  onDelete: (id: string) => void;
  onOpenChecklist: (id: string) => void;
  onOpenResult: (id: string) => void;
}) {
  const statuses: ApplicationStatus[] = ["interesse", "preparando", "inscrito", "resultado"];
  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, EditalApplication[]> = {
      interesse: [], preparando: [], inscrito: [], resultado: [],
    };
    applications.forEach((a) => { if (map[a.status]) map[a.status].push(a); });
    return map;
  }, [applications]);
  const nextStatus = (s: ApplicationStatus): ApplicationStatus | null => {
    const idx = statuses.indexOf(s);
    return idx < statuses.length - 1 ? statuses[idx + 1] : null;
  };
  return (
    <div className="space-y-4">
      <div className="hidden md:grid grid-cols-4 gap-3">
        {statuses.map((status) => (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Badge variant="outline" className={APPLICATION_STATUS_COLORS[status] + " text-xs"}>
                {APPLICATION_STATUS_LABELS[status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {grouped[status].length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground/60">Vazio</p>
                </div>
              ) : (
                grouped[status].map((app) => (
                  <PalcoPipelineCard
                    key={app.id} app={app}
                    nextStatus={nextStatus(app.status)} statuses={statuses}
                    onUpdate={onUpdate} onDelete={onDelete}
                    onOpenChecklist={onOpenChecklist} onOpenResult={onOpenResult}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-4">
        {statuses.map((status) => (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={APPLICATION_STATUS_COLORS[status] + " text-xs"}>
                {APPLICATION_STATUS_LABELS[status]}
              </Badge>
              <span className="text-xs text-muted-foreground">({grouped[status].length})</span>
            </div>
            {grouped[status].length === 0 ? (
              <p className="text-xs text-muted-foreground pl-2 py-2">Nenhuma candidatura</p>
            ) : (
              <div className="space-y-2">
                {grouped[status].map((app) => (
                  <PalcoPipelineCard
                    key={app.id} app={app}
                    nextStatus={nextStatus(app.status)} statuses={statuses}
                    onUpdate={onUpdate} onDelete={onDelete}
                    onOpenChecklist={onOpenChecklist} onOpenResult={onOpenResult}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function Palcos() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const {
    palcosCurados, loadingCurados,
    searching, searchResult, searchError, lastQuery,
    search, retryLastSearch, saveResults, matchByPerfil,
  } = usePalcos();
  const createApplication = useCreateApplication();
  const { data: allApplications = [] } = useEditalApplications();
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();
  const { ensureAutoTask } = useTasks();

  const palcoApplications = useMemo(
    () => (allApplications as EditalApplication[]).filter((a) => (a as any).tipo === "palco"),
    [allApplications]
  );
  const applicationByEditalId = useMemo(() => {
    const map = new Map<string, EditalApplication>();
    palcoApplications.forEach((a) => map.set(a.edital_id, a));
    return map;
  }, [palcoApplications]);

  const [activeTab, setActiveTab] = useState("descobrir");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [resultAppId, setResultAppId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoPalco | "todos">("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterPorte, setFilterPorte] = useState<"todos" | "iniciante" | "medio" | "grande">("todos");
  const [filterApenasAbertos, setFilterApenasAbertos] = useState(false);
  const [sortBy, setSortBy] = useState<"status" | "prazo" | "match" | "nome">("status");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [detailPalco, setDetailPalco] = useState<PalcoCurado | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [candidaturaTarget, setCandidaturaTarget] = useState<PalcoCurado | null>(null);
  const [candidaturaOpen, setCandidaturaOpen] = useState(false);

  // Perfil cultural do projeto selecionado
  const [recoProfile, setRecoProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadProfile = async (projectId: string) => {
    if (!projectId) { setRecoProfile(null); return; }
    setLoadingProfile(true);
    const { data } = await supabase
      .from("projects")
      .select("perfil_cultural")
      .eq("id", projectId)
      .single();
    setRecoProfile(data?.perfil_cultural || null);
    setLoadingProfile(false);
  };

  // Palcos com score de match (quando há projeto selecionado)
  const palcosComScore = useMemo(() => {
    if (!recoProfile || !selectedProjectId) return [];
    return matchByPerfil(recoProfile, recoProfile?.generos || []);
  }, [recoProfile, selectedProjectId, matchByPerfil]);

  // Lookup de score por id para ordenar por match (quando há projeto)
  const scoreById = useMemo(() => {
    const m = new Map<string, number>();
    palcosComScore.forEach((p) => m.set(p.id, p.score));
    return m;
  }, [palcosComScore]);

  // Status weight (Aberto > Previsto > Encerrado)
  const statusWeight = (s: string) => (s === "Aberto" ? 0 : s === "Previsto" ? 1 : 2);

  // Palcos curados filtrados + ordenados (aba "Descobrir")
  const palcosFiltrados = useMemo(() => {
    const filtered = palcosCurados.filter((p) => {
      if (filterTipo !== "todos" && p.tipo_palco !== filterTipo) return false;
      if (filterEstado !== "todos" && p.estado !== filterEstado) return false;
      if (filterPorte !== "todos" && p.porte !== filterPorte) return false;
      if (filterApenasAbertos && p.status !== "Aberto") return false;
      return true;
    });

    const sorted = [...filtered];
    if (sortBy === "status") {
      sorted.sort((a, b) => statusWeight(a.status) - statusWeight(b.status) || a.nome.localeCompare(b.nome));
    } else if (sortBy === "prazo") {
      sorted.sort((a, b) => {
        const ad = a.prazo ? new Date(a.prazo).getTime() : Infinity;
        const bd = b.prazo ? new Date(b.prazo).getTime() : Infinity;
        return ad - bd;
      });
    } else if (sortBy === "match") {
      sorted.sort((a, b) => (scoreById.get(b.id) || 0) - (scoreById.get(a.id) || 0));
    } else {
      sorted.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return sorted;
  }, [palcosCurados, filterTipo, filterEstado, filterPorte, filterApenasAbertos, sortBy, scoreById]);

  const estados = useMemo(() => {
    const set = new Set(palcosCurados.map((p) => p.estado || "").filter(Boolean));
    return Array.from(set).sort();
  }, [palcosCurados]);

  const activeFilterCount =
    (filterTipo !== "todos" ? 1 : 0) +
    (filterEstado !== "todos" ? 1 : 0) +
    (filterPorte !== "todos" ? 1 : 0) +
    (filterApenasAbertos ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setFilterTipo("todos"); setFilterEstado("todos");
    setFilterPorte("todos"); setFilterApenasAbertos(false);
  };

  const handleSearch = (q?: string) => {
    const sq = (q || query).trim();
    if (!sq) return;
    if (q) setQuery(q);
    search(sq, selectedProjectId || null);
  };

  const handleCandidatar = (palco: PalcoCurado) => {
    setCandidaturaTarget(palco);
    setCandidaturaOpen(true);
  };

  const handleConfirmCandidatura = (params: {
    edital_id: string; project_id?: string | null; notas?: string; tipo: "palco"; data_inscricao?: string;
  }) => {
    const target = candidaturaTarget;
    createApplication.mutate(
      {
        edital_id: params.edital_id,
        project_id: params.project_id,
        notas: params.notas,
        data_inscricao: params.data_inscricao || null,
      },
      {
        onSuccess: async (newApp: any) => {
          // Checklist automático por tipo de palco
          if (target && newApp?.id) {
            const template = PALCO_CHECKLIST_TEMPLATES[target.tipo_palco] || [];
            const { data: { session } } = await supabase.auth.getSession();
            if (session && template.length > 0) {
              await supabase.from("edital_application_docs").insert(
                template.map((item) => ({
                  user_id: session.user.id,
                  application_id: newApp.id,
                  doc_label: item.label,
                  doc_type: item.type,
                  is_required: item.required,
                }))
              );
            }
          }
          // Tarefa automática no projeto vinculado
          if (params.project_id && target) {
            const prazoText = target.prazo
              ? ` — prazo ${new Date(target.prazo + "T12:00:00-03:00").toLocaleDateString("pt-BR")}`
              : "";
            await ensureAutoTask(`palco:${params.edital_id}:${params.project_id}`, {
              description: `Preparar candidatura para ${target.nome}${prazoText}`,
              source: "palco_candidatura",
              sourceModule: "palcos",
              taskArea: "lancamento",
              severity: target.prazo ? "high" : "medium",
              projectId: params.project_id,
              dueDate: target.prazo || undefined,
            });
          }
          toast.success("Candidatura iniciada!", {
            description: "Checklist de documentos criado automaticamente.",
            action: {
              label: "Ver candidaturas →",
              onClick: () => setActiveTab("candidaturas"),
            },
          });
        },
      }
    );
  };

  const projectList = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-20 md:pb-6">
      <MobileStickyHeader title="Palcos & Shows" subtitle="Oportunidades de apresentação" />

      <div className="hidden md:block">
        <div className="flex items-center gap-2">
          <Mic2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Palcos & Shows</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Festivais, circuitos e showcases para artistas independentes brasileiros
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex justify-start gap-0.5 no-scrollbar">
          <TabsTrigger value="descobrir" className="text-xs px-2.5 md:px-3 shrink-0">
            <Star className="h-3.5 w-3.5 mr-1" />
            Banco curado ({palcosCurados.length})
          </TabsTrigger>
          <TabsTrigger value="buscar" className="text-xs px-2.5 md:px-3 shrink-0">
            <Search className="h-3.5 w-3.5 mr-1" />
            Buscar com IA
          </TabsTrigger>
          <TabsTrigger value="recomendacoes" className="text-xs px-2.5 md:px-3 shrink-0">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Para meu projeto
          </TabsTrigger>
          <TabsTrigger value="candidaturas" className="text-xs px-2.5 md:px-3 shrink-0">
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Minhas Candidaturas
            {palcoApplications.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                {palcoApplications.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ABA: Banco curado ─────────────────────────────────────── */}
        <TabsContent value="descobrir" className="space-y-4 mt-4">
          {/* Filtros + ordenação */}
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2.5">
              {/* Linha principal: toggle filtros + ordenação + apenas abertos */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={cn(
                    "h-8 px-3 text-xs rounded-md border flex items-center gap-1.5 transition-colors",
                    activeFilterCount > 0
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  )}
                  aria-expanded={filtersOpen}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", filtersOpen && "rotate-180")} />
                </button>

                <button
                  onClick={() => setFilterApenasAbertos((v) => !v)}
                  className={cn(
                    "h-8 px-3 text-xs rounded-md border transition-colors",
                    filterApenasAbertos
                      ? "bg-green-500/25 text-green-900 border-green-500/50 font-semibold"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  ✅ Abertos
                </button>

                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">Ordenar:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="prazo">Prazo</SelectItem>
                      <SelectItem value="match" disabled={!recoProfile}>
                        Match {!recoProfile ? "(selecione projeto)" : ""}
                      </SelectItem>
                      <SelectItem value="nome">Nome (A–Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Painel de filtros — colapsável (responsivo: full width no mobile) */}
              {filtersOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/40">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tipo</label>
                    <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as any)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        {(Object.keys(TIPO_PALCO_LABELS) as TipoPalco[]).map((t) => (
                          <SelectItem key={t} value={t}>{TIPO_PALCO_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Estado</label>
                    <Select value={filterEstado} onValueChange={setFilterEstado}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os estados</SelectItem>
                        {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Porte</label>
                    <Select value={filterPorte} onValueChange={(v) => setFilterPorte(v as any)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os portes</SelectItem>
                        <SelectItem value="iniciante">Iniciante (até 1k)</SelectItem>
                        <SelectItem value="medio">Médio (1k–10k)</SelectItem>
                        <SelectItem value="grande">Grande (10k+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Chips de filtros ativos — sempre visíveis para feedback claro */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {filterTipo !== "todos" && (
                    <Badge variant="secondary" className="text-[11px] gap-1 pr-1">
                      {TIPO_PALCO_LABELS[filterTipo as TipoPalco]}
                      <button onClick={() => setFilterTipo("todos")} aria-label="Remover filtro tipo" className="hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterEstado !== "todos" && (
                    <Badge variant="secondary" className="text-[11px] gap-1 pr-1">
                      {filterEstado}
                      <button onClick={() => setFilterEstado("todos")} aria-label="Remover filtro estado" className="hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterPorte !== "todos" && (
                    <Badge variant="secondary" className="text-[11px] gap-1 pr-1">
                      {filterPorte === "iniciante" ? "Iniciante" : filterPorte === "medio" ? "Médio" : "Grande"}
                      <button onClick={() => setFilterPorte("todos")} aria-label="Remover filtro porte" className="hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterApenasAbertos && (
                    <Badge variant="secondary" className="text-[11px] gap-1 pr-1">
                      Apenas abertos
                      <button onClick={() => setFilterApenasAbertos(false)} aria-label="Remover filtro abertos" className="hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-1"
                  >
                    Limpar todos
                  </button>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-0.5">
                {palcosFiltrados.length} oportunidade{palcosFiltrados.length !== 1 ? "s" : ""} — banco curado pela equipe JSP, atualizado semestralmente
              </p>
            </CardContent>
          </Card>

          {/* Grid de palcos */}
          {loadingCurados ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : palcosCurados.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
                <Mic2 className="h-10 w-10 opacity-40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Banco curado vazio</p>
                  <p className="text-xs">
                    Ainda não há oportunidades cadastradas. Tente buscar com IA na aba ao lado.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : palcosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
                <Filter className="h-10 w-10 opacity-40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Nenhum resultado para esses filtros</p>
                  <p className="text-xs">Tente ampliar os critérios ou limpar os filtros.</p>
                </div>
                {hasFilters && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { setFilterTipo("todos"); setFilterEstado("todos"); setFilterPorte("todos"); setFilterApenasAbertos(false); }}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" /> Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {palcosFiltrados.map((p) => (
                <PalcoCard
                  key={p.id}
                  palco={p}
                  score={recoProfile ? scoreById.get(p.id) : undefined}
                  onViewDetail={(p) => { setDetailPalco(p); setDetailOpen(true); }}
                  onCandidatar={handleCandidatar}
                  existingApplication={applicationByEditalId.get(p.id) ?? null}
                  onViewCandidatura={() => setActiveTab("candidaturas")}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA: Buscar com IA ───────────────────────────────────── */}
        <TabsContent value="buscar" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-5 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: festivais de MPB abertos em SP, SESC apresentações..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={() => handleSearch()} disabled={searching || !query.trim()}>
                  <Search className="h-4 w-4 mr-1.5" />
                  {searching ? "Buscando…" : "Buscar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A IA busca oportunidades de apresentação em tempo real em portais culturais brasileiros.
              </p>
            </CardContent>
          </Card>

          {/* Loading — skeleton em grid (mesma forma dos resultados) */}
          {searching && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                Buscando oportunidades em portais culturais…
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Erro — busca IA falhou */}
          {!searching && searchError && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-6 flex flex-col items-center text-center gap-3">
                <AlertCircle className="h-9 w-9 text-destructive opacity-70" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Não foi possível buscar agora</p>
                  <p className="text-xs text-muted-foreground max-w-md">{searchError}</p>
                </div>
                {lastQuery && (
                  <Button size="sm" variant="outline" onClick={retryLastSearch}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estado vazio — calendário (sem resultado e sem erro) */}
          {!searching && !searchResult && !searchError && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Destaques do semestre — clique para buscar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {PALCO_CALENDAR.map((item) => (
                  <div
                    key={item.nome}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleSearch(item.query)}
                  >
                    <p className="text-sm font-medium">{item.nome}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${statusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Exemplos de busca */}
          {!searching && !searchResult && !searchError && (
            <div className="flex flex-wrap gap-2">
              {SEARCH_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleSearch(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* Resultados da busca */}
          {!searching && searchResult && (
            <div className="space-y-4">
              {searchResult.message && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {searchResult.message}
                    </p>
                  </CardContent>
                </Card>
              )}

              {searchResult.palcos.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {searchResult.palcos.length} oportunidade{searchResult.palcos.length !== 1 ? "s" : ""} encontrada{searchResult.palcos.length !== 1 ? "s" : ""}
                      </CardTitle>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => saveResults(searchResult.palcos as any)}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />Salvar todas
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {searchResult.palcos.map((p, i) => (
                        <PalcoCard
                          key={i}
                          palco={p as any}
                          onViewDetail={(p) => { setDetailPalco(p); setDetailOpen(true); }}
                          onCandidatar={handleCandidatar}
                          existingApplication={applicationByEditalId.get((p as any).id) ?? null}
                          onViewCandidatura={() => setActiveTab("candidaturas")}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-10 flex flex-col items-center text-center text-muted-foreground gap-3">
                    <Search className="h-9 w-9 opacity-40" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Nenhuma oportunidade estruturada encontrada</p>
                      <p className="text-xs max-w-md">
                        A IA não retornou palcos no formato esperado para esta busca.
                        Tente reformular com termos mais específicos (gênero, estado, ano).
                      </p>
                    </div>
                    {lastQuery && (
                      <Button size="sm" variant="outline" onClick={retryLastSearch}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Buscar novamente
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── ABA: Para meu projeto ─────────────────────────────────── */}
        <TabsContent value="recomendacoes" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Oportunidades compatíveis com seu projeto
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Selecione um projeto com Perfil Cultural configurado para ver as melhores oportunidades.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selectedProjectId}
                onValueChange={(v) => { setSelectedProjectId(v); loadProfile(v); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter((p) => !p.completed).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.artist}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProjectId && !recoProfile && !loadingProfile && (
                <div className="rounded-lg border border-border p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Este projeto ainda não tem Perfil Cultural configurado.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/projects?id=${selectedProjectId}`)}>
                    Configurar Perfil Cultural →
                  </Button>
                </div>
              )}

              {(loadingProfile || (selectedProjectId && loadingCurados)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {selectedProjectId && recoProfile && !loadingProfile && !loadingCurados && palcosComScore.length === 0 && (
                <div className="rounded-lg border border-border p-6 text-center space-y-3">
                  <Sparkles className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Nenhuma oportunidade compatível</p>
                    <p className="text-xs text-muted-foreground">
                      {palcosCurados.length === 0
                        ? "O banco curado ainda está vazio."
                        : "Os palcos do banco curado não combinam com o perfil cultural deste projeto."}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const tab = document.querySelector<HTMLButtonElement>('[role="tab"][value="buscar"]');
                    tab?.click();
                  }}>
                    <Search className="h-3.5 w-3.5 mr-1.5" /> Buscar com IA
                  </Button>
                </div>
              )}

              {selectedProjectId && recoProfile && !loadingProfile && palcosComScore.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {palcosComScore.length} oportunidade{palcosComScore.length !== 1 ? "s" : ""} compatível{palcosComScore.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {palcosComScore.slice(0, 12).map((p) => (
                      <PalcoCard
                        key={p.id}
                        palco={p}
                        score={p.score}
                        onViewDetail={(p) => { setDetailPalco(p); setDetailOpen(true); }}
                        onCandidatar={handleCandidatar}
                        existingApplication={applicationByEditalId.get(p.id) ?? null}
                        onViewCandidatura={() => setActiveTab("candidaturas")}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA: Minhas Candidaturas ─────────────────────────────── */}
        <TabsContent value="candidaturas" className="space-y-4 mt-4">
          {palcoApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
                <ClipboardList className="h-10 w-10 opacity-40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Nenhuma candidatura ainda</p>
                  <p className="text-xs max-w-sm">
                    Encontre uma oportunidade nas abas acima e clique em "Candidatar" para começar a acompanhar.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <PalcoPipelineView
              applications={palcoApplications}
              onUpdate={(p) => updateApplication.mutate(p)}
              onDelete={(id) => deleteApplication.mutate(id)}
              onOpenChecklist={(id) => setSelectedAppId(id)}
              onOpenResult={(id) => setResultAppId(id)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detalhe */}
      <PalcoDetailSheet
        palco={detailPalco}
        open={detailOpen}
        onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetailPalco(null); }}
        onCandidatar={handleCandidatar}
      />

      {/* Candidatura */}
      <StartCandidaturaDialog
        palco={candidaturaTarget}
        open={candidaturaOpen}
        onOpenChange={(o) => { setCandidaturaOpen(o); if (!o) setCandidaturaTarget(null); }}
        projects={projectList}
        onConfirm={handleConfirmCandidatura}
      />

      {/* Checklist de documentos */}
      {selectedAppId && (
        <Sheet open={!!selectedAppId} onOpenChange={(o) => { if (!o) setSelectedAppId(null); }}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Checklist de documentos</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ApplicationChecklist applicationId={selectedAppId} projects={projectList} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Registrar resultado */}
      {resultAppId && (() => {
        const app = palcoApplications.find((a) => a.id === resultAppId);
        if (!app) return null;
        return (
          <EditalResultModal
            application={app}
            open={!!resultAppId}
            onOpenChange={(o) => { if (!o) setResultAppId(null); }}
          />
        );
      })()}
    </div>
  );
}
