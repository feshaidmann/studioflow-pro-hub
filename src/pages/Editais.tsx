import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Save, Trash2, ExternalLink, FileText, Pencil, Info, BarChart3, ClipboardList, Sparkles, ChevronDown, ArrowRight, Plus, MoreHorizontal, KanbanSquare, FolderOpen, Bot, Trophy, Eye, DollarSign, Users, FileCheck, Star, AlertTriangle, Clock, Scale, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEditais, type Edital } from "@/hooks/useEditais";
import { useEditalApplications, useCreateApplication, useUpdateApplication, useDeleteApplication, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus, type EditalApplication } from "@/hooks/useEditalApplications";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import EditalDocumentsBank from "@/components/editais/EditalDocumentsBank";
import ApplicationChecklist from "@/components/editais/ApplicationChecklist";
import EditalAIAssistant, { type AIContext } from "@/components/editais/EditalAIAssistant";
import EditalResultModal from "@/components/editais/EditalResultModal";
import EditalMetricsDashboard from "@/components/editais/EditalMetricsDashboard";
import { useMatchEditais, type MatchedEdital } from "@/hooks/useMatchEditais";
import { supabase } from "@/integrations/supabase/client";
import EditalCompareDialog from "@/components/editais/EditalCompareDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";

const AREA_OPTIONS = ["Música", "Audiovisual", "Ambos", "Outra"];
const ITEMS_PER_PAGE = 20;

function statusColor(status: string) {
  if (status === "Aberto") return "bg-green-500/15 text-green-700 border-green-200";
  if (status === "Encerrado") return "bg-red-500/15 text-red-700 border-red-200";
  return "bg-muted text-muted-foreground border-border";
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const badge = (
    <Badge variant="outline" className={(statusColor(status) + " " + (className || "")).trim()}>
      {status}
    </Badge>
  );
  if (status !== "Indefinido") return badge;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild><span className="inline-flex">{badge}</span></TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          Prazo não informado pela fonte. Pode estar aberto — confira o link oficial antes de se inscrever.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  // Ordena: status (Aberto > Indefinido > Encerrado), depois prazo ASC (mais próximo primeiro),
  // editais sem prazo vão para o final dentro do mesmo bucket de status.
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
    // Datas vêm como YYYY-MM-DD (date-only) — fixamos timezone para evitar
    // off-by-one entre fusos diferentes do Brasil.
    const date = new Date(d + "T12:00:00-03:00");
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch { return d; }
}

function EditalDetailSheet({
  edital, open, onOpenChange, onDelete, onStartApplication, t,
}: {
  edital: Edital | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDelete?: (id: string) => void;
  onStartApplication?: (edital: Edital) => void;
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
            <StatusBadge status={edital.status} />
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
            {onStartApplication && edital.id && (
              <Button size="sm" variant="outline" onClick={() => { onStartApplication(edital); onOpenChange(false); }}>
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />Candidatar
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

/* ── Confirmation dialog for starting application ── */
function StartApplicationDialog({
  edital, open, onOpenChange, projects, onConfirm,
}: {
  edital: Edital | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projects: { id: string; name: string }[];
  onConfirm: (params: { edital_id: string; project_id?: string | null; notas?: string }) => void;
}) {
  const [projectId, setProjectId] = useState<string>("none");
  const [notas, setNotas] = useState("");

  if (!edital) return null;

  const handleConfirm = () => {
    onConfirm({
      edital_id: edital.id!,
      project_id: projectId !== "none" ? projectId : null,
      notas: notas.trim() || undefined,
    });
    setProjectId("none");
    setNotas("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Iniciar candidatura</DialogTitle>
          <DialogDescription className="text-sm">
            {edital.titulo}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Vincular a um projeto (opcional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nota inicial (opcional)</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex: Vi no Instagram, prazo curto" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditalTable({
  items, onDelete, onEdit, onStartApplication, onViewDetail, t, compareIds, onToggleCompare,
}: {
  items: Edital[];
  onDelete?: (id: string) => void;
  onEdit?: (e: Edital) => void;
  onStartApplication?: (e: Edital) => void;
  onViewDetail?: (e: Edital) => void;
  t: (k: string) => string;
  compareIds?: Set<string>;
  onToggleCompare?: (id: string) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-2">
        {items.map((e, i) => (
          <div key={e.id || e.session_key || i} className="rounded-lg border border-border p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onViewDetail?.(e)}>
            <div className="flex items-start justify-between gap-2">
              {onToggleCompare && e.id && (
                <div className="shrink-0 mt-0.5" onClick={(ev) => ev.stopPropagation()}>
                  <Checkbox checked={compareIds?.has(e.id) || false} onCheckedChange={() => onToggleCompare(e.id!)} />
                </div>
              )}
              <p className="text-sm font-medium leading-snug flex-1">
                {e.titulo}
                {e.inferido && <Info className="inline h-3 w-3 text-muted-foreground ml-1" />}
              </p>
              <StatusBadge status={e.status} className="shrink-0 text-[11px]" />
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
            {/* Mobile: CTA primário largo + ações secundárias no canto direito */}
            <div className="flex items-center gap-2 pt-1.5" onClick={(ev) => ev.stopPropagation()}>
              {onStartApplication && e.id && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 flex-1 text-sm font-medium"
                  onClick={() => onStartApplication(e)}
                >
                  <ClipboardList className="h-4 w-4 mr-1.5" />
                  Candidatar
                </Button>
              )}
              {(onEdit || onDelete || (e.link && e.link !== "—")) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label="Mais ações"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {e.link && e.link !== "—" && (
                      <DropdownMenuItem asChild>
                        <a href={e.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />Abrir edital
                        </a>
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(e)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && e.id && (
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(e.id!)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Remover
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
            {(onDelete || onEdit || onStartApplication) && <TableHead className="w-28" />}
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
              <TableCell><StatusBadge status={e.status} /></TableCell>
              <TableCell className="text-xs">{e.area || "—"}</TableCell>
              <TableCell onClick={(ev) => ev.stopPropagation()}>
                {e.link && e.link !== "—" ? (
                  <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /></a>
                ) : "—"}
              </TableCell>
              {(onDelete || onEdit || onStartApplication) && (
                <TableCell onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex gap-1">
                    {onStartApplication && e.id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onStartApplication(e)}>
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
    if (e) setForm({
      titulo: e.titulo, orgao: e.orgao, estado: e.estado, status: e.status, area: e.area,
      link: e.link, valor: e.valor, abertura: e.abertura, prazo: e.prazo,
      publico_alvo: e.publico_alvo, resumo: e.resumo, documentos_resumo: e.documentos_resumo,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o && edital) reset(edital); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
              <Label>Estado (UF)</Label>
              <Input value={form.estado || ""} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} placeholder="Ex: SP" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label>Área</Label>
              <Select value={form.area || ""} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Link</Label>
              <Input value={form.link || ""} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} />
            </div>
            <div>
              <Label>Valor</Label>
              <Input value={form.valor || ""} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} placeholder="Ex: R$ 50.000" />
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
          <div>
            <Label>Público-alvo</Label>
            <Input value={form.publico_alvo || ""} onChange={(e) => setForm((p) => ({ ...p, publico_alvo: e.target.value }))} placeholder="Quem pode se inscrever" />
          </div>
          <div>
            <Label>Resumo</Label>
            <Textarea rows={3} value={form.resumo || ""} onChange={(e) => setForm((p) => ({ ...p, resumo: e.target.value }))} placeholder="Descrição breve do edital" />
          </div>
          <div>
            <Label>Documentos exigidos</Label>
            <Textarea rows={2} value={form.documentos_resumo || ""} onChange={(e) => setForm((p) => ({ ...p, documentos_resumo: e.target.value }))} placeholder="Principais documentos necessários" />
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
function PipelineTab({ applications, onUpdate, onDelete, onOpenChecklist, onOpenResult, onOpenAI, onGoToInscricao, projects, t }: {
  applications: EditalApplication[];
  onUpdate: (params: { id: string; status?: ApplicationStatus; notas?: string; project_id?: string | null }) => void;
  onDelete: (id: string) => void;
  onOpenChecklist: (appId: string) => void;
  onOpenResult: (appId: string) => void;
  onOpenAI: (app: EditalApplication) => void;
  onGoToInscricao: (editalId: string) => void;
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

  const renderCardActions = (app: EditalApplication) => (
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
      <DropdownMenuItem onClick={() => onGoToInscricao(app.edital_id)}>
        <FileText className="h-3.5 w-3.5 mr-2" />
        Preencher inscrição
      </DropdownMenuItem>
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
  );

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
                          {renderCardActions(app)}
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {app.edital?.orgao && <span>{app.edital.orgao}</span>}
                        {app.edital?.prazo && <span>Prazo: {formatDate(app.edital.prazo)}</span>}
                      </div>
                      {app.notas && <p className="text-xs text-muted-foreground italic">{app.notas}</p>}
                      {/* Primary CTA based on status */}
                      {(app.status === "interesse" || app.status === "preparando") && (
                        <Button
                          size="sm"
                          variant={app.status === "interesse" ? "outline" : "default"}
                          className="h-7 text-xs w-full"
                          onClick={() => {
                            if (app.status === "interesse") {
                              onUpdate({ id: app.id, status: "preparando" });
                              onGoToInscricao(app.edital_id);
                            } else {
                              onGoToInscricao(app.edital_id);
                            }
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {app.status === "interesse" ? "Começar preparação" : "Preencher inscrição"}
                        </Button>
                      )}
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
                      {renderCardActions(app)}
                    </DropdownMenu>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {app.edital?.orgao && <p>{app.edital.orgao}</p>}
                    {app.edital?.prazo && <p>Prazo: {formatDate(app.edital.prazo)}</p>}
                  </div>
                  {app.notas && <p className="text-[11px] text-muted-foreground italic line-clamp-2">{app.notas}</p>}
                  {/* CTA: Go to inscription form */}
                  {(app.status === "interesse" || app.status === "preparando") && (
                    <Button
                      size="sm"
                      variant={app.status === "interesse" ? "outline" : "default"}
                      className="h-6 text-[11px] w-full"
                      onClick={() => {
                        if (app.status === "interesse") {
                          onUpdate({ id: app.id, status: "preparando" });
                          onGoToInscricao(app.edital_id);
                        } else {
                          onGoToInscricao(app.edital_id);
                        }
                      }}
                    >
                      <FileText className="h-2.5 w-2.5 mr-0.5" />
                      {app.status === "interesse" ? "Começar" : "Inscrição"}
                    </Button>
                  )}
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
  const isMobile = useIsMobile();

  const [editingEdital, setEditingEdital] = useState<Edital | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailEdital, setDetailEdital] = useState<Edital | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedPage, setSavedPage] = useState(1);
  const [savedFilterStatus, setSavedFilterStatus] = useState("Todos");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [resultAppId, setResultAppId] = useState<string | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiContext, setAiContext] = useState<AIContext | undefined>(undefined);
  // Confirmation dialog for candidatura
  const [confirmAppEdital, setConfirmAppEdital] = useState<Edital | null>(null);
  const [confirmAppOpen, setConfirmAppOpen] = useState(false);
  // Sub-view for "Meus Editais": 'salvos' or 'pipeline'
  const [meusView, setMeusView] = useState<"salvos" | "pipeline" | "palcos_pipeline">("salvos");
  // Recommendations
  const [recoProjectId, setRecoProjectId] = useState<string>("");
  const { matches, loading: loadingMatches, fetchMatches } = useMatchEditais();
  const { editais, loading, searching, searchResult, search, saveResults, deleteEdital, updateEdital, exportCSV } = useEditais();
  const { data: applications = [], isLoading: loadingApps } = useEditalApplications();
  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();

  // Deadline alerts
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "7days" | "30days" | "withValue">("all");
  // Compare
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check first visit for onboarding
  useEffect(() => {
    if (!loading && editais.length === 0 && applications.length === 0) {
      const seen = localStorage.getItem("sfp_editais_onboarding_seen");
      if (!seen) setShowOnboarding(true);
    }
  }, [loading, editais.length, applications.length]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("sfp_editais_onboarding_seen", "true");
  };

  // Deadline alerts computation
  const deadlineAlerts = useMemo(() => {
    const now = new Date();
    const alerts: { id: string; titulo: string; prazo: string; daysLeft: number; source: "edital" | "application" }[] = [];

    editais.forEach((e) => {
      if (!e.prazo || e.status === "Encerrado") return;
      const d = new Date(e.prazo + "T23:59:59");
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 7) {
        alerts.push({ id: e.id!, titulo: e.titulo, prazo: e.prazo, daysLeft: diff, source: "edital" });
      }
    });

    applications.forEach((a) => {
      if (a.status === "resultado" || !a.edital?.prazo) return;
      const d = new Date(a.edital.prazo + "T23:59:59");
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 7) {
        if (!alerts.find((al) => al.id === a.edital_id)) {
          alerts.push({ id: a.edital_id, titulo: a.edital?.titulo || "Edital", prazo: a.edital.prazo, daysLeft: diff, source: "application" });
        }
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [editais, applications]);

  // Toggle compare selection
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const handleSearch = (q?: string) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    if (q) setQuery(q);
    search(searchQuery);
  };

  const resultEditais = sortAndFilterEditais(searchResult?.editais || [], "Todos");

  const handleSaveAll = () => {
    if (resultEditais.length > 0) {
      saveResults(resultEditais);
      toast.success("Editais salvos!", {
        action: {
          label: "Iniciar candidatura →",
          onClick: () => setMeusView("salvos"),
        },
      });
    }
  };

  const savedFiltered = useMemo(() => {
    const sorted = sortAndFilterEditais(editais as Edital[], savedFilterStatus);
    let filtered = sorted;
    if (savedSearch.trim()) {
      const q = savedSearch.toLowerCase();
      filtered = filtered.filter((e) => e.titulo.toLowerCase().includes(q) || (e.orgao || "").toLowerCase().includes(q));
    }
    // Apply deadline/value filters
    const now = new Date();
    if (deadlineFilter === "7days") {
      filtered = filtered.filter((e) => {
        if (!e.prazo) return false;
        const diff = Math.ceil((new Date(e.prazo + "T23:59:59").getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      });
    } else if (deadlineFilter === "30days") {
      filtered = filtered.filter((e) => {
        if (!e.prazo) return false;
        const diff = Math.ceil((new Date(e.prazo + "T23:59:59").getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 30;
      });
    } else if (deadlineFilter === "withValue") {
      filtered = filtered.filter((e) => e.valor && e.valor !== "" && e.valor !== "—");
    }
    return filtered;
  }, [editais, savedFilterStatus, savedSearch, deadlineFilter]);

  const totalSavedPages = Math.max(1, Math.ceil(savedFiltered.length / ITEMS_PER_PAGE));
  const clampedPage = Math.min(savedPage, totalSavedPages);
  const savedPaginated = savedFiltered.slice((clampedPage - 1) * ITEMS_PER_PAGE, clampedPage * ITEMS_PER_PAGE);

  const handleEdit = (e: Edital) => {
    setEditingEdital(e);
    setEditOpen(true);
  };

  const handleStartApplication = (edital: Edital) => {
    setConfirmAppEdital(edital);
    setConfirmAppOpen(true);
  };

  const handleConfirmApplication = (params: { edital_id: string; project_id?: string | null; notas?: string }) => {
    createApplication.mutate(params, {
      onSuccess: () => {
        toast.success("Candidatura iniciada!", {
          action: {
            label: "Ir para inscrição →",
            onClick: () => navigate(`/editais/inscricao/${params.edital_id}`),
          },
        });
      },
    });
  };

  // Fetch cultural profile for selected project
  const [recoProfile, setRecoProfile] = useState<any>(null);
  useEffect(() => {
    if (!recoProjectId) { setRecoProfile(null); return; }
    supabase.from("projects").select("perfil_cultural").eq("id", recoProjectId).single()
      .then(({ data }) => setRecoProfile(data?.perfil_cultural || null));
  }, [recoProjectId]);

  const hasCulturalProfile = recoProfile &&
    typeof recoProfile === "object" &&
    Array.isArray(recoProfile.areas) && recoProfile.areas.length > 0;

  useEffect(() => {
    if (recoProjectId && hasCulturalProfile) {
      fetchMatches(recoProjectId);
    }
  }, [recoProjectId, hasCulturalProfile, fetchMatches]);

  const projectList = projects.map(p => ({ id: p.id, name: p.name }));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Mobile sticky header (sem CTA: ação primária é a busca abaixo) */}
      <MobileStickyHeader
        title={t("editais.title")}
        subtitle={t("editais.subtitle")}
      />
      <div className="hidden md:block">
        <h1 className="text-xl font-semibold">{t("editais.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("editais.subtitle")}</p>
      </div>

      <Tabs defaultValue="buscar">
        <TabsList className="w-full overflow-x-auto flex justify-start gap-0.5 no-scrollbar">
          <TabsTrigger value="buscar" className="text-xs px-2.5 md:px-3 shrink-0">
            <Search className="h-3.5 w-3.5 mr-1" />
            {t("editais.tabSearch")}
          </TabsTrigger>
          <TabsTrigger value="meus" className="text-xs px-2.5 md:px-3 shrink-0">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Meus Editais {(editais.length + applications.length) > 0 && `(${editais.length + applications.length})`}
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs px-2.5 md:px-3 shrink-0">
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Documentos
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
                    <EditalTable items={resultEditais} onViewDetail={(e) => { setDetailEdital(e); setDetailOpen(true); }} t={t} />
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

        {/* ── Tab: Meus Editais (salvos + pipeline consolidated) ── */}
        <TabsContent value="meus" className="space-y-4 mt-4">
          {/* Onboarding walkthrough for first-time users */}
          {showOnboarding && (
            <Card className="border-primary/30 bg-primary/5 relative">
              <button onClick={dismissOnboarding} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <CardContent className="py-6 px-5">
                <h3 className="font-medium text-base mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Como usar Editais
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { step: 1, label: "Buscar", desc: "Pesquise editais abertos com IA", icon: <Search className="h-5 w-5" /> },
                    { step: 2, label: "Salvar", desc: "Guarde os que interessam na sua lista", icon: <Save className="h-5 w-5" /> },
                    { step: 3, label: "Candidatar", desc: "Inicie o acompanhamento da inscrição", icon: <ClipboardList className="h-5 w-5" /> },
                    { step: 4, label: "Inscrever", desc: "Preencha formulários com ajuda da IA", icon: <FileText className="h-5 w-5" /> },
                  ].map((s) => (
                    <div key={s.step} className="flex flex-col items-center text-center p-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                        {s.icon}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Passo {s.step}</span>
                      <span className="text-xs font-medium">{s.label}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deadline alerts banner */}
          {deadlineAlerts.length > 0 && (
            <div className={`rounded-lg border px-3 py-2.5 flex items-start gap-2.5 animate-fade-in ${
              deadlineAlerts[0].daysLeft <= 3
                ? "border-destructive/40 bg-destructive/5"
                : "border-warning/40 bg-warning/5"
            }`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                deadlineAlerts[0].daysLeft <= 3 ? "text-destructive" : "text-warning"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  {deadlineAlerts.length === 1
                    ? `1 edital vence em ${deadlineAlerts[0].daysLeft === 0 ? "hoje" : deadlineAlerts[0].daysLeft === 1 ? "amanhã" : `${deadlineAlerts[0].daysLeft} dias`}`
                    : `${deadlineAlerts.length} editais vencem nos próximos 7 dias`}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {deadlineAlerts.slice(0, 3).map((a) => (
                    <span key={a.id} className="text-[11px] text-muted-foreground">
                      <Clock className="inline h-3 w-3 mr-0.5" />
                      {a.daysLeft}d · {a.titulo.slice(0, 40)}{a.titulo.length > 40 ? "…" : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-view toggle */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setMeusView("salvos")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                meusView === "salvos"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <FileText className="inline h-3 w-3 mr-1" />
              Editais salvos ({editais.filter((e: any) => !e.tipo || e.tipo === "fomento").length})
            </button>
            <button
              onClick={() => setMeusView("pipeline")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                meusView === "pipeline"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <KanbanSquare className="inline h-3 w-3 mr-1" />
              Fomento ({applications.filter((a: any) => !a.tipo || a.tipo === "fomento").length})
            </button>
            <button
              onClick={() => setMeusView("palcos_pipeline")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                meusView === "palcos_pipeline"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <KanbanSquare className="inline h-3 w-3 mr-1" />
              Palcos ({applications.filter((a: any) => a.tipo === "palco").length})
            </button>
          </div>

          {/* Collapsible metrics */}
          {(editais.length > 0 || applications.length > 0) && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Métricas
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {editais.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Editais salvos</p>
                    <MetricasPanel editais={editais as Edital[]} />
                  </div>
                )}
                {applications.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Candidaturas ativas</p>
                    <EditalMetricsDashboard applications={applications} />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Recomendações por perfil cultural */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Recomendações para seu projeto
              </CardTitle>
              <p className="text-xs text-muted-foreground">Selecione um projeto com Perfil Cultural configurado para ver editais compatíveis.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={recoProjectId} onValueChange={setRecoProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter(p => !p.completed).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {recoProjectId && !hasCulturalProfile && (
                <div className="rounded-lg border border-border p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Este projeto ainda não tem Perfil Cultural configurado.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/projects?id=${recoProjectId}`)}>
                    Configurar Perfil Cultural →
                  </Button>
                </div>
              )}

              {recoProjectId && hasCulturalProfile && loadingMatches && (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}

              {recoProjectId && hasCulturalProfile && !loadingMatches && matches.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum edital compatível encontrado. Salve mais editais na aba "Buscar".</p>
              )}

              {recoProjectId && hasCulturalProfile && !loadingMatches && matches.length > 0 && (
                <div className="space-y-2">
                  {[...matches].sort((a, b) => b.score - a.score).slice(0, 10).map((m) => {
                    const scoreClass =
                      m.score >= 70 ? "bg-green-500/15 text-green-700 border-green-200" :
                      m.score >= 40 ? "bg-amber-500/15 text-amber-700 border-amber-200" :
                                      "bg-muted text-muted-foreground border-border";
                    const scoreLabel =
                      m.score >= 70 ? "Forte compatibilidade" :
                      m.score >= 40 ? "Compatibilidade média" : "Compatibilidade baixa";
                    return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-border p-3 space-y-1.5 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        setDetailEdital({
                          id: m.id, titulo: m.titulo, orgao: m.orgao, estado: m.estado,
                          area: m.area, status: m.status, abertura: m.abertura, prazo: m.prazo,
                          link: m.link, inferido: m.inferido, valor: m.valor || "", resumo: m.resumo || "",
                          publico_alvo: m.publico_alvo || "", documentos_resumo: "",
                        } as Edital);
                        setDetailOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug flex-1">{m.titulo}</p>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={`shrink-0 text-[11px] ${scoreClass}`}>
                                Match {m.score}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">{scoreLabel}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {/* Barra de progresso visual do match */}
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            m.score >= 70 ? "bg-green-500" :
                            m.score >= 40 ? "bg-amber-500" : "bg-muted-foreground/40"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, m.score))}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {m.orgao && <span>{m.orgao}</span>}
                        {m.estado && <span>UF: {m.estado}</span>}
                        <span>Prazo: {formatDate(m.prazo)}</span>
                        <StatusBadge status={m.status} className="text-[11px]" />
                      </div>
                      {m.valor && m.valor !== "" && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">{m.valor}</span>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sub-view: Editais salvos */}
          {meusView === "salvos" && (
            <>
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
                      <span className="text-xs text-muted-foreground self-center mx-1">·</span>
                      {[
                        { value: "all" as const, label: "Todos os prazos" },
                        { value: "7days" as const, label: "⚡ 7 dias" },
                        { value: "30days" as const, label: "📅 30 dias" },
                        { value: "withValue" as const, label: "💰 Com valor" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setDeadlineFilter(opt.value); setSavedPage(1); }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            deadlineFilter === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Compare bar */}
                    {compareIds.size > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="outline" className="text-[11px]">{compareIds.size} selecionado{compareIds.size > 1 ? "s" : ""}</Badge>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCompareOpen(true)} disabled={compareIds.size < 2}>
                          <Scale className="h-3 w-3 mr-1" />
                          Comparar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCompareIds(new Set())}>
                          Limpar
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {savedPaginated.length > 0 ? (
                      <EditalTable
                        items={savedPaginated}
                        onDelete={deleteEdital}
                        onEdit={handleEdit}
                        onStartApplication={handleStartApplication}
                        onViewDetail={(e) => { setDetailEdital(e); setDetailOpen(true); }}
                        t={t}
                        compareIds={compareIds}
                        onToggleCompare={toggleCompare}
                      />
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
            </>
          )}

          {/* Sub-view: Pipeline Fomento */}
          {meusView === "pipeline" && (
            <>
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
                    <p className="text-xs mt-2 max-w-sm">
                      Comece sua jornada em 3 passos:
                    </p>
                    <div className="flex flex-col gap-1.5 mt-3 text-xs text-left max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center font-bold shrink-0">1</span>
                        <span>Busque editais na aba "Buscar"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center font-bold shrink-0">2</span>
                        <span>Salve os que interessam</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center font-bold shrink-0">3</span>
                        <span>Clique "Candidatar" para iniciar o acompanhamento</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <PipelineTab
                  applications={applications.filter((a: any) => !a.tipo || a.tipo === "fomento")}
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
                  onGoToInscricao={(editalId) => navigate(`/editais/inscricao/${editalId}`)}
                  projects={projectList}
                  t={t}
                />
              )}
            </>
          )}
          {/* Sub-view: Pipeline Palcos */}
          {meusView === "palcos_pipeline" && (
            <>
              {loadingApps ? (
                <Card><CardContent className="pt-5 space-y-2">
                  <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
                </CardContent></Card>
              ) : applications.filter((a: any) => a.tipo === "palco").length === 0 ? (
                <Card>
                  <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
                    <KanbanSquare className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">Nenhuma candidatura de palco</p>
                    <p className="text-xs mt-2 max-w-sm">
                      Vá até <strong>Palcos &amp; Shows</strong> e clique em "Candidatar" em qualquer oportunidade.
                    </p>
                    <Button
                      size="sm" variant="outline" className="mt-3"
                      onClick={() => navigate("/palcos")}
                    >
                      Ver oportunidades de palco →
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <PipelineTab
                  applications={applications.filter((a: any) => a.tipo === "palco")}
                  onUpdate={(p) => updateApplication.mutate(p)}
                  onDelete={(id) => deleteApplication.mutate(id)}
                  onOpenChecklist={(id) => setSelectedAppId(id)}
                  onOpenResult={(id) => setResultAppId(id)}
                  onOpenAI={(app) => {
                    setAiContext({
                      editalTitle: app.edital?.titulo || undefined,
                      editalType: "Oportunidade de palco",
                      applicationId: app.id,
                    });
                    setAiSheetOpen(true);
                  }}
                  onGoToInscricao={(editalId) => navigate(`/editais/inscricao/${editalId}`)}
                  projects={projectList}
                  t={t}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* ── Tab: Documentos ── */}
        <TabsContent value="documentos" className="space-y-6 mt-4">
          <EditalDocumentsBank />
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
              projects={projectList}
              context={aiContext}
            />
          </div>
        </SheetContent>
      </Sheet>

      <EditalDetailSheet
        edital={detailEdital}
        open={detailOpen}
        onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetailEdital(null); }}
        onDelete={deleteEdital}
        onStartApplication={handleStartApplication}
        t={t}
      />

      <EditEditalDialog
        edital={editingEdital}
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingEdital(null); }}
        onSave={updateEdital}
        t={t}
      />

      {/* Start Application Confirmation Dialog */}
      <StartApplicationDialog
        edital={confirmAppEdital}
        open={confirmAppOpen}
        onOpenChange={(o) => { setConfirmAppOpen(o); if (!o) setConfirmAppEdital(null); }}
        projects={projectList.filter(p => !projects.find(pr => pr.id === p.id)?.completed)}
        onConfirm={handleConfirmApplication}
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
                projects={projectList}
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

      {/* Compare Dialog */}
      <EditalCompareDialog
        editais={editais.filter((e) => e.id && compareIds.has(e.id)) as Edital[]}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
    </div>
  );
}
