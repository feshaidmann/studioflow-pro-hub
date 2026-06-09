import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Trophy, ClipboardList, ListFilter, ExternalLink, Calendar, RotateCcw, Award, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEditais } from "@/hooks/useEditais";
import { usePalcos } from "@/hooks/usePalcos";
import {
  useEditalApplications,
  useCreateApplication,
  useUpdateApplication,
  useDeleteApplication,
  type ApplicationStatus,
  type EditalApplication,
} from "@/hooks/useEditalApplications";
import OpportunityCard from "@/components/carreira/OpportunityCard";
import OpportunityFilters, {
  DEFAULT_FILTERS,
  type CarreiraFilters,
  type DeadlineWindow,
  type StatusFiltro,
} from "@/components/carreira/OpportunityFilters";
import OpportunityDetailSheet from "@/components/carreira/OpportunityDetailSheet";
import ApplicationStatusMenu from "@/components/carreira/ApplicationStatusMenu";
import AISearchPanel from "@/components/carreira/AISearchPanel";
import AdvancedFiltersSheet from "@/components/carreira/AdvancedFiltersSheet";
import ActiveFiltersChips from "@/components/carreira/ActiveFiltersChips";
import RecommendedSection from "@/components/carreira/RecommendedSection";
import EditalResultModal from "@/components/editais/EditalResultModal";
import {
  editalToOpportunity,
  palcoToOpportunity,
  normalize,
  type Opportunity,
} from "@/components/carreira/types";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useProjects } from "@/contexts/ProjectContext";
import { trackAppEvent } from "@/lib/analytics";
import type { Edital } from "@/hooks/useEditais";
import type { PalcoCurado } from "@/hooks/usePalcos";

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso + "T12:00:00-03:00");
    return Math.round((d.getTime() - Date.now()) / 86400000);
  } catch { return null; }
}

function formatBrDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(iso + "T12:00:00-03:00"));
  } catch { return iso; }
}

const APP_STATUS_WEIGHT: Record<string, number> = {
  interesse: 0,
  preparando: 1,
  inscrito: 2,
  em_analise: 3,
};

function sessionKeyFor(nome: string, organizador: string) {
  return `${nome}_${organizador}`.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
}

function readFiltersFromURL(sp: URLSearchParams): CarreiraFilters {
  const tipo = sp.get("tipo");
  const status = sp.get("status");
  const deadline = sp.get("prazo");
  return {
    tipo: tipo === "edital" || tipo === "palco" ? tipo : "todos",
    status: (["Aberto", "Encerrado", "Indefinido", "Previsto"] as const).includes(status as any)
      ? (status as StatusFiltro)
      : "todos",
    estado: sp.get("uf") || "todos",
    query: sp.get("q") || "",
    genero: sp.get("genero") || "todos",
    hideClosed: sp.get("hideClosed") !== "0",
    deadline: (["7d", "30d", "90d"] as const).includes(deadline as any)
      ? (deadline as DeadlineWindow)
      : "todos",
  };
}

function writeFiltersToURL(f: CarreiraFilters, sp: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(sp);
  const setOrDel = (k: string, v: string, def: string) => {
    if (v && v !== def) next.set(k, v);
    else next.delete(k);
  };
  setOrDel("tipo", f.tipo, "todos");
  setOrDel("status", f.status, "todos");
  setOrDel("uf", f.estado, "todos");
  setOrDel("q", f.query, "");
  setOrDel("genero", f.genero, "todos");
  setOrDel("prazo", f.deadline, "todos");
  if (!f.hideClosed) next.set("hideClosed", "0");
  else next.delete("hideClosed");
  return next;
}

export default function Carreira() {
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { projects } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<CarreiraFilters>(() => readFiltersFromURL(searchParams));
  const [aiResults, setAiResults] = useState<Opportunity[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [tab, setTab] = useState<"descobrir" | "inscricoes">(
    searchParams.get("tab") === "inscricoes" ? "inscricoes" : "descobrir"
  );
  const [detailOp, setDetailOp] = useState<Opportunity | null>(null);
  const [interestPending, setInterestPending] = useState<string | null>(null);
  const [resultApp, setResultApp] = useState<EditalApplication | null>(null);

  const { editais, loading: loadingEditais, saveResults: saveEditais, deleteEdital } = useEditais();
  const { palcosCurados, loadingCurados, saveResults: savePalcos } = usePalcos();
  const { data: applications = [], isLoading: loadingApps, refetch: refetchApps } = useEditalApplications();
  const createApp = useCreateApplication();
  const updateApp = useUpdateApplication();
  const deleteApp = useDeleteApplication();

  // Projeto ativo: primeiro não concluído (proxy) — usado para busca IA + recomendações
  const activeProject = useMemo(() => projects.find((p) => !p.completed) || null, [projects]);

  // Persistência URL ↔ filtros + tab + op
  useEffect(() => {
    const next = writeFiltersToURL(filters, searchParams);
    if (tab === "inscricoes") next.set("tab", "inscricoes"); else next.delete("tab");
    if (detailOp) next.set("op", `${detailOp.tipo}:${detailOp.key}`); else next.delete("op");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tab, detailOp]);

  // Aviso ao chegar via URL legada (/editais, /editais/*, /palcos, /palcos/*).
  // Mostramos um toast informativo e limpamos o marcador `from=legacy` da URL,
  // mantendo o resto dos parâmetros intactos.
  useEffect(() => {
    if (searchParams.get("from") !== "legacy") return;
    const tipo = searchParams.get("tipo");
    const label = tipo === "palco" ? "palcos" : "editais";
    toast.info("Endereço atualizado", {
      description: `A página de ${label} agora faz parte da seção Carreira.`,
    });
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lista unificada
  const allOpportunities: Opportunity[] = useMemo(() => {
    const list: Opportunity[] = [
      ...editais.map(editalToOpportunity),
      ...palcosCurados.map((p) => palcoToOpportunity(p, "curated")),
      ...aiResults,
    ];
    const seen = new Set<string>();
    return list.filter((o) => {
      const k = `${o.tipo}:${o.key}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [editais, palcosCurados, aiResults]);

  // Reabrir sheet via deep-link ?op=tipo:key
  useEffect(() => {
    const opParam = searchParams.get("op");
    if (!opParam || detailOp) return;
    if (loadingEditais || loadingCurados) return;
    const found = allOpportunities.find((o) => `${o.tipo}:${o.key}` === opParam);
    if (found) {
      setDetailOp(found);
      void trackAppEvent("carreira_deep_link_opened", { opportunity_type: found.tipo });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOpportunities, loadingEditais, loadingCurados]);

  const filtered = useMemo(() => {
    const q = normalize(filters.query);
    const now = new Date();
    const deadlineLimit = (() => {
      if (filters.deadline === "todos") return null;
      const days = filters.deadline === "7d" ? 7 : filters.deadline === "30d" ? 30 : 90;
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    })();

    return allOpportunities
      .filter((o) => filters.tipo === "todos" || o.tipo === filters.tipo)
      .filter((o) => !filters.hideClosed || o.status !== "Encerrado")
      .filter((o) => filters.status === "todos" || o.status === filters.status)
      .filter((o) => {
        if (filters.estado === "todos") return true;
        return (o.estado || "").toLowerCase() === filters.estado.toLowerCase();
      })
      .filter((o) => {
        if (filters.genero === "todos") return true;
        if (o.tipo !== "palco") return true;
        const gs = (o.generos || []).map((g) => normalize(g));
        return gs.includes(normalize(filters.genero));
      })
      .filter((o) => {
        if (!deadlineLimit) return true;
        if (!o.prazo) return false;
        try {
          const d = new Date(o.prazo + "T12:00:00-03:00");
          return d >= now && d <= deadlineLimit;
        } catch { return false; }
      })
      .filter((o) => {
        if (!q) return true;
        const hay = normalize(`${o.titulo} ${o.organizador} ${o.estado || ""} ${o.resumo || ""}`);
        return hay.includes(q);
      })
      .sort((a, b) => {
        const order: Record<string, number> = { Aberto: 0, Previsto: 1, Indefinido: 2, Encerrado: 3 };
        const oa = order[a.status] ?? 2;
        const ob = order[b.status] ?? 2;
        if (oa !== ob) return oa - ob;
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      });
  }, [allOpportunities, filters]);

  const appliedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const a of applications) {
      if (a.opportunity_id) set.add(a.opportunity_id);
    }
    return set;
  }, [applications]);

  // Pipeline ordenado: status ativo primeiro, depois prazo ascendente; finais ao fim.
  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aFinal = !!a.resultado;
      const bFinal = !!b.resultado;
      if (aFinal !== bFinal) return aFinal ? 1 : -1;
      const sa = APP_STATUS_WEIGHT[a.status] ?? 9;
      const sb = APP_STATUS_WEIGHT[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      const pa = a.edital?.prazo || null;
      const pb = b.edital?.prazo || null;
      if (!pa && !pb) return 0;
      if (!pa) return 1;
      if (!pb) return -1;
      return pa.localeCompare(pb);
    });
  }, [applications]);

  const isAlreadyApplied = useCallback((op: Opportunity) => {
    if (op.editalId && appliedKeys.has(op.editalId)) return true;
    return applications.some(
      (a) => a.edital?.titulo === op.titulo && (a.edital?.orgao || "") === op.organizador,
    );
  }, [appliedKeys, applications]);

  const totalActive =
    filters.tipo !== "todos" ||
    filters.status !== "todos" ||
    filters.estado !== "todos" ||
    filters.genero !== "todos" ||
    filters.deadline !== "todos" ||
    !filters.hideClosed ||
    !!filters.query;

  // Resolve o opportunity_id (editais.id ou palcos_curados.id) e o tipo para o pipeline.
  const ensureOpportunity = useCallback(async (op: Opportunity): Promise<{ id: string; tipo: "fomento" | "palco" } | null> => {
    if (!user) return null;

    // Palco: palcos_curados.id já está em editalId (curated) ou raw.id
    if (op.tipo === "palco") {
      const palcoId = op.editalId || op.raw.id || null;
      if (palcoId) return { id: palcoId, tipo: "palco" };
      // Palco vindo da IA sem id ainda — salva primeiro
      await savePalcos([op.raw as PalcoCurado]);
      const { data } = await supabase
        .from("palcos_curados")
        .select("id")
        .eq("nome", op.titulo)
        .eq("organizador", op.organizador)
        .maybeSingle();
      return data?.id ? { id: data.id as string, tipo: "palco" } : null;
    }

    // Edital: já salvo
    if (op.editalId) return { id: op.editalId, tipo: "fomento" };

    // Edital novo (vindo da IA): salva e busca por session_key
    const key = (op.raw as Edital).session_key || sessionKeyFor(op.titulo, op.organizador);
    await saveEditais([op.raw as Edital]);
    const { data } = await supabase
      .from("editais")
      .select("id")
      .eq("session_key", key)
      .eq("user_id", user.id)
      .maybeSingle();
    return data?.id ? { id: data.id as string, tipo: "fomento" } : null;
  }, [user, saveEditais, savePalcos]);

  const handleInterest = async (op: Opportunity) => {
    if (isAlreadyApplied(op)) {
      toast.info("Esta oportunidade já está no seu pipeline.", {
        action: { label: "Ver", onClick: () => setTab("inscricoes") },
      });
      return;
    }
    setInterestPending(op.key);
    try {
      const resolved = await ensureOpportunity(op);
      if (!resolved) {
        toast.error("Não foi possível registrar interesse. Tente novamente.");
        return;
      }
      const created = await createApp.mutateAsync({ opportunity_id: resolved.id, tipo: resolved.tipo });
      await refetchApps();
      void trackAppEvent("carreira_interest_marked", {
        opportunity_type: op.tipo,
        opportunity_title: op.titulo,
        origem: op.origem,
      });
      setDetailOp(null);
      if (resolved.tipo === "fomento") {
        toast.success("Candidatura iniciada");
        navigate(`/editais/inscricao/${resolved.id}`);
      } else {
        // Palco → fluxo de proposta dedicado (EPK + pitch + contato + acompanhamento)
        toast.success("Proposta iniciada");
        if (created?.id) {
          navigate(`/palcos/proposta/${created.id}`);
        } else {
          setTab("inscricoes");
        }
      }
    } catch (e: unknown) {
      console.error("handleInterest:", e);
    } finally {
      setInterestPending(null);
    }
  };

  const handleSave = async (op: Opportunity) => {
    try {
      if (op.tipo === "edital") await saveEditais([op.raw as Edital]);
      else await savePalcos([op.raw as PalcoCurado]);
      void trackAppEvent("carreira_opportunity_saved", { opportunity_type: op.tipo });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const handleRemove = async (op: Opportunity) => {
    if (op.editalId) await deleteEdital(op.editalId);
  };

  const handleOpenDetail = (op: Opportunity) => {
    setDetailOp(op);
    void trackAppEvent("carreira_opportunity_viewed", {
      opportunity_type: op.tipo,
      opportunity_title: op.titulo,
    });
  };

  const handleAIResults = (r: Opportunity[], summary: string) => {
    setAiResults(r);
    setAiSummary(summary || "");
    void trackAppEvent("carreira_ai_search", { results_count: r.length });
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    await updateApp.mutateAsync({ id, status });
    void trackAppEvent("carreira_application_status_changed", { status });
  };

  const handleApplicationClick = (a: EditalApplication) => {
    if (a.tipo === "palco") {
      navigate(`/palcos/proposta/${a.id}`);
    } else {
      navigate(`/editais/inscricao/${a.opportunity_id}`);
    }
  };

  const loading = loadingEditais || loadingCurados;

  // Conta filtros "avançados" (vão pro Sheet) — usados só para o badge
  const advancedActiveCount =
    (filters.status !== "todos" ? 1 : 0) +
    (filters.estado !== "todos" ? 1 : 0) +
    (filters.genero !== "todos" ? 1 : 0) +
    (filters.deadline !== "todos" ? 1 : 0);

  // Chips horizontais de tipo (filtro principal — sempre visível)
  const TipoChips = (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card/60 backdrop-blur-sm p-0.5">
      {[
        { v: "todos" as const, l: "Todas" },
        { v: "edital" as const, l: "Editais" },
        { v: "palco" as const, l: "Palcos" },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => setFilters({ ...filters, tipo: o.v })}
          className={
            "text-xs px-3 py-1 rounded-full transition-colors " +
            (filters.tipo === o.v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.l}
        </button>
      ))}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4 pb-8">
      <MobileStickyHeader title="Carreira" />

      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Carreira
          </h1>
          <p className="text-sm text-muted-foreground">
            Editais de fomento, festivais, showcases e residências num só lugar.
          </p>
        </div>
        <a
          href="/carreira/documentos"
          className="inline-flex items-center gap-1.5 rounded-[0.7rem] border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <FolderOpen className="h-4 w-4" />
          Documentos
        </a>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="rounded-[0.875rem]">
          <TabsTrigger value="descobrir" className="rounded-[0.7rem]">Descobrir</TabsTrigger>
          <TabsTrigger value="inscricoes" className="rounded-[0.7rem]">
            Minhas inscrições
            {applications.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{applications.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="descobrir" className="mt-4 space-y-4">
          {/* 1. Hero IA — primeira ação visível */}
          <AISearchPanel onResults={handleAIResults} projectId={activeProject?.id || null} />

          {/* 2. Resumo da IA (se houver) */}
          {aiResults.length > 0 && aiSummary && (
            <div className="rounded-[0.875rem] border border-primary/30 bg-primary/5 p-3 text-xs text-foreground inline-flex items-start gap-2 w-full">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span className="flex-1">{aiSummary}</span>
              <button
                type="button"
                onClick={() => { setAiResults([]); setAiSummary(""); }}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                title="Limpar resultados da IA"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* 3. Filtros principais — chips + sheet avançado */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {TipoChips}
              <AdvancedFiltersSheet
                filters={filters}
                onChange={setFilters}
                activeCount={advancedActiveCount}
              />
            </div>
            {totalActive && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
                <RotateCcw className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>

          {totalActive && (
            <ActiveFiltersChips filters={filters} onChange={setFilters} />
          )}

          {/* 4. Pra você — só quando não há filtros nem busca IA */}
          {!totalActive && !loading && aiResults.length === 0 && (
            <RecommendedSection
              editais={editais}
              palcos={palcosCurados}
              perfil={{
                estado: profile?.state || profile?.city || activeProject?.artistState || null,
                specialties: profile?.specialties || [],
                generos: [activeProject?.genre, profile?.primary_genre].filter(Boolean) as string[],
              }}
              onOpen={handleOpenDetail}
              onApply={handleInterest}
              isApplied={isAlreadyApplied}
              pendingKey={interestPending}
            />
          )}

          {/* 5. Contador — only show when there's something meaningful to count */}
          {(filtered.length > 0 || totalActive) && (
            <div className="text-xs text-muted-foreground">
              {filtered.length} oportunidade(s){totalActive ? " com filtros aplicados" : ""}
            </div>
          )}

          {/* 6. Grade */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-[0.875rem]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-[0.875rem]">
              <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
                {totalActive ? (
                  <>
                    <p>Nenhuma oportunidade combina com esses filtros.</p>
                    <Button size="sm" variant="outline" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Limpar filtros
                    </Button>
                  </>
                ) : (
                  <p>
                    Nenhuma oportunidade encontrada.<br />
                    Use a busca inteligente acima para descobrir editais e palcos novos.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((op) => (
                <OpportunityCard
                  key={`${op.tipo}-${op.key}`}
                  opportunity={op}
                  onClick={handleOpenDetail}
                  onApply={op.editalId || op.origem !== "saved" ? handleInterest : undefined}
                  alreadyApplied={isAlreadyApplied(op)}
                  pending={interestPending === op.key}
                  onSave={op.origem === "ai" ? handleSave : undefined}
                  onRemove={op.origem === "saved" ? handleRemove : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inscricoes" className="mt-4">
          {loadingApps ? (
            <Skeleton className="h-40 rounded-[0.875rem]" />
          ) : applications.length === 0 ? (
            <Card className="rounded-[0.875rem]">
              <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
                <p>
                  Você ainda não iniciou nenhuma candidatura.<br />
                  Encontre uma oportunidade na aba Descobrir e clique em <strong>Candidatar</strong> ou <strong>Marcar interesse</strong>.
                </p>
                <Button size="sm" variant="outline" onClick={() => setTab("descobrir")}>
                  Ir para Descobrir
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedApplications.map((a) => {
                const isPalco = a.tipo === "palco";
                const isFinal = !!a.resultado;
                const dLeft = !isFinal ? daysUntil(a.edital?.prazo) : null;
                return (
                  <Card
                    key={a.id}
                    className="rounded-[0.875rem] cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => handleApplicationClick(a)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <ApplicationStatusMenu
                              status={a.status as ApplicationStatus}
                              onChange={(s) => handleStatusChange(a.id, s)}
                            />
                            {isPalco && (
                              <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning-foreground border-warning/40">
                                Palco
                              </Badge>
                            )}
                            {a.edital?.estado && <span className="text-[11px] text-muted-foreground">{a.edital.estado}</span>}
                            {a.resultado && (
                              <Badge variant="outline" className="text-[10px]">
                                {a.resultado === "aprovado" ? "Aprovado" : a.resultado === "reprovado" ? "Reprovado" : a.resultado === "lista_espera" ? "Lista de espera" : "Desistência"}
                                {a.valor_aprovado ? ` · R$ ${a.valor_aprovado.toLocaleString("pt-BR")}` : ""}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold leading-snug truncate">
                            {a.edital?.titulo || "Oportunidade removida"}
                          </h3>
                          {a.edital?.orgao && (
                            <p className="text-xs text-muted-foreground truncate">{a.edital.orgao}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {a.edital?.prazo && (
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatBrDate(a.edital.prazo) || a.edital.prazo}
                            </span>
                          )}
                          {dLeft !== null && (
                            dLeft < 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/40">
                                Vencido há {Math.abs(dLeft)}d
                              </Badge>
                            ) : dLeft <= 7 ? (
                              <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning-foreground border-warning/40">
                                {dLeft === 0 ? "Vence hoje" : `Faltam ${dLeft}d`}
                              </Badge>
                            ) : dLeft <= 30 ? (
                              <span className="text-[11px] text-muted-foreground">Faltam {dLeft}d</span>
                            ) : null
                          )}
                          {a.edital?.link_status === "broken" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-warning"
                              asChild
                              title="Link oficial indisponível — buscar no Google"
                            >
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(`${a.edital?.titulo || ""} ${a.edital?.orgao || ""} edital`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          ) : a.edital?.link ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={a.edital.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          ) : null}
                          {a.status === "inscrito" && !a.resultado && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setResultApp(a)}
                            >
                              <Award className="h-3 w-3 mr-1" /> Registrar resultado
                            </Button>
                          )}
                          {!a.edital ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              aria-label="Remover candidatura órfã"
                              disabled={deleteApp.isPending}
                              onClick={() => deleteApp.mutate(a.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleApplicationClick(a)}
                            >
                              <ClipboardList className="h-3 w-3 mr-1" />
                              {isPalco ? "Detalhes" : "Abrir"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OpportunityDetailSheet
        opportunity={detailOp}
        open={!!detailOp}
        onOpenChange={(o) => !o && setDetailOp(null)}
        onApply={(op) => { void handleInterest(op); }}
        onSave={detailOp?.origem === "ai" ? (op) => { void handleSave(op); } : undefined}
        alreadyApplied={detailOp ? isAlreadyApplied(detailOp) : false}
        pending={detailOp ? interestPending === detailOp.key : false}
      />

      {resultApp && (
        <EditalResultModal
          application={resultApp}
          open={!!resultApp}
          onOpenChange={(o) => {
            if (!o) {
              setResultApp(null);
              void trackAppEvent("carreira_result_recorded", {});
              void refetchApps();
            }
          }}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
