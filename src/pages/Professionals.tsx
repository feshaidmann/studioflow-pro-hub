import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  Mail, Phone, Music, Briefcase, CalendarDays, Star, Globe, MessageCircle, Search, X, Filter, Link2, Copy, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const schema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(20).default(""),
  specialty: z.string().trim().max(100).default(""),
  bio: z.string().trim().max(500).default(""),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
  active: boolean;
  allow_global_listing: boolean;
  created_at: string;
  favorite: boolean;
}

interface ProfMetrics {
  projectCount: number;
  projectNames: string[];
  avgRating: number | null;
  ratingCount: number;
  lastActivity: string | null;
  platformProjectCount: number;
  avgFee: number | null;
  avgDeliveryDays: number | null;
  collaborationHistory: Array<{
    projectName: string;
    completed: boolean;
    role: string;
    fee: number;
    deliveryStatus: string;
    joinedAt: string;
    deliveryDueDate: string | null;
  }>;
}

export default function Professionals() {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Professional | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkName, setInviteLinkName] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterAllocated, setFilterAllocated] = useState<boolean>(false);
  const [filterFavorite, setFilterFavorite] = useState<boolean>(false);

  // Table enrichment
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [allocationsMap, setAllocationsMap] = useState<Record<string, string[]>>({});
  const [invitesMap, setInvitesMap] = useState<Record<string, string>>({}); // email → status

  // Detail modal
  const [detailProf, setDetailProf] = useState<Professional | null>(null);
  const [metrics, setMetrics] = useState<ProfMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", specialty: "", bio: "", active: true },
  });

  const activeValue = watch("active");

  async function fetchProfessionals() {
    setLoadingData(true);
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .order("name");
    const profs = (data as Professional[]) ?? [];
    setProfessionals(profs);

    if (profs.length > 0) {
      // Fetch ratings for all professionals in one query
      const names = profs.map((p) => p.name);
      const { data: ratings } = await supabase
        .from("professional_ratings")
        .select("professional_name, stars")
        .eq("user_id", user?.id)
        .in("professional_name", names);

      const rMap: Record<string, { avg: number; count: number }> = {};
      (ratings as any[] ?? []).forEach((r: any) => {
        const key = r.professional_name;
        if (!rMap[key]) rMap[key] = { avg: 0, count: 0 };
        rMap[key].count++;
        rMap[key].avg += Number(r.stars);
      });
      Object.keys(rMap).forEach((k) => { rMap[k].avg = rMap[k].avg / rMap[k].count; });
      setRatingsMap(rMap);

      // Fetch active project allocations
      const { data: members } = await supabase
        .from("project_members")
        .select("name, projects:project_id(name, completed)")
        .eq("user_id", user?.id)
        .in("name", names);

      const aMap: Record<string, string[]> = {};
      (members as any[] ?? []).forEach((m: any) => {
        if (m.projects?.completed === false) {
          if (!aMap[m.name]) aMap[m.name] = [];
          const pName = m.projects?.name;
          if (pName && !aMap[m.name].includes(pName)) aMap[m.name].push(pName);
        }
      });
      setAllocationsMap(aMap);

      // Fetch platform invitation statuses for all emails
      const emails = profs.map((p) => p.email).filter(Boolean);
      const { data: invites } = await (supabase as any)
        .from("platform_invitations")
        .select("invitee_email, status")
        .eq("invited_by", user?.id)
        .in("invitee_email", emails);

      const iMap: Record<string, string> = {};
      (invites as any[] ?? []).forEach((inv: any) => {
        // Keep the most recent/relevant status per email (accepted > declined > pending)
        const prev = iMap[inv.invitee_email];
        if (!prev || inv.status === "accepted" || (inv.status === "declined" && prev === "pending")) {
          iMap[inv.invitee_email] = inv.status;
        }
      });
      setInvitesMap(iMap);
    }

    setLoadingData(false);
  }

  useEffect(() => {
    if (user) fetchProfessionals();
  }, [user]);

  async function openDetail(p: Professional) {
    setDetailProf(p);
    setMetrics(null);
    setMetricsLoading(true);

    // Fetch project_members for this professional (matched by name — current user only)
    const { data: members } = await supabase
      .from("project_members")
      .select("project_id, created_at, role, fee, delivery_status, delivery_due_date, projects:project_id(name, completed)")
      .eq("user_id", user?.id)
      .ilike("name", p.name)
      .order("created_at", { ascending: false });

    // Platform-wide project count via SECURITY DEFINER function
    const { data: platformCount } = await supabase
      .rpc("get_professional_project_count", {
        p_email: p.email ?? "",
        p_name: p.name,
      });

    // Fetch average rating from professional_ratings
    const { data: ratings } = await supabase
      .from("professional_ratings")
      .select("stars")
      .eq("user_id", user?.id)
      .ilike("professional_name", p.name);

    const ratingRows = (ratings as any[]) ?? [];
    const ratingCount = ratingRows.length;
    const avgRating = ratingCount > 0
      ? ratingRows.reduce((acc: number, r: any) => acc + Number(r.stars), 0) / ratingCount
      : null;

    const rows = (members as any[]) ?? [];
    const projectNames = rows.map((m) => m.projects?.name).filter(Boolean);
    const lastActivity = rows[0]?.created_at ?? null;
    const collaborationHistory = rows.map((m: any) => ({
      projectName: m.projects?.name || "—",
      completed: m.projects?.completed ?? false,
      role: m.role || "",
      fee: Number(m.fee) || 0,
      deliveryStatus: m.delivery_status || "",
      joinedAt: m.created_at,
      deliveryDueDate: m.delivery_due_date ?? null,
    }));

    // Calculate avg fee
    const fees = collaborationHistory.filter((h) => h.fee > 0).map((h) => h.fee);
    const avgFee = fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : null;

    // Calculate avg delivery time (days from join to delivery due date)
    const deliveryDays = collaborationHistory
      .filter((h) => h.deliveryDueDate && h.joinedAt)
      .map((h) => Math.ceil((new Date(h.deliveryDueDate!).getTime() - new Date(h.joinedAt).getTime()) / 86400000))
      .filter((d) => d > 0);
    const avgDeliveryDays = deliveryDays.length > 0 ? Math.round(deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length) : null;

    setMetrics({
      projectCount: rows.length,
      projectNames,
      avgRating,
      ratingCount,
      lastActivity,
      platformProjectCount: Number(platformCount) || 0,
      avgFee,
      avgDeliveryDays,
      collaborationHistory,
    });
    setMetricsLoading(false);
  }

  function openCreate() {
    setEditTarget(null);
    reset({ name: "", email: "", phone: "", specialty: "", bio: "", active: true });
    setDialogOpen(true);
  }

  function openEdit(p: Professional) {
    setEditTarget(p);
    reset({ name: p.name, email: p.email, phone: p.phone, specialty: p.specialty, bio: p.bio, active: p.active });
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setSubmitting(true);
    if (editTarget) {
      const { error } = await supabase.from("professionals").update({ ...values }).eq("id", editTarget.id);
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
      } else {
        toast.success("Profissional atualizado!");
        setDialogOpen(false);
        fetchProfessionals();
      }
    } else {
      const { error } = await supabase.from("professionals").insert([{
        ...values,
        name: values.name!,
        email: values.email!,
        user_id: user.id,
      }]);
      if (error) {
        toast.error("Erro ao cadastrar: " + error.message);
      } else {
        // Create platform invitation (link only — no email)
        const { data: invRow } = await (supabase as any)
          .from("platform_invitations")
          .insert({
            invited_by: user.id,
            invitee_email: values.email,
            invitee_name: values.name,
            status: "pending",
          })
          .select("id")
          .single();

        if (invRow?.id) {
          const { data: invFull } = await (supabase as any)
            .from("platform_invitations")
            .select("token")
            .eq("id", invRow.id)
            .single();

          if (invFull?.token) {
            const link = `https://jsp-flux.lovable.app/platform-invite/${invFull.token}`;
            setInviteLink(link);
            setInviteLinkName(values.name);
          }

          toast.success("Contato cadastrado! Copie o link abaixo para compartilhar.");
        } else {
          toast.success("Contato cadastrado!");
        }
        setDialogOpen(false);
        fetchProfessionals();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("professionals").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Profissional removido!");
      fetchProfessionals();
    }
    setDeleteId(null);
  }

  async function sendInviteToExisting(prof: Professional) {
    if (!user) return;
    setSendingInvite(prof.id);
    const { data: invRow } = await (supabase as any)
      .from("platform_invitations")
      .insert({
        invited_by: user.id,
        invitee_email: prof.email,
        invitee_name: prof.name,
        status: "pending",
      })
      .select("id")
      .single();

    if (invRow?.id) {
      const { data: invFull } = await (supabase as any)
        .from("platform_invitations")
        .select("token")
        .eq("id", invRow.id)
        .single();

      if (invFull?.token) {
        const link = `https://jsp-flux.lovable.app/platform-invite/${invFull.token}`;
        setInviteLink(link);
        setInviteLinkName(prof.name);
      }

      toast.success("Convite criado! Copie o link abaixo para compartilhar.");
    } else {
      toast.error("Erro ao criar convite.");
    }
    setInvitesMap((prev) => ({ ...prev, [prof.email]: "pending" }));
    setSendingInvite(null);
  }


  function copyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  const memberSince = detailProf?.created_at
    ? format(new Date(detailProf.created_at), "MMM 'de' yyyy", { locale: ptBR })
    : "—";

  // Derived filter state
  const specialties = Array.from(new Set(professionals.map((p) => p.specialty).filter(Boolean))).sort();

  const filtered = professionals.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q) && !(p.specialty ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterSpecialty !== "all" && p.specialty !== filterSpecialty) return false;
    if (filterStatus === "active" && !p.active) return false;
    if (filterStatus === "inactive" && p.active) return false;
    if (filterAllocated && (allocationsMap[p.name] ?? []).length === 0) return false;
    if (filterFavorite && !p.favorite) return false;
    return true;
  });

  const hasActiveFilters = search !== "" || filterSpecialty !== "all" || filterStatus !== "all" || filterAllocated || filterFavorite;

  async function toggleFavorite(profId: string, current: boolean) {
    const next = !current;
    await supabase.from("professionals").update({ favorite: next } as any).eq("id", profId);
    setProfessionals((prev) => prev.map((p) => p.id === profId ? { ...p, favorite: next } : p));
    toast.success(next ? "Adicionado aos favoritos ⭐" : "Removido dos favoritos");
  }

  function clearFilters() {
    setSearch("");
    setFilterSpecialty("all");
    setFilterStatus("all");
    setFilterAllocated(false);
    setFilterFavorite(false);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold neon-text flex items-center gap-2">
            <Users className="h-7 w-7" />
            Meus Contatos
          </h1>
          <p className="text-muted-foreground mt-1">Sua agenda de profissionais — músicos, engenheiros e colaboradores.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 neon-glow active:scale-95 transition-transform">
          <Plus className="h-4 w-4" /> Novo Contato
        </Button>
      </header>

      <Card className="glass-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            {/* Search + count row */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, e-mail ou especialidade..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Badge variant="secondary">{filtered.length}</Badge>
                {filtered.length !== professionals.length && <span>de {professionals.length}</span>}
                <span>contato{filtered.length !== 1 ? "s" : ""}</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="ml-1 flex items-center gap-1 text-primary hover:text-primary/80 font-medium">
                    <X className="h-3 w-3" /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Filter chips row */}
            <div className="flex flex-wrap gap-2">
              {/* Status */}
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                {(["all", "active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Inativos"}
                  </button>
                ))}
              </div>

              {/* Favoritos */}
              <button
                onClick={() => setFilterFavorite(!filterFavorite)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${filterFavorite ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Star className="h-3.5 w-3.5" />
                Favoritos
              </button>

              {/* Em projeto */}
              <button
                onClick={() => setFilterAllocated(!filterAllocated)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${filterAllocated ? "bg-primary/15 border-primary/40 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                Em projeto ativo
              </button>

              {/* Especialidade */}
              {specialties.length > 0 && (
                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className={`px-2.5 py-1 rounded-md border text-xs bg-background transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${filterSpecialty !== "all" ? "border-primary/40 text-primary font-medium" : "border-border text-muted-foreground"}`}
                >
                  <option value="all">Todas especialidades</option>
                  {specialties.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <p className="text-muted-foreground text-sm animate-pulse py-4 text-center">Carregando...</p>
          ) : professionals.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Nenhum contato cadastrado ainda. Adicione músicos e colaboradores para reutilizá-los nos seus projetos.
            </p>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">Nenhum contato encontrado com esses filtros.</p>
              <button onClick={clearFilters} className="text-primary text-sm hover:underline">Limpar filtros</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Em projeto</TableHead>
                    <TableHead>Convite</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const rating = ratingsMap[p.name];
                    const projects = allocationsMap[p.name] ?? [];
                    return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => openDetail(p)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id, p.favorite); }}
                            className="shrink-0"
                            title={p.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          >
                            <Star className={`h-3.5 w-3.5 transition-colors ${p.favorite ? "fill-chart-3 text-chart-3" : "text-muted-foreground/30 hover:text-chart-3"}`} />
                          </button>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.email}</TableCell>
                      <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                      <TableCell>{p.specialty || "—"}</TableCell>
                      <TableCell>
                        {rating
                          ? <span className="flex items-center gap-1 text-sm font-medium">
                              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                              {rating.avg.toFixed(1)}
                              <span className="text-[10px] text-muted-foreground">({rating.count})</span>
                            </span>
                          : <span className="text-muted-foreground/50 text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {projects.length > 0
                          ? <div className="flex flex-wrap gap-1">
                              {projects.slice(0, 2).map((proj, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 max-w-[120px] truncate">{proj}</Badge>
                              ))}
                              {projects.length > 2 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">+{projects.length - 2}</Badge>
                              )}
                            </div>
                          : <span className="text-muted-foreground/50 text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const status = invitesMap[p.email];
                          if (status === "accepted") return (
                            <span className="flex items-center gap-1 text-success text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aceito
                            </span>
                          );
                          if (status === "declined") return (
                            <span className="flex items-center gap-1 text-destructive text-xs font-medium">
                              <XCircle className="h-3.5 w-3.5" /> Recusado
                            </span>
                          );
                          if (status === "pending") return (
                            <span className="flex items-center gap-1 text-warning text-xs font-medium">
                              <Mail className="h-3.5 w-3.5" /> Pendente
                            </span>
                          );
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-dashed border-border/40 hover:border-primary/30"
                              disabled={sendingInvite === p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                sendInviteToExisting(p);
                              }}
                              title="Enviar convite para a plataforma"
                            >
                              <Mail className="h-3 w-3" />
                              {sendingInvite === p.id ? "Enviando..." : "Convidar"}
                            </Button>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {p.active
                          ? <span className="flex items-center gap-1 text-success text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Ativo</span>
                          : <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium"><XCircle className="h-3.5 w-3.5" /> Inativo</span>
                        }
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Modal ── */}
      <Dialog open={!!detailProf} onOpenChange={(o) => !o && setDetailProf(null)}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          {detailProf && (
            <>
              <DialogHeader>
                {/* Avatar + identity */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="h-14 w-14 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-2xl shrink-0 select-none">
                    🎵
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg leading-tight">{detailProf.name}</DialogTitle>
                    {detailProf.specialty && (
                      <p className="text-sm text-primary font-medium mt-0.5">{detailProf.specialty}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {detailProf.active
                        ? <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-4"><CheckCircle2 className="h-2.5 w-2.5 text-success" /> Ativo</Badge>
                        : <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-muted-foreground"><XCircle className="h-2.5 w-2.5" /> Inativo</Badge>
                      }
                      {detailProf.allow_global_listing && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-primary border-primary/30">
                          <Globe className="h-2.5 w-2.5" /> No banco global
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Platform metrics */}
                <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-muted/40 border border-border p-3">
                  <div className="text-center">
                    {metricsLoading
                      ? <div className="h-6 w-8 mx-auto bg-muted rounded animate-pulse" />
                      : <p className="text-xl font-bold text-primary">{metrics?.platformProjectCount ?? 0}</p>
                    }
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Na<br/>plataforma</p>
                  </div>
                  <div className="text-center border-x border-border">
                    {metricsLoading
                      ? <div className="h-6 w-8 mx-auto bg-muted rounded animate-pulse" />
                      : <p className="text-xl font-bold text-primary">{metrics?.projectCount ?? 0}</p>
                    }
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Projetos<br/>juntos</p>
                  </div>
                  <div className="text-center border-r border-border">
                    {metricsLoading
                      ? <div className="h-6 w-16 mx-auto bg-muted rounded animate-pulse" />
                      : metrics?.avgRating != null
                        ? (
                          <div className="flex items-center justify-center gap-0.5">
                            <p className="text-xl font-bold text-primary">{metrics.avgRating.toFixed(1)}</p>
                            <Star className="h-3.5 w-3.5 fill-primary text-primary mb-0.5" />
                          </div>
                        )
                        : <p className="text-xl font-bold text-muted-foreground/50">—</p>
                    }
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Nota<br/>média</p>
                    {!metricsLoading && metrics?.ratingCount != null && metrics.ratingCount > 0 && (
                      <p className="text-[8px] text-muted-foreground/60">{metrics.ratingCount}×</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{memberSince}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Na agenda<br/>desde</p>
                  </div>
                </div>

                {/* Avg fee + avg delivery */}
                {!metricsLoading && metrics && (metrics.avgFee !== null || metrics.avgDeliveryDays !== null) && (
                  <div className="flex gap-3">
                    {metrics.avgFee !== null && (
                      <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 p-2.5 text-center">
                        <p className="text-sm font-bold text-primary font-mono-nums">
                          R${metrics.avgFee.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Cachê médio</p>
                      </div>
                    )}
                    {metrics.avgDeliveryDays !== null && (
                      <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 p-2.5 text-center">
                        <p className="text-sm font-bold text-primary font-mono-nums">
                          {metrics.avgDeliveryDays}d
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Prazo médio</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Collaboration history */}
                {!metricsLoading && metrics && metrics.collaborationHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" /> Histórico de colaboração
                    </p>
                    <div className="space-y-1.5">
                      {metrics.collaborationHistory.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/30 border border-border/40">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{h.projectName}</span>
                            {h.role && <span className="text-muted-foreground"> · {h.role}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {h.fee > 0 && (
                              <span className="text-[10px] text-muted-foreground font-mono-nums">
                                R${h.fee.toLocaleString("pt-BR")}
                              </span>
                            )}
                            {h.completed ? (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5 text-success" /> Concluído
                              </Badge>
                            ) : h.deliveryStatus === "entregue" ? (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5 text-success" /> Entregue
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">
                                Em andamento
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Contact info */}
                <div className="space-y-2">
                  {detailProf.email && (
                    <a href={`mailto:${detailProf.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                      <Mail className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                      {detailProf.email}
                    </a>
                  )}
                  {detailProf.phone && (
                    <a href={`https://wa.me/${detailProf.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                      <MessageCircle className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                      {detailProf.phone}
                    </a>
                  )}
                </div>

                {/* Bio */}
                {detailProf.bio && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Star className="h-3 w-3" /> Observações
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{detailProf.bio}</p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="gap-2 mt-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => { setDetailProf(null); openEdit(detailProf); }}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" className="neon-glow gap-2" onClick={() => setDetailProf(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card border-border">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register("name")} placeholder="Nome completo" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...register("phone")} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input id="specialty" {...register("specialty")} placeholder="Ex: Guitarra, Mix" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio / Observações</Label>
              <Textarea id="bio" {...register("bio")} placeholder="Breve descrição, disponibilidade..." rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={activeValue}
                onCheckedChange={(v) => setValue("active", v)}
              />
              <Label htmlFor="active">Contato ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editTarget ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Share Invite Link Modal ── */}
      <Dialog open={!!inviteLink} onOpenChange={(o) => !o && setInviteLink(null)}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Link de convite gerado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Compartilhe este link com <span className="font-medium text-foreground">{inviteLinkName}</span> para que ela possa aceitar o convite para a plataforma.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <span className="flex-1 text-xs text-muted-foreground break-all font-mono select-all">{inviteLink}</span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={copyInviteLink}
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? "Copiado!" : "Copiar"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/60 text-center">
              O link expira em 7 dias · válido para aceitar ou recusar o convite
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInviteLink(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
