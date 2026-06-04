import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Store, Plus, CheckCircle2, XCircle, Pencil, Trash2, Loader2,
  ChevronDown, Globe, Phone, Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPECIALTY_OPTIONS } from "@/constants/specialtyOptions";
import { BRAZIL_STATES } from "@/constants/brazilStates";

interface CuratedProvider {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  portfolio_url: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  state: string;
  genres: string[];
  avatar_url: string;
  status: "pending_review" | "approved" | "rejected";
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<CuratedProvider["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "Pendente",  variant: "secondary" },
  approved:       { label: "Aprovado",  variant: "default" },
  rejected:       { label: "Rejeitado", variant: "destructive" },
};

const EMPTY_FORM: Omit<CuratedProvider, "id" | "created_at" | "updated_at"> = {
  name: "", specialty: "", bio: "", portfolio_url: "",
  contact_email: "", contact_phone: "", city: "", state: "",
  genres: [], avatar_url: "", status: "pending_review", notes: "",
};

function ProviderForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [genresRaw, setGenresRaw] = useState(initial.genres.join(", "));
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY_FORM, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.specialty.trim()) {
      toast.error("Nome e especialidade são obrigatórios.");
      return;
    }
    setSaving(true);
    await onSave({
      ...form,
      genres: genresRaw.split(",").map((g) => g.trim()).filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
        </div>
        <div className="space-y-1">
          <Label>Especialidade *</Label>
          <Select value={form.specialty} onValueChange={(v) => set("specialty", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {SPECIALTY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Bio</Label>
        <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={3} placeholder="Breve descrição profissional..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>E-mail de contato</Label>
          <Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="pro@exemplo.com" />
        </div>
        <div className="space-y-1">
          <Label>Telefone / WhatsApp</Label>
          <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="(11) 99999-9999" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Cidade</Label>
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="São Paulo" />
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={form.state || ""} onValueChange={(v) => set("state", v)}>
            <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>
              {BRAZIL_STATES.map((s) => <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Gêneros musicais <span className="text-muted-foreground text-xs">(separados por vírgula)</span></Label>
        <Input value={genresRaw} onChange={(e) => setGenresRaw(e.target.value)} placeholder="Rock, MPB, Eletrônico" />
      </div>

      <div className="space-y-1">
        <Label>URL do portfólio</Label>
        <Input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://..." />
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => set("status", v as CuratedProvider["status"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_review">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Notas internas</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Observações para a equipe..." />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminMarketplace() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [providers, setProviders] = useState<CuratedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CuratedProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CuratedProvider | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("marketplace_curated_providers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar: " + error.message);
    setProviders((data as CuratedProvider[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchProviders(); }, [isAdmin]);

  const changeStatus = async (id: string, status: CuratedProvider["status"]) => {
    setActioning(id);
    const { error } = await (supabase as any)
      .from("marketplace_curated_providers")
      .update({ status })
      .eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success(status === "approved" ? "Profissional aprovado." : "Profissional rejeitado.");
      await fetchProviders();
    }
    setActioning(null);
  };

  const handleSave = async (data: typeof EMPTY_FORM) => {
    if (editTarget) {
      const { error } = await (supabase as any)
        .from("marketplace_curated_providers")
        .update(data)
        .eq("id", editTarget.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("Profissional atualizado.");
    } else {
      const { error } = await (supabase as any)
        .from("marketplace_curated_providers")
        .insert(data);
      if (error) { toast.error("Erro ao criar: " + error.message); return; }
      toast.success("Profissional adicionado.");
    }
    setFormOpen(false);
    setEditTarget(null);
    await fetchProviders();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any)
      .from("marketplace_curated_providers")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Removido."); await fetchProviders(); }
    setDeleteTarget(null);
  };

  if (adminLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const counts = {
    pending_review: providers.filter((p) => p.status === "pending_review").length,
    approved: providers.filter((p) => p.status === "approved").length,
    rejected: providers.filter((p) => p.status === "rejected").length,
    all: providers.length,
  };

  const visible = tab === "all" ? providers : providers.filter((p) => p.status === tab);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6" /> Marketplace — Curated Providers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie profissionais curados que aparecem no marketplace para todos os usuários.
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending_review">
            Pendentes {counts.pending_review > 0 && <Badge variant="secondary" className="ml-1.5 h-5 text-xs">{counts.pending_review}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Store className="h-10 w-10 mx-auto opacity-30 mb-2" />
                <p className="text-sm">Nenhum profissional nesta categoria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{p.name}</span>
                          <Badge variant="outline" className="text-xs">{p.specialty}</Badge>
                          <Badge variant={STATUS_BADGE[p.status].variant} className="text-xs">
                            {STATUS_BADGE[p.status].label}
                          </Badge>
                        </div>
                        {p.bio && <p className="text-sm text-muted-foreground line-clamp-2">{p.bio}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {(p.city || p.state) && <span>{[p.city, p.state].filter(Boolean).join(", ")}</span>}
                          {p.contact_email && (
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.contact_email}</span>
                          )}
                          {p.contact_phone && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.contact_phone}</span>
                          )}
                          {p.portfolio_url && (
                            <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                              <Globe className="h-3 w-3" /> Portfólio
                            </a>
                          )}
                        </div>
                        {p.genres.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {p.genres.map((g) => <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>)}
                          </div>
                        )}
                        {p.notes && <p className="text-xs text-muted-foreground italic">Nota: {p.notes}</p>}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {p.status === "pending_review" && (
                          <>
                            <Button
                              size="sm" variant="default" className="gap-1.5 text-xs"
                              disabled={actioning === p.id}
                              onClick={() => changeStatus(p.id, "approved")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                            </Button>
                            <Button
                              size="sm" variant="destructive" className="gap-1.5 text-xs"
                              disabled={actioning === p.id}
                              onClick={() => changeStatus(p.id, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Rejeitar
                            </Button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <Button
                            size="sm" variant="outline" className="gap-1.5 text-xs"
                            disabled={actioning === p.id}
                            onClick={() => changeStatus(p.id, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Revogar
                          </Button>
                        )}
                        {p.status === "rejected" && (
                          <Button
                            size="sm" variant="outline" className="gap-1.5 text-xs"
                            disabled={actioning === p.id}
                            onClick={() => changeStatus(p.id, "approved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" className="gap-1.5 text-xs"
                          onClick={() => { setEditTarget(p); setFormOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="gap-1.5 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar profissional" : "Adicionar profissional curado"}</DialogTitle>
          </DialogHeader>
          <ProviderForm
            initial={editTarget ? {
              name: editTarget.name, specialty: editTarget.specialty, bio: editTarget.bio,
              portfolio_url: editTarget.portfolio_url, contact_email: editTarget.contact_email,
              contact_phone: editTarget.contact_phone, city: editTarget.city, state: editTarget.state,
              genres: editTarget.genres, avatar_url: editTarget.avatar_url,
              status: editTarget.status, notes: editTarget.notes,
            } : EMPTY_FORM}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditTarget(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O profissional será removido do marketplace imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
