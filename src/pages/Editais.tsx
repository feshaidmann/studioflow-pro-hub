import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Save, Trash2, ExternalLink, FileText, Pencil, Info, BarChart3, ClipboardList, Sparkles, ChevronDown } from "lucide-react";
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
import { useEditais, type Edital } from "@/hooks/useEditais";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";

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

function EditalTable({
  items, onDelete, onEdit, onInscricao, t,
}: {
  items: Edital[];
  onDelete?: (id: string) => void;
  onEdit?: (e: Edital) => void;
  onInscricao?: (id: string) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
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

  const { editais, loading, searching, searchResult, search, saveResults, deleteEdital, updateEdital, exportCSV } = useEditais();

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
        <TabsList>
          <TabsTrigger value="buscar">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            {t("editais.tabSearch")}
          </TabsTrigger>
          <TabsTrigger value="salvos">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            {t("editais.tabSaved")} {editais.length > 0 && `(${editais.length})`}
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
                  <EditalTable items={savedPaginated} onDelete={deleteEdital} onEdit={handleEdit} onInscricao={(id) => navigate(`/editais/inscricao/${id}`)} t={t} />
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
      </Tabs>

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
