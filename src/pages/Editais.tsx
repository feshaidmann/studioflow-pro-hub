import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Save, Trash2, ExternalLink, ChevronDown, FileText, Pencil, Info, Plus, Play, Power, Rss, Star, BarChart3, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useEditais, type Edital } from "@/hooks/useEditais";
import { useFontesEditais, type FonteEditalInsert } from "@/hooks/useFontesEditais";
import { useMatchEditais, type MatchedEdital } from "@/hooks/useMatchEditais";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";

const UF_OPTIONS = [
  "Nacional", "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ",
  "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const AREA_OPTIONS = ["Música", "Audiovisual", "Ambos", "Outra"];
const STATUS_OPTIONS = ["Todos", "Aberto", "Encerrado", "Indefinido"];
const ITEMS_PER_PAGE = 20;

function statusColor(status: string) {
  if (status === "Aberto") return "bg-green-500/15 text-green-700 border-green-200";
  if (status === "Encerrado") return "bg-red-500/15 text-red-700 border-red-200";
  return "bg-muted text-muted-foreground border-border";
}

const STATUS_ORDER: Record<string, number> = { Aberto: 0, Indefinido: 1, Encerrado: 2 };

function sortAndFilterEditais(items: Edital[], filterStatus: string): Edital[] {
  let filtered = items;
  if (filterStatus && filterStatus !== "Todos") {
    filtered = items.filter((e) =>
      filterStatus === "Indefinido"
        ? e.status !== "Aberto" && e.status !== "Encerrado"
        : e.status === filterStatus
    );
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

function formatDateTime(d: string | null) {
  if (!d) return "Nunca";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return d; }
}

function EditalTable({
  items, onDelete, onEdit, onInscricao, selectable, selectedKeys, onToggle, onToggleAll, t,
}: {
  items: Edital[];
  onDelete?: (id: string) => void;
  onEdit?: (e: Edital) => void;
  onInscricao?: (id: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onToggle?: (key: string) => void;
  onToggleAll?: () => void;
  t: (k: string) => string;
}) {
  const allSelected = selectable && items.length > 0 && items.every((e) => selectedKeys?.has(e.session_key));

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
              </TableHead>
            )}
            <TableHead>Título</TableHead>
            <TableHead className="w-16">UF</TableHead>
            <TableHead>Órgão</TableHead>
            <TableHead className="w-24">Prazo</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Área</TableHead>
            <TableHead className="w-16">Link</TableHead>
            {(onDelete || onEdit || onInscricao) && <TableHead className="w-28" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e, i) => (
            <TableRow key={e.id || e.session_key || i}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={selectedKeys?.has(e.session_key) || false}
                    onCheckedChange={() => onToggle?.(e.session_key)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium max-w-[260px] truncate">
                <span className="flex items-center gap-1">
                  {e.titulo}
                  {e.inferido && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>{t("editais.inferred")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-xs">{e.estado || "—"}</TableCell>
              <TableCell className="text-xs max-w-[140px] truncate">{e.orgao || "—"}</TableCell>
              <TableCell className="text-xs tabular-nums">{formatDate(e.prazo)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
              </TableCell>
              <TableCell className="text-xs">{e.area || "—"}</TableCell>
              <TableCell>
                {e.link && e.link !== "—" ? (
                  <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : "—"}
              </TableCell>
              {(onDelete || onEdit || onInscricao) && (
                <TableCell>
                  <div className="flex gap-1">
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

// --- Fontes Tab ---
function FontesTab() {
  const { fontes, loading, testing, addFonte, deleteFonte, toggleAtivo, testFonte } = useFontesEditais();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FonteEditalInsert>({
    nome: "",
    url_base: "",
    tipo: "perplexity",
    parametros: {},
    ativo: true,
    frequencia_horas: 24,
  });

  const handleAdd = async () => {
    if (!form.nome.trim()) return;
    const params = form.tipo === "perplexity"
      ? { query: form.url_base || form.nome }
      : form.parametros;
    await addFonte({ ...form, parametros: params });
    setForm({ nome: "", url_base: "", tipo: "perplexity", parametros: {}, ativo: true, frequencia_horas: 24 });
    setShowForm(false);
  };

  const tipoLabel: Record<string, string> = { rss: "RSS", api: "API", perplexity: "Perplexity IA" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure fontes para busca automática de editais culturais.
        </p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nova fonte
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome da fonte</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Editais SP Música"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perplexity">Perplexity IA</SelectItem>
                    <SelectItem value="rss">Feed RSS</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>{form.tipo === "perplexity" ? "Consulta de busca" : "URL"}</Label>
                <Input
                  value={form.url_base}
                  onChange={(e) => setForm((p) => ({ ...p, url_base: e.target.value }))}
                  placeholder={form.tipo === "perplexity" ? "editais música São Paulo 2026" : "https://..."}
                />
              </div>
              <div>
                <Label>Frequência (horas)</Label>
                <Select value={String(form.frequencia_horas)} onValueChange={(v) => setForm((p) => ({ ...p, frequencia_horas: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">A cada 6h</SelectItem>
                    <SelectItem value="12">A cada 12h</SelectItem>
                    <SelectItem value="24">Diário</SelectItem>
                    <SelectItem value="48">A cada 2 dias</SelectItem>
                    <SelectItem value="168">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} disabled={!form.nome.trim()}>Adicionar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : fontes.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <Rss className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma fonte cadastrada.</p>
            <p className="text-xs mt-1">Adicione fontes para monitorar editais automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-28">Frequência</TableHead>
                <TableHead className="w-36">Última busca</TableHead>
                <TableHead className="w-20">Ativo</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fontes.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{tipoLabel[f.tipo] || f.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{f.frequencia_horas}h</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(f.ultima_busca)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={f.ativo}
                      onCheckedChange={(v) => toggleAtivo(f.id, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => testFonte(f.id)}
                              disabled={testing === f.id}
                            >
                              <Play className={`h-3.5 w-3.5 ${testing === f.id ? "animate-pulse" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Testar agora</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteFonte(f.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
// --- Recomendados Tab ---
function RecomendadosTab({ projects, t }: { projects: Array<{ id: string; name: string; completed: boolean }>; t: (k: string) => string }) {
  const { matches, loading, fetchMatches } = useMatchEditais();
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    if (selectedProject) fetchMatches(selectedProject);
  }, [selectedProject, fetchMatches]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Selecione um projeto para ver editais recomendados com base no perfil cultural.
        </p>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Selecione um projeto" />
          </SelectTrigger>
          <SelectContent>
            {projects.filter((p) => !p.completed).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProject && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <Star className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Selecione um projeto para ver recomendações.</p>
            <p className="text-xs mt-1">Configure o perfil cultural do projeto na aba Resumo para melhores resultados.</p>
          </CardContent>
        </Card>
      )}

      {selectedProject && loading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {selectedProject && !loading && matches.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma recomendação encontrada.</p>
            <p className="text-xs mt-1">Salve editais via busca ou fontes automáticas e configure o perfil cultural do projeto.</p>
          </CardContent>
        </Card>
      )}

      {selectedProject && !loading && matches.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="w-16">UF</TableHead>
                <TableHead>Órgão</TableHead>
                <TableHead className="w-24">Prazo</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20">Score</TableHead>
                <TableHead className="w-16">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium max-w-[260px] truncate">{e.titulo}</TableCell>
                  <TableCell className="text-xs">{e.estado || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate">{e.orgao || "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{formatDate(e.prazo)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{e.score}pts</Badge>
                  </TableCell>
                  <TableCell>
                    {e.link ? (
                      <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// --- Painel (Dashboard) Tab ---
function PainelTab({ editais }: { editais: Edital[] }) {
  const porMes = useMemo(() => {
    const map: Record<string, number> = {};
    editais.forEach((e) => {
      const d = e.created_at ? new Date(e.created_at) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([mes, total]) => ({ mes, total }));
  }, [editais]);

  const porArea = useMemo(() => {
    const map: Record<string, number> = {};
    editais.forEach((e) => { const a = e.area || "Indefinido"; map[a] = (map[a] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [editais]);

  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    editais.forEach((e) => { const s = e.status || "Indefinido"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [editais]);

  const topOrgaos = useMemo(() => {
    const map: Record<string, number> = {};
    editais.forEach((e) => { if (e.orgao) map[e.orgao] = (map[e.orgao] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [editais]);

  const totalInscritos = editais.filter((e) => (e as any).inscrito).length;
  const totalAbertos = editais.filter((e) => e.status === "Aberto").length;

  const statusColors: Record<string, string> = {
    Aberto: "bg-green-500",
    Encerrado: "bg-red-400",
    Indefinido: "bg-muted-foreground/40",
  };

  const areaColors = ["bg-primary", "bg-blue-400", "bg-amber-500", "bg-emerald-500", "bg-purple-400"];

  if (editais.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhum edital salvo ainda.</p>
          <p className="text-xs mt-1">Salve editais pela aba de busca para visualizar métricas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
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
            <p className="text-2xl font-bold">{porArea.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Áreas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editais por mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Editais por mês</CardTitle>
          </CardHeader>
          <CardContent>
            {porMes.length > 0 ? (
              <div className="space-y-1.5">
                {porMes.map(({ mes, total }) => {
                  const max = Math.max(...porMes.map((m) => m.total));
                  return (
                    <div key={mes} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-muted-foreground tabular-nums">{mes}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(total / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right tabular-nums font-medium">{total}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Por status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {porStatus.map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <div className={`h-3 w-3 rounded-full ${statusColors[status] || "bg-muted-foreground/40"}`} />
                  <span className="flex-1">{status}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Por área */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por área</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {porArea.map(([area, count], i) => (
                <div key={area} className="flex items-center gap-2 text-sm">
                  <div className={`h-3 w-3 rounded-full ${areaColors[i % areaColors.length]}`} />
                  <span className="flex-1 truncate">{area}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top órgãos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 5 órgãos</CardTitle>
          </CardHeader>
          <CardContent>
            {topOrgaos.length > 0 ? (
              <div className="space-y-1.5">
                {topOrgaos.map(([orgao, count]) => {
                  const max = topOrgaos[0][1] as number;
                  return (
                    <div key={orgao} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate text-muted-foreground">{orgao}</span>
                      <div className="w-24 bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-accent-foreground/20 rounded-full"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-5 text-right tabular-nums font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Editais() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { projects } = useProjects();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState("");
  const [filterUF, setFilterUF] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editingEdital, setEditingEdital] = useState<Edital | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedPage, setSavedPage] = useState(1);

  const { editais, loading, searching, searchResult, search, saveResults, deleteEdital, updateEdital, exportCSV } = useEditais();

  const handleSearch = () => {
    if (!query.trim()) return;
    setSelectedKeys(new Set());
    const srcList = sources.split("\n").map(s => s.trim()).filter(Boolean);
    let fullQuery = query.trim();
    if (filterUF) fullQuery += ` em ${filterUF}`;
    if (filterArea) fullQuery += ` na área de ${filterArea}`;
    search(fullQuery, srcList.length > 0 ? srcList : undefined, linkedProjectId || undefined);
  };

  const resultEditais = sortAndFilterEditais(searchResult?.editais || [], filterStatus);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedKeys.size === resultEditais.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(resultEditais.map((e) => e.session_key)));
    }
  };

  const handleSaveSelected = () => {
    const items = resultEditais.filter((e) => selectedKeys.has(e.session_key));
    if (items.length > 0) saveResults(items, linkedProjectId);
  };

  const handleSaveAll = () => {
    saveResults(resultEditais, linkedProjectId);
  };

  const savedFiltered = useMemo(() => {
    const sorted = sortAndFilterEditais(editais as Edital[], filterStatus);
    if (!savedSearch.trim()) return sorted;
    const q = savedSearch.toLowerCase();
    return sorted.filter((e) => e.titulo.toLowerCase().includes(q) || (e.orgao || "").toLowerCase().includes(q));
  }, [editais, filterStatus, savedSearch]);

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

      <Tabs defaultValue="busca">
        <TabsList>
          <TabsTrigger value="busca">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Busca
          </TabsTrigger>
          <TabsTrigger value="fontes">
            <Rss className="h-3.5 w-3.5 mr-1.5" />
            Fontes automáticas
          </TabsTrigger>
          <TabsTrigger value="recomendados">
            <Star className="h-3.5 w-3.5 mr-1.5" />
            Recomendados
          </TabsTrigger>
          <TabsTrigger value="painel">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Painel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="busca" className="space-y-6 mt-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("editais.searchPlaceholder")}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !query.trim()}>
                  <Search className="h-4 w-4 mr-1.5" />
                  {searching ? t("editais.searching") : t("editais.search")}
                </Button>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                    <ChevronDown className="h-3 w-3" />
                    {t("editais.additionalSources")}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <Textarea
                    value={sources}
                    onChange={(e) => setSources(e.target.value)}
                    placeholder={t("editais.sourcesPlaceholder")}
                    rows={3}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Select value={filterUF} onValueChange={setFilterUF}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {UF_OPTIONS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterArea} onValueChange={setFilterArea}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Área" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {AREA_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Results */}
          {searching && (
            <Card>
              <CardContent className="pt-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          )}

          {!searching && !searchResult && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">{t("editais.emptyState")}</p>
              </CardContent>
            </Card>
          )}

          {!searching && searchResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("editais.results")} ({resultEditais.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resultEditais.length > 0 ? (
                  <>
                    <EditalTable
                      items={resultEditais}
                      selectable
                      selectedKeys={selectedKeys}
                      onToggle={toggleKey}
                      onToggleAll={toggleAll}
                      t={t}
                    />

                    {searchResult.message && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">{t("editais.report")}</summary>
                        <pre className="mt-2 whitespace-pre-wrap bg-muted/40 rounded p-3 max-h-60 overflow-auto">
                          {searchResult.message}
                        </pre>
                      </details>
                    )}

                    <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-border/40">
                      <Select value={linkedProjectId || ""} onValueChange={(v) => setLinkedProjectId(v || null)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder={t("editais.linkProject")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("editais.noProject")}</SelectItem>
                          {projects.filter(p => !p.completed).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedKeys.size > 0 && (
                        <Button size="sm" onClick={handleSaveSelected}>
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          {t("editais.saveSelected")} ({selectedKeys.size})
                        </Button>
                      )}
                      <Button size="sm" variant={selectedKeys.size > 0 ? "outline" : "default"} onClick={handleSaveAll}>
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

          {/* Saved editais */}
          {(savedFiltered.length > 0 || savedSearch) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base">{t("editais.saved")} ({savedFiltered.length})</CardTitle>
                  <Input
                    value={savedSearch}
                    onChange={(e) => { setSavedSearch(e.target.value); setSavedPage(1); }}
                    placeholder={t("editais.searchSaved")}
                    className="w-64"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <EditalTable items={savedPaginated} onDelete={deleteEdital} onEdit={handleEdit} t={t} />

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

        <TabsContent value="fontes" className="mt-4">
          <FontesTab />
        </TabsContent>

        <TabsContent value="recomendados" className="mt-4">
          <RecomendadosTab projects={projects} t={t} />
        </TabsContent>

        <TabsContent value="painel" className="mt-4">
          <PainelTab editais={editais as Edital[]} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <EditEditalDialog
        edital={editingEdital}
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingEdital(null); }}
        onSave={updateEdital}
        t={t}
      />
    </div>
  );
}
