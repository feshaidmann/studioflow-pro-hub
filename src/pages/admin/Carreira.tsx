import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Shield, ArrowLeft, RefreshCw, Trash2, ExternalLink, Search,
  AlertTriangle, CheckCircle2, HelpCircle, Eye, Edit3, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LinkStatus = "ok" | "broken" | "unknown" | null;

interface Edital {
  id: string;
  titulo: string;
  orgao: string | null;
  estado: string | null;
  tipo: string | null;
  link: string | null;
  link_status: LinkStatus;
  link_checked_at: string | null;
  prazo: string | null;
  valor: string | null;
  resumo: string | null;
  status: string | null;
}

interface Palco {
  id: string;
  nome: string;
  organizador: string | null;
  estado: string | null;
  tipo_palco: string | null;
  link: string | null;
  link_status: LinkStatus;
  link_checked_at: string | null;
  prazo: string | null;
  ativo: boolean;
  resumo: string | null;
}

interface CorpusEntry {
  id: string;
  edital_title: string | null;
  edital_id: string | null;
  resumo: string | null;
  valor: string | null;
  publico_alvo: string | null;
  documentos: unknown;
  prazos: unknown;
  source: string;
  created_at: string;
  reviewed_at: string | null;
  dismissed_at: string | null;
  input_excerpt: string | null;
}

function statusBadge(s: LinkStatus) {
  if (s === "ok") return <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50"><CheckCircle2 className="h-3 w-3 mr-1" />ok</Badge>;
  if (s === "broken") return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10"><AlertTriangle className="h-3 w-3 mr-1" />broken</Badge>;
  return <Badge variant="outline" className="text-muted-foreground"><HelpCircle className="h-3 w-3 mr-1" />unknown</Badge>;
}

export default function AdminCarreira() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [tab, setTab] = useState<"editais" | "palcos" | "descobertos">("editais");

  const [editais, setEditais] = useState<Edital[]>([]);
  const [palcos, setPalcos] = useState<Palco[]>([]);
  const [corpus, setCorpus] = useState<CorpusEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "broken" | "unknown" | "no-link">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Edital | Palco | null>(null);
  const [editKind, setEditKind] = useState<"edital" | "palco">("edital");
  const [viewCorpus, setViewCorpus] = useState<CorpusEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; kind: "edital" | "palco" } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: ed }, { data: pa }, { data: co }] = await Promise.all([
        supabase.from("editais").select("id,titulo,orgao,estado,tipo,link,link_status,link_checked_at,prazo,valor,resumo,status").order("created_at", { ascending: false }),
        supabase.from("palcos_curados").select("id,nome,organizador,estado,tipo_palco,link,link_status,link_checked_at,prazo,ativo,resumo").order("created_at", { ascending: false }),
        supabase.from("edital_analyses_corpus").select("id,edital_title,edital_id,resumo,valor,publico_alvo,documentos,prazos,source,created_at,reviewed_at,dismissed_at,input_excerpt").order("created_at", { ascending: false }).limit(200),
      ]);
      setEditais((ed as Edital[]) || []);
      setPalcos((pa as Palco[]) || []);
      setCorpus((co as CorpusEntry[]) || []);
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  if (adminLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground animate-pulse">Verificando permissões...</div>;
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const currentList = tab === "editais" ? editais : tab === "palcos" ? palcos : [];

  const filtered = useMemo(() => {
    if (tab === "descobertos") return corpus;
    const q = search.trim().toLowerCase();
    return (currentList as (Edital | Palco)[]).filter((r) => {
      const name = "titulo" in r ? r.titulo : r.nome;
      if (q && !(name?.toLowerCase().includes(q))) return false;
      const ls = r.link_status;
      if (filterStatus === "no-link") return !r.link || r.link.trim() === "";
      if (filterStatus !== "all" && ls !== filterStatus) return false;
      return true;
    });
  }, [tab, currentList, corpus, search, filterStatus]);

  const kpis = useMemo(() => {
    const list = tab === "editais" ? editais : palcos;
    return {
      total: list.length,
      ok: list.filter((r) => r.link_status === "ok").length,
      broken: list.filter((r) => r.link_status === "broken").length,
      unknown: list.filter((r) => r.link_status === "unknown").length,
      noLink: list.filter((r) => !r.link || r.link.trim() === "").length,
    };
  }, [tab, editais, palcos]);

  async function revalidate(id: string, kind: "edital" | "palco") {
    const table = kind === "edital" ? "editais" : "palcos_curados";
    const t = toast.loading("Revalidando link...");
    try {
      const { data, error } = await supabase.functions.invoke("check-opportunity-links", {
        body: { id, table },
      });
      if (error) throw error;
      toast.success(`Link: ${data?.status ?? "verificado"}`, { id: t });
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao revalidar", { id: t });
    }
  }

  async function deleteRows(ids: string[], kind: "edital" | "palco") {
    const table = kind === "edital" ? "editais" : "palcos_curados";
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} item(ns) removido(s)`);
    setSelected(new Set());
    setConfirmDelete(null);
    await fetchAll();
  }

  async function saveEdit() {
    if (!editing) return;
    const table = editKind === "edital" ? "editais" : "palcos_curados";
    const { id, ...patch } = editing as any;
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditing(null);
    await fetchAll();
  }

  async function dismissCorpus(id: string) {
    const { error } = await supabase.from("edital_analyses_corpus").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Descartado");
    await fetchAll();
  }
  async function markReviewed(id: string) {
    const { error } = await supabase.from("edital_analyses_corpus").update({ reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marcado como revisado");
    await fetchAll();
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r: any) => r.id)));
  };

  const currentKind: "edital" | "palco" = tab === "editais" ? "edital" : "palco";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Curadoria de Carreira</h1>
            <p className="text-xs text-muted-foreground">Editais, palcos e análises descobertas por usuários</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {tab !== "descobertos" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", v: kpis.total, c: "text-foreground" },
            { label: "OK", v: kpis.ok, c: "text-emerald-600" },
            { label: "Broken", v: kpis.broken, c: "text-destructive" },
            { label: "Unknown", v: kpis.unknown, c: "text-muted-foreground" },
            { label: "Sem link", v: kpis.noLink, c: "text-warning" },
          ].map((k) => (
            <Card key={k.label}><CardContent className="p-3">
              <p className={`text-2xl font-bold ${k.c}`}>{k.v}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSelected(new Set()); setSearch(""); setFilterStatus("all"); }}>
        <TabsList>
          <TabsTrigger value="editais">Editais ({editais.length})</TabsTrigger>
          <TabsTrigger value="palcos">Palcos ({palcos.length})</TabsTrigger>
          <TabsTrigger value="descobertos">Descobertos ({corpus.filter(c => !c.reviewed_at && !c.dismissed_at).length})</TabsTrigger>
        </TabsList>

        {(tab === "editais" || tab === "palcos") && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="broken">Broken</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="no-link">Sem link</SelectItem>
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete({ ids: [...selected], kind: currentKind })} className="gap-2">
                <Trash2 className="h-4 w-4" /> Apagar {selected.size}
              </Button>
            )}
          </div>
        )}

        <TabsContent value="editais" className="mt-4">
          <OpportunitiesTable
            rows={filtered as Edital[]}
            kind="edital"
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            onEdit={(r) => { setEditing(r); setEditKind("edital"); }}
            onRevalidate={(id) => revalidate(id, "edital")}
            onDelete={(id) => setConfirmDelete({ ids: [id], kind: "edital" })}
          />
        </TabsContent>

        <TabsContent value="palcos" className="mt-4">
          <OpportunitiesTable
            rows={filtered as Palco[]}
            kind="palco"
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            onEdit={(r) => { setEditing(r); setEditKind("palco"); }}
            onRevalidate={(id) => revalidate(id, "palco")}
            onDelete={(id) => setConfirmDelete({ ids: [id], kind: "palco" })}
          />
        </TabsContent>

        <TabsContent value="descobertos" className="mt-4">
          <Card><CardContent className="p-0">
            <div className="divide-y">
              {corpus.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma análise registrada ainda</div>}
              {corpus.map((c) => (
                <div key={c.id} className={`p-4 ${c.dismissed_at ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{c.edital_title || "(sem título informado)"}</p>
                        {c.edital_id && <Badge variant="outline" className="text-[10px]">já na base</Badge>}
                        {c.reviewed_at && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">revisado</Badge>}
                        {c.dismissed_at && <Badge variant="outline" className="text-[10px]">descartado</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.resumo || c.input_excerpt || "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(c.created_at).toLocaleString("pt-BR")} · {c.source}
                        {c.valor && ` · ${c.valor}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewCorpus(c)}><Eye className="h-4 w-4" /></Button>
                      {!c.reviewed_at && !c.dismissed_at && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => markReviewed(c.id)} title="Marcar revisado"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => dismissCorpus(c.id)} title="Descartar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Sheet de edição */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar {editKind === "edital" ? "edital" : "palco"}</SheetTitle>
            <SheetDescription>Atenção: editais são per-usuário; sua edição altera apenas este registro.</SheetDescription>
          </SheetHeader>
          {editing && (
            <div className="space-y-3 mt-4">
              <Field label={editKind === "edital" ? "Título" : "Nome"} value={(editing as any)[editKind === "edital" ? "titulo" : "nome"]} onChange={(v) => setEditing({ ...(editing as any), [editKind === "edital" ? "titulo" : "nome"]: v })} />
              <Field label={editKind === "edital" ? "Órgão" : "Organizador"} value={(editing as any)[editKind === "edital" ? "orgao" : "organizador"] ?? ""} onChange={(v) => setEditing({ ...(editing as any), [editKind === "edital" ? "orgao" : "organizador"]: v })} />
              <Field label="Link" value={(editing as any).link ?? ""} onChange={(v) => setEditing({ ...(editing as any), link: v })} />
              <Field label="Estado (UF)" value={(editing as any).estado ?? ""} onChange={(v) => setEditing({ ...(editing as any), estado: v })} />
              <Field label="Prazo (YYYY-MM-DD)" value={(editing as any).prazo ?? ""} onChange={(v) => setEditing({ ...(editing as any), prazo: v || null })} />
              {editKind === "edital" && (
                <Field label="Valor" value={(editing as any).valor ?? ""} onChange={(v) => setEditing({ ...(editing as any), valor: v })} />
              )}
              <div className="space-y-1">
                <Label className="text-xs">Resumo</Label>
                <Textarea rows={4} value={(editing as any).resumo ?? ""} onChange={(e) => setEditing({ ...(editing as any), resumo: e.target.value })} />
              </div>
            </div>
          )}
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet de detalhes do corpus */}
      <Sheet open={!!viewCorpus} onOpenChange={(o) => !o && setViewCorpus(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Análise descoberta</SheetTitle>
            <SheetDescription>{viewCorpus?.edital_title || "(sem título)"}</SheetDescription>
          </SheetHeader>
          {viewCorpus && (
            <ScrollArea className="mt-4 max-h-[70vh]">
              <div className="space-y-3 pr-3 text-sm">
                <KV k="Resumo" v={viewCorpus.resumo} />
                <KV k="Valor" v={viewCorpus.valor} />
                <KV k="Público-alvo" v={viewCorpus.publico_alvo} />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Prazos</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(viewCorpus.prazos, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Documentos</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(viewCorpus.documentos, null, 2)}</pre>
                </div>
                <KV k="Trecho do input" v={viewCorpus.input_excerpt} />
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {confirmDelete?.ids.length} item(ns)?</AlertDialogTitle>
            <AlertDialogDescription>
              Ação irreversível. Inscrições vinculadas (se houver) não são apagadas, mas perdem a referência ao edital.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteRows(confirmDelete.ids, confirmDelete.kind)} className="bg-destructive hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function KV({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{k}</p>
      <p className="text-sm whitespace-pre-wrap">{v}</p>
    </div>
  );
}

function OpportunitiesTable<T extends Edital | Palco>({
  rows, kind, selected, onToggle, onToggleAll, onEdit, onRevalidate, onDelete,
}: {
  rows: T[]; kind: "edital" | "palco";
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (r: T) => void;
  onRevalidate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum resultado</CardContent></Card>;
  }
  return (
    <Card><CardContent className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-3 w-8"><Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={onToggleAll} /></th>
              <th className="p-3">Título</th>
              <th className="p-3">Link</th>
              <th className="p-3">Status</th>
              <th className="p-3">Verificado</th>
              <th className="p-3">Prazo</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const name = kind === "edital" ? r.titulo : r.nome;
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => onToggle(r.id)} /></td>
                  <td className="p-3 max-w-xs">
                    <p className="font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{kind === "edital" ? r.orgao : r.organizador} {r.estado && `· ${r.estado}`}</p>
                  </td>
                  <td className="p-3 max-w-[180px]">
                    {r.link ? (
                      <a href={r.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate flex items-center gap-1">
                        {r.link.replace(/^https?:\/\//, "").slice(0, 30)} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground italic">sem link</span>}
                  </td>
                  <td className="p-3">{statusBadge(r.link_status)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.link_checked_at ? new Date(r.link_checked_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3 text-xs">{r.prazo ? new Date(r.prazo).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onRevalidate(r.id)} title="Revalidar"><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onEdit(r)} title="Editar"><Edit3 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)} title="Apagar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}
