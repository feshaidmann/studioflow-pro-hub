import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Save, Trash2, ExternalLink, FileText, Pencil, Info, BarChart3, ClipboardList, Sparkles, ChevronDown, ArrowRight, Plus, MoreHorizontal, KanbanSquare, FolderOpen, Bot, Trophy, Eye, DollarSign, Users, FileCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEditais, type Edital } from "@/hooks/useEditais";
import { useEditalApplications, useCreateApplication, useUpdateApplication, useDeleteApplication, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus, type EditalApplication } from "@/hooks/useEditalApplications";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import EditalDocumentsBank from "@/components/editais/EditalDocumentsBank";
import ApplicationChecklist from "@/components/editais/ApplicationChecklist";
import EditalAIAssistant, { type AIContext } from "@/components/editais/EditalAIAssistant";
import EditalResultModal from "@/components/editais/EditalResultModal";
import EditalMetricsDashboard from "@/components/editais/EditalMetricsDashboard";

const AREA_OPTIONS = ["Música", "Audiovisual", "Ambos", "Outra"];
const ITEMS_PER_PAGE = 20;

function statusColor(status: string) {
  if (status === "Aberto") return "bg-green-500/15 text-green-700 border-green-200";
  if (status === "Encerrado") return "bg-red-500/15 text-red-700 border-red-200";
  return "bg-muted text-muted-foreground border-border";
}

const STATUS_ORDER: Record<string, number> = { Aberto: 0, Indefinido: 1, Encerrado: 2 };

function sortAndFilterEditais(items: Edital[], filterStatus: string): Edital[] {
  let filtered = items;
  if (filterStatus === "Todos") {
    filtered = items.filter((e) => e.status !== "Encerrado");
  } else if (filterStatus === "Todos+Encerrados") {
    filtered = items;
  } else if (filterStatus === "Indefinido") {
    filtered = items.filter((e) => e.status !== "Aberto" && e.status !== "Encerrado");
  } else {
    filtered = items.filter((e) => e.status === filterStatus);
  }
  return [...filtered].sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 1;
    const ob = STATUS_ORDER[b.status] ?? 1;
    if (oa !== ob) return oa - ob;
    if (!a.prazo && !b.prazo) return 0;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  } catch { return d; }
}

function EditalDetailSheet({
  edital, open, onOpenChange, onDelete, onInscricao, t,
}: {
  edital: Edital | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDelete?: (id: string) => void;
  onInscricao?: (id: string) => void;
  t: (k: string) => string;
}) {
  if (!edital) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left leading-snug pr-6">{edital.titulo}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusColor(edital.status)}>{edital.status}</Badge>
            {edital.area && <Badge variant="secondary" className="text-xs">{edital.area}</Badge>}
            {edital.estado && <Badge variant="outline" className="text-xs">{edital.estado}</Badge>}
          </div>
          {edital.valor && edital.valor !== "—" && edital.valor !== "" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-200">
              <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm font-semibold text-green-700">{edital.valor}</span>
            </div>
          )}
          {edital.resumo && edital.resumo !== "—" && edital.resumo !== "" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Resumo</p>
              <p className="text-sm leading-relaxed">{edital.resumo}</p>
            </div>
          )}
          {edital.publico_alvo && edital.publico_alvo !== "—" && edital.publico_alvo !== "" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Público-alvo</p>
              <p className="text-sm">{edital.publico_alvo}</p>
            </div>
          )}
          {edital.documentos_resumo && edital.documentos_resumo !== "—" && edital.documentos_resumo !== "" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Documentos exigidos</p>
              <p className="text-sm">{edital.documentos_resumo}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Órgão</p><p className="font-medium">{edital.orgao || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Prazo</p><p className="font-medium">{formatDate(edital.prazo)}</p></div>
            <div><p className="text-xs text-muted-foreground">Abertura</p><p className="font-medium">{formatDate(edital.abertura)}</p></div>
            <div><p className="text-xs text-muted-foreground">Área</p><p className="font-medium">{edital.area || "—"}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {edital.link && edital.link !== "—" && (
              <Button size="sm" asChild>
                <a href={edital.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Abrir edital
                </a>
              </Button>
            )}
            {onInscricao && edital.id && (
              <Button size="sm" variant="outline" onClick={() => { onInscricao(edital.id!); onOpenChange(false); }}>
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />Iniciar inscrição
              </Button>
            )}
            {onDelete && edital.id && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onDelete(edital.id!); onOpenChange(false); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Remover
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditalTable({
  items, onDelete, onEdit, onInscricao, onViewDetail, t,
}: {
  items: Edital[];
  onDelete?: (id: string) => void;
  onEdit?: (e: Edital) => void;
  onInscricao?: (id: string) => void;
  onViewDetail?: (e: Edital) => void;
  t: (k: string) => string;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-2">
        {items.map((e, i) => (
          <div key={e.id || e.session_key || i} className="rounded-lg border border-border p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onViewDetail?.(e)}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug flex-1">
                {e.titulo}
                {e.inferido && <Info className="inline h-3 w-3 text-muted-foreground ml-1" />}
              </p>
              <Badge variant="outline" className={statusColor(e.status) + " shrink-0 text-[10px]"}>{e.status}</Badge>
            </div>
            {e.resumo && e.resumo !== "—" && e.resumo !== "" && (
              <p className="text-xs text-muted-foreground line-clamp-2">{e.resumo}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {e.orgao && <span>{e.orgao}</span>}
              {e.estado && <span>UF: {e.estado}</span>}
              {e.area && <span>{e.area}</span>}
              <span>Prazo: {formatDate(e.prazo)}</span>
            </div>
            {e.valor && e.valor !== "—" && e.valor !== "" && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-xs font-semibold text-green-700">{e.valor}</span>
              </div>
            )}
            <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
              {e.link && e.link !== "—" && (
                <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                </a>
              )}
              {onInscricao && e.id && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onInscricao(e.id!)}>
                  <ClipboardList className="h-3.5 w-3.5" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => e.id && onDelete(e.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="w-16">UF</TableHead>
            <TableHead>Órgão</TableHead>
            <TableHead className="w-28">Valor</TableHead>
            <TableHead className="w-24">Prazo</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Área</TableHead>
            <TableHead className="w-16">Link</TableHead>
            {(onDelete || onEdit || onInscricao) && <TableHead className="w-28" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e, i) => (
            <TableRow key={e.id || e.session_key || i} className="cursor-pointer hover:bg-muted/30" onClick={() => onViewDetail?.(e)}>
              <TableCell className="font-medium max-w-[260px]">
                <span className="flex items-center gap-1">
                  <span className="truncate">{e.titulo}</span>
                  {e.inferido && (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground shrink-0" /></TooltipTrigger><TooltipContent>{t("editais.inferred")}</TooltipContent></Tooltip></TooltipProvider>
                  )}
                </span>
                {e.resumo && e.resumo !== "—" && e.resumo !== "" && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-normal">{e.resumo}</p>
                )}
              </TableCell>
              <TableCell className="text-xs">{e.estado || "—"}</TableCell>
              <TableCell className="text-xs max-w-[140px] truncate">{e.orgao || "—"}</TableCell>
              <TableCell className="text-xs">
                {e.valor && e.valor !== "—" && e.valor !== "" ? (
                  <span className="font-semibold text-green-700">{e.valor}</span>
                ) : "—"}
              </TableCell>
              <TableCell className="text-xs tabular-nums">{formatDate(e.prazo)}</TableCell>
              <TableCell><Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge></TableCell>
              <TableCell className="text-xs">{e.area || "—"}</TableCell>
              <TableCell onClick={(ev) => ev.stopPropagation()}>
                {e.link && e.link !== "—" ? (
                  <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /></a>
                ) : "—"}
              </TableCell>
              {(onDelete || onEdit || onInscricao) && (
                <TableCell onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex gap-1">
                    {onInscricao && e.id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onInscricao(e.id!)}><ClipboardList className="h-3.5 w-3.5" /></Button>
                    )}
                    {onEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => e.id && onDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


function EditEditalDialog({
  edital, open, onOpenChange, onSave, t,
}: {
  edital: Edital | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (id: string, fields: Partial<Edital>) => void;
  t: (k: string) => string;
}) {
  const [form, setForm] = useState<Partial<Edital>>({});

  const reset = (e: Edital | null) => {
    if (e) setForm({ titulo: e.titulo, orgao: e.orgao, status: e.status, area: e.area, prazo: e.prazo, abertura: e.abertura, link: e.link });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o && edital) reset(edital); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editais.edit")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={form.titulo || ""} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Órgão</Label>
              <Input value={form.orgao || ""} onChange={(e) => setForm((p) => ({ ...p, orgao: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "Indefinido"} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                  <SelectItem value="Indefinido">Indefinido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Área</Label>
              <Select value={form.area || ""} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link</Label>
              <Input value={form.link || ""} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Abertura</Label>
              <Input type="date" value={form.abertura || ""} onChange={(e) => setForm((p) => ({ ...p, abertura: e.target.value || null }))} />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={form.prazo || ""} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value || null }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (edital?.id) { onSave(edital.id, form); onOpenChange(false); } }}>
            {t("editais.editSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Painel de métricas (colapsável) ── */
function MetricasPanel({ editais }: { editais: Edital[] }) {
  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    editais.forEach((e) => { const s = e.status || "Indefinido"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [editais]);

  const totalInscritos = editais.filter((e) => (e as any).inscrito).length;
  const totalAbertos = editais.filter((e) => e.status === "Aberto").length;

  const statusColors: Record<string, string> = {
    Aberto: "bg-green-500",
    Encerrado: "bg-red-400",
    Indefinido: "bg-muted-foreground/40",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold">{editais.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total salvos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalAbertos}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Abertos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-primary">{totalInscritos}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Inscritos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-2">
            {porStatus.map(([status, count]) => (
              <span key={status} className="flex items-center gap-1 text-xs">
                <span className={`h-2 w-2 rounded-full ${statusColors[status] || "bg-muted-foreground/40"}`} />
                {count}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Por status</p>
        </CardContent>
      </Card>
    </div>
  );
}

const SEARCH_EXAMPLES = [
  "Editais de música abertos em São Paulo",
  "ProAC audiovisual 2026",
  "Funarte fomento artista independente",
];

/* ── Pipeline de candidaturas ── */
function PipelineTab({ applications, onUpdate, onDelete, onOpenChecklist, onOpenResult, onOpenAI, projects, t }: {
  applications: EditalApplication[];
  onUpdate: (params: { id: string; status?: ApplicationStatus; notas?: string; project_id?: string | null }) => void;
  onDelete: (id: string) => void;
  onOpenChecklist: (appId: string) => void;
  onOpenResult: (appId: string) => void;
  onOpenAI: (app: EditalApplication) => void;
  projects: { id: string; name: string }[];
  t: (k: string) => string;
}) {
  const isMobile = useIsMobile();
  const statuses: ApplicationStatus[] = ["interesse", "preparando", "inscrito", "resultado"];

  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, EditalApplication[]> = {
      interesse: [], preparando: [], inscrito: [], resultado: [],
    };
    applications.forEach((a) => {
      if (map[a.status]) map[a.status].push(a);
    });
    return map;
  }, [applications]);

  const nextStatus = (s: ApplicationStatus): ApplicationStatus | null => {
    const idx = statuses.indexOf(s);
    return idx < statuses.length - 1 ? statuses[idx + 1] : null;
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
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
                  <Card key={app.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug flex-1">{app.edital?.titulo || "Edital"}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {nextStatus(app.status) && (
                              <DropdownMenuItem onClick={() => onUpdate({ id: app.id, status: nextStatus(app.status)! })}>
                                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                                Mover → {APPLICATION_STATUS_LABELS[nextStatus(app.status)!]}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onOpenAI(app)}>
                              <Sparkles className="h-3.5 w-3.5 mr-2" />
                              Assistente IA
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenChecklist(app.id)}>
                              <ClipboardList className="h-3.5 w-3.5 mr-2" />
                              Checklist
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenResult(app.id)}>
                              <Trophy className="h-3.5 w-3.5 mr-2" />
                              Registrar resultado
                            </DropdownMenuItem>
                            {app.edital?.link && (
                              <DropdownMenuItem asChild>
                                <a href={app.edital.link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                  Abrir edital
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
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {app.edital?.orgao && <span>{app.edital.orgao}</span>}
                        {app.edital?.prazo && <span>Prazo: {formatDate(app.edital.prazo)}</span>}
                      </div>
                      {app.notas && <p className="text-xs text-muted-foreground italic">{app.notas}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: columns layout
  return (
    <div className="grid grid-cols-4 gap-3">
      {statuses.map((status) => (
        <div key={status} className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Badge variant="outline" className={APPLICATION_STATUS_COLORS[status] + " text-xs"}>
              {APPLICATION_STATUS_LABELS[status]}
            </Badge>
            <span className="text-xs text-muted-foreground">({grouped[status].length})</span>
          </div>
          {grouped[status].length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma candidatura</p>
          ) : (
            grouped[status].map((app) => (
              <Card key={app.id} className="border">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-medium leading-snug flex-1 line-clamp-2">{app.edital?.titulo || "Edital"}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><MoreHorizontal className="h-3 w-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {nextStatus(app.status) && (
                          <DropdownMenuItem onClick={() => onUpdate({ id: app.id, status: nextStatus(app.status)! })}>
                            <ArrowRight className="h-3.5 w-3.5 mr-2" />
                            Mover → {APPLICATION_STATUS_LABELS[nextStatus(app.status)!]}
                          </DropdownMenuItem>
                        )}
                        {statuses.filter(s => s !== app.status && s !== nextStatus(app.status)).map(s => (
                          <DropdownMenuItem key={s} onClick={() => onUpdate({ id: app.id, status: s })}>
                            Mover → {APPLICATION_STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                          <DropdownMenuItem onClick={() => onOpenAI(app)}>
                            <Sparkles className="h-3.5 w-3.5 mr-2" />
                            Assistente IA
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenChecklist(app.id)}>
                            <ClipboardList className="h-3.5 w-3.5 mr-2" />
                            Checklist
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenResult(app.id)}>
                            <Trophy className="h-3.5 w-3.5 mr-2" />
                            Registrar resultado
                          </DropdownMenuItem>
                          {app.edital?.link && (
                            <DropdownMenuItem asChild>
                              <a href={app.edital.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                Abrir edital
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
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {app.edital?.orgao && <p>{app.edital.orgao}</p>}
                    {app.edital?.prazo && <p>Prazo: {formatDate(app.edital.prazo)}</p>}
                  </div>
                  {app.notas && <p className="text-[11px] text-muted-foreground italic line-clamp-2">{app.notas}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

export default function Editais() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { projects } = useProjects();
  const [query, setQuery] = useState("");

  const [editingEdital, setEditingEdital] = useState<Edital | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedPage, setSavedPage] = useState(1);
  const [savedFilterStatus, setSavedFilterStatus] = useState("Todos");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [resultAppId, setResultAppId] = useState<string | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiContext, setAiContext] = useState<AIContext | undefined>(undefined);

  const { editais, loading, searching, searchResult, search, saveResults, deleteEdital, updateEdital, exportCSV } = useEditais();
  const { data: applications = [], isLoading: loadingApps } = useEditalApplications();
  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();

  const handleSearch = (q?: string) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    if (q) setQuery(q);
    search(searchQuery);
  };

  const resultEditais = sortAndFilterEditais(searchResult?.editais || [], "Todos");

  const handleSaveAll = () => {
    if (resultEditais.length > 0) saveResults(resultEditais);
  };

  const savedFiltered = useMemo(() => {
    const sorted = sortAndFilterEditais(editais as Edital[], savedFilterStatus);
    if (!savedSearch.trim()) return sorted;
    const q = savedSearch.toLowerCase();
    return sorted.filter((e) => e.titulo.toLowerCase().includes(q) || (e.orgao || "").toLowerCase().includes(q));
  }, [editais, savedFilterStatus, savedSearch]);

  const totalSavedPages = Math.max(1, Math.ceil(savedFiltered.length / ITEMS_PER_PAGE));
  const clampedPage = Math.min(savedPage, totalSavedPages);
  const savedPaginated = savedFiltered.slice((clampedPage - 1) * ITEMS_PER_PAGE, clampedPage * ITEMS_PER_PAGE);

  const handleEdit = (e: Edital) => {
    setEditingEdital(e);
    setEditOpen(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("editais.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("editais.subtitle")}</p>
      </div>

      <Tabs defaultValue="buscar">
        <TabsList className="w-full overflow-x-auto flex justify-start gap-0.5 no-scrollbar">
          <TabsTrigger value="buscar" className="text-xs px-2.5 md:px-3 shrink-0">
            <Search className="h-3.5 w-3.5 mr-1" />
            {t("editais.tabSearch")}
          </TabsTrigger>
          <TabsTrigger value="salvos" className="text-xs px-2.5 md:px-3 shrink-0">
            <FileText className="h-3.5 w-3.5 mr-1" />
            {t("editais.tabSaved")} {editais.length > 0 && `(${editais.length})`}
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs px-2.5 md:px-3 shrink-0">
            <KanbanSquare className="h-3.5 w-3.5 mr-1" />
            Candidaturas {applications.length > 0 && `(${applications.length})`}
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs px-2.5 md:px-3 shrink-0">
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="metricas" className="text-xs px-2.5 md:px-3 shrink-0">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Métricas
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Buscar ── */}
        <TabsContent value="buscar" className="space-y-6 mt-4">
          <Card>
            <CardContent className="pt-5 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("editais.searchPlaceholder")}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={() => handleSearch()} disabled={searching || !query.trim()}>
                  <Search className="h-4 w-4 mr-1.5" />
                  {searching ? t("editais.searching") : t("editais.search")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("editais.searchHint")}
              </p>
            </CardContent>
          </Card>

          {/* Loading */}
          {searching && (
            <Card>
              <CardContent className="pt-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          )}

          {/* Empty state didático */}
          {!searching && !searchResult && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-base mb-1">{t("editais.emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-5">
                  {t("editais.emptyDesc")}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
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
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {!searching && searchResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("editais.results")} ({resultEditais.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resultEditais.length > 0 ? (
                  <>
                    <EditalTable items={resultEditais} t={t} />
                    <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-border/40">
                      <Button size="sm" onClick={handleSaveAll}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {t("editais.saveAll")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportCSV(resultEditais)}>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {t("editais.exportCSV")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("editais.noResults")}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Meus Editais ── */}
        <TabsContent value="salvos" className="space-y-6 mt-4">
          {/* Métricas colapsáveis */}
          {editais.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 mb-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t("editais.metrics")}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <MetricasPanel editais={editais as Edital[]} />
              </CollapsibleContent>
            </Collapsible>
          )}

          {editais.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">{t("editais.noSaved")}</p>
                <p className="text-xs mt-1">{t("editais.noSavedHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base">{t("editais.saved")} ({savedFiltered.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      value={savedSearch}
                      onChange={(e) => { setSavedSearch(e.target.value); setSavedPage(1); }}
                      placeholder={t("editais.searchSaved")}
                      className="w-56"
                    />
                    <Button size="sm" variant="outline" onClick={() => exportCSV(savedFiltered)}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      CSV
                    </Button>
                  </div>
                </div>
                {/* Status filter badges */}
                <div className="flex gap-1.5 flex-wrap pt-2">
                  {[
                    { value: "Todos", label: "Todos" },
                    { value: "Aberto", label: "Abertos" },
                    { value: "Encerrado", label: "Encerrados" },
                    { value: "Indefinido", label: "Indefinido" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSavedFilterStatus(opt.value); setSavedPage(1); }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        savedFilterStatus === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedPaginated.length > 0 ? (
                  <EditalTable items={savedPaginated} onDelete={deleteEdital} onEdit={handleEdit} onInscricao={(id) => createApplication.mutate({ edital_id: id })} t={t} />
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("editais.noResults")}</p>
                )}

                {totalSavedPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      {t("editais.showing")} {(clampedPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(clampedPage * ITEMS_PER_PAGE, savedFiltered.length)} {t("editais.of")} {savedFiltered.length}
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious onClick={() => setSavedPage((p) => Math.max(1, p - 1))} className={clampedPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                        </PaginationItem>
                        {Array.from({ length: totalSavedPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalSavedPages || Math.abs(p - clampedPage) <= 1)
                          .map((p) => (
                            <PaginationItem key={p}>
                              <PaginationLink isActive={p === clampedPage} onClick={() => setSavedPage(p)} className="cursor-pointer">
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                        <PaginationItem>
                          <PaginationNext onClick={() => setSavedPage((p) => Math.min(totalSavedPages, p + 1))} className={clampedPage >= totalSavedPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {loading && editais.length === 0 && (
            <Card>
              <CardContent className="pt-5 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Pipeline de Candidaturas ── */}
        <TabsContent value="pipeline" className="space-y-6 mt-4">
          {loadingApps ? (
            <Card>
              <CardContent className="pt-5 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ) : applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
                <KanbanSquare className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma candidatura ativa</p>
                <p className="text-xs mt-1 max-w-md">
                  Use o botão <ClipboardList className="inline h-3 w-3" /> na aba "Meus Editais" para iniciar uma candidatura e acompanhar o progresso aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <PipelineTab
              applications={applications}
              onUpdate={(p) => updateApplication.mutate(p)}
              onDelete={(id) => deleteApplication.mutate(id)}
              onOpenChecklist={(id) => setSelectedAppId(id)}
              onOpenResult={(id) => setResultAppId(id)}
              onOpenAI={(app) => {
                setAiContext({
                  editalTitle: app.edital?.titulo || undefined,
                  editalType: app.edital?.area || undefined,
                  projectId: app.project_id || undefined,
                  applicationId: app.id,
                });
                setAiSheetOpen(true);
              }}
              projects={projects.map(p => ({ id: p.id, name: p.name }))}
              t={t}
            />
          )}
        </TabsContent>

        {/* ── Tab: Documentos ── */}
        <TabsContent value="documentos" className="space-y-6 mt-4">
          <EditalDocumentsBank />
        </TabsContent>

        {/* ── Tab: Métricas ── */}
        <TabsContent value="metricas" className="space-y-6 mt-4">
          <EditalMetricsDashboard applications={applications} />
        </TabsContent>
      </Tabs>

      {/* FAB — Assistente IA */}
      <Button
        onClick={() => { setAiContext(undefined); setAiSheetOpen(true); }}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-12 w-12 rounded-full shadow-lg z-40"
        size="icon"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      {/* AI Sheet */}
      <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Assistente IA para Editais
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <EditalAIAssistant
              projects={projects.map(p => ({ id: p.id, name: p.name }))}
              context={aiContext}
            />
          </div>
        </SheetContent>
      </Sheet>

      <EditEditalDialog
        edital={editingEdital}
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingEdital(null); }}
        onSave={updateEdital}
        t={t}
      />

      {/* Checklist dialog */}
      <Dialog open={!!selectedAppId} onOpenChange={(o) => { if (!o) setSelectedAppId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Checklist: {applications.find(a => a.id === selectedAppId)?.edital?.titulo || "Candidatura"}
            </DialogTitle>
          </DialogHeader>
          {selectedAppId && (() => {
            const app = applications.find(a => a.id === selectedAppId);
            return (
              <ApplicationChecklist
                applicationId={selectedAppId}
                editalTitle={app?.edital?.titulo}
                projectId={app?.project_id || undefined}
                projects={projects.map(p => ({ id: p.id, name: p.name }))}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Result modal */}
      {resultAppId && (() => {
        const app = applications.find(a => a.id === resultAppId);
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
