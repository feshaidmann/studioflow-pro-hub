import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Trophy,
  Mic2,
  RotateCcw,
  Search,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import {
  DEFAULT_FILTERS,
  type CarreiraFilters,
  type DeadlineWindow,
} from "@/components/carreira/OpportunityFilters";
import OpportunityDetailSheet from "@/components/carreira/OpportunityDetailSheet";
import AISearchPanel from "@/components/carreira/AISearchPanel";
import AdvancedFiltersSheet from "@/components/carreira/AdvancedFiltersSheet";
import ActiveFiltersChips from "@/components/carreira/ActiveFiltersChips";
import RecommendedSection from "@/components/carreira/RecommendedSection";
import ApplicationsBoard from "@/components/carreira/ApplicationsBoard";
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
import { opportunitySlug } from "@/lib/opportunitySlug";
import type { Edital } from "@/hooks/useEditais";
import type { PalcoCurado } from "@/hooks/usePalcos";

type SubTipo = "edital" | "palco";
type MainTab = "explorar" | "candidaturas";

function readFiltersFromURL(sp: URLSearchParams): CarreiraFilters {
  const tipo = sp.get("tipo");
  const status = sp.get("status");
  const deadline = sp.get("prazo");
  return {
    tipo: tipo === "palco" ? "palco" : "edital", // sempre edital ou palco (sub-tab)
    status: (["Aberto", "Encerrado", "Indefinido", "Previsto"] as const).includes(status as any)
      ? (status as CarreiraFilters["status"])
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
  // tipo sempre presente (edital | palco)
  next.set("tipo", f.tipo === "palco" ? "palco" : "edital");
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

  const [filters, setFilters] = useState<CarreiraFilters>(() => ({
    ...readFiltersFromURL(searchParams),
  }));
  const [aiResults, setAiResults] = useState<Opportunity[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [tab, setTab] = useState<MainTab>(
    searchParams.get("tab") === "inscricoes" || searchParams.get("tab") === "candidaturas"
      ? "candidaturas"
      : "explorar",
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

  const activeProject = useMemo(() => projects.find((p) => !p.completed) || null, [projects]);

  // URL sync
  useEffect(() => {
    const next = writeFiltersToURL(filters, searchParams);
    if (tab === "candidaturas") next.set("tab", "candidaturas");
    else next.delete("tab");
    if (detailOp) next.set("op", `${detailOp.tipo}:${detailOp.key}`);
    else next.delete("op");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tab, detailOp]);

  // Legacy redirect notice
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

  // Unified list, deduped
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

  // Deep-link sheet
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

  const subTipo: SubTipo = filters.tipo === "palco" ? "palco" : "edital";

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
      .filter((o) => o.tipo === subTipo)
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
        } catch {
          return false;
        }
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
  }, [allOpportunities, filters, subTipo]);

  const appliedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const a of applications) if (a.opportunity_id) set.add(a.opportunity_id);
    return set;
  }, [applications]);

  const isAlreadyApplied = useCallback(
    (op: Opportunity) => {
      if (op.editalId && appliedKeys.has(op.editalId)) return true;
      return applications.some(
        (a) => a.edital?.titulo === op.titulo && (a.edital?.orgao || "") === op.organizador,
      );
    },
    [appliedKeys, applications],
  );

  const advancedActiveCount =
    (filters.status !== "todos" ? 1 : 0) +
    (filters.estado !== "todos" ? 1 : 0) +
    (subTipo === "palco" && filters.genero !== "todos" ? 1 : 0) +
    (filters.deadline !== "todos" ? 1 : 0) +
    (!filters.hideClosed ? 1 : 0);

  const anyFilterActive = advancedActiveCount > 0 || !!filters.query;

  const ensureOpportunity = useCallback(
    async (op: Opportunity): Promise<{ id: string; tipo: "fomento" | "palco" } | null> => {
      if (!user) return null;
      if (op.tipo === "palco") {
        const palcoId = op.editalId || op.raw.id || null;
        if (palcoId) return { id: palcoId, tipo: "palco" };
        await savePalcos([op.raw as PalcoCurado]);
        const { data } = await supabase
          .from("palcos_curados")
          .select("id")
          .eq("nome", op.titulo)
          .eq("organizador", op.organizador)
          .maybeSingle();
        return data?.id ? { id: data.id as string, tipo: "palco" } : null;
      }
      if (op.editalId) return { id: op.editalId, tipo: "fomento" };
      const key = (op.raw as Edital).session_key || opportunitySlug(op.titulo, op.organizador);
      await saveEditais([op.raw as Edital]);
      const { data } = await supabase
        .from("editais")
        .select("id")
        .eq("session_key", key)
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.id ? { id: data.id as string, tipo: "fomento" } : null;
    },
    [user, saveEditais, savePalcos],
  );

  const handleInterest = async (op: Opportunity) => {
    if (isAlreadyApplied(op)) {
      toast.info("Esta oportunidade já está no seu pipeline.", {
        action: { label: "Ver", onClick: () => setTab("candidaturas") },
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
      const created = await createApp.mutateAsync({
        opportunity_id: resolved.id,
        tipo: resolved.tipo,
      });
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
        toast.success("Proposta iniciada");
        if (created?.id) navigate(`/palcos/proposta/${created.id}`);
        else setTab("candidaturas");
      }
    } catch (e) {
      console.error("handleInterest:", e);
      toast.error(e instanceof Error ? e.message : "Erro ao registrar candidatura. Tente novamente.");
    } finally {
      setInterestPending(null);
    }
  };

  const handleSave = async (op: Opportunity) => {
    try {
      if (op.tipo === "edital") await saveEditais([op.raw as Edital]);
      else await savePalcos([op.raw as PalcoCurado]);
      void trackAppEvent("carreira_opportunity_saved", { opportunity_type: op.tipo });
    } catch (e) {
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
    if (a.tipo === "palco") navigate(`/palcos/proposta/${a.id}`);
    else navigate(`/editais/inscricao/${a.opportunity_id}`);
  };

  const loading = loadingEditais || loadingCurados;

  // Sub-tab toggle
  const SubTabs = (
    <div className="inline-flex rounded-[0.7rem] border border-border bg-card/60 p-0.5">
      {[
        { v: "edital" as const, l: "Editais", Icon: Trophy },
        { v: "palco" as const, l: "Palcos", Icon: Mic2 },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() =>
            setFilters({
              ...filters,
              tipo: o.v,
              // genero só se aplica a palcos — limpa ao trocar para edital
              genero: o.v === "edital" ? DEFAULT_FILTERS.genero : filters.genero,
            })
          }
          className={
            "text-sm px-3.5 py-1.5 rounded-[0.55rem] transition-colors inline-flex items-center gap-1.5 " +
            (filters.tipo === o.v
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <o.Icon className="h-3.5 w-3.5" />
          {o.l}
        </button>
      ))}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 pb-8">
        <MobileStickyHeader title="Carreira" />

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Carreira
            </h1>
            <p className="text-sm text-muted-foreground">
              Editais de fomento, festivais e palcos — descubra, candidate-se e acompanhe.
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
          <TabsList className="rounded-[0.875rem]">
            <TabsTrigger value="explorar" className="rounded-[0.7rem]">
              Explorar
            </TabsTrigger>
            <TabsTrigger value="candidaturas" className="rounded-[0.7rem]">
              Minhas candidaturas
              {applications.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                  {applications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ───────── Explorar ───────── */}
          <TabsContent value="explorar" className="mt-4 space-y-4">
            {/* 1. Hero IA */}
            <AISearchPanel
              onResults={handleAIResults}
              projectId={activeProject?.id || null}
              tipo={subTipo}
              resultsCount={aiResults.length}
              onClear={() => {
                setAiResults([]);
                setAiSummary("");
              }}
            />

            {aiResults.length > 0 && aiSummary && (
              <p className="text-xs text-muted-foreground italic px-1">{aiSummary}</p>
            )}

            {/* 2. Sub-tabs Editais / Palcos */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {SubTabs}
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                {subTipo === "edital"
                  ? "Editais culturais e bolsas de fomento"
                  : "Festivais, residências e palcos curados"}
              </div>
            </div>

            {/* 3. Filtro compacto: busca + UF + prazo + mais filtros */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  placeholder="Buscar por nome, órgão, cidade…"
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <Select
                value={filters.deadline}
                onValueChange={(v) => setFilters({ ...filters, deadline: v as DeadlineWindow })}
              >
                <SelectTrigger className="h-9 w-[150px] text-sm">
                  <SelectValue placeholder="Prazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer prazo</SelectItem>
                  <SelectItem value="7d">Próx. 7 dias</SelectItem>
                  <SelectItem value="30d">Próx. 30 dias</SelectItem>
                  <SelectItem value="90d">Próx. 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <AdvancedFiltersSheet
                filters={filters}
                onChange={setFilters}
                activeCount={advancedActiveCount}
                tipoContext={subTipo}
              />
              {anyFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS, tipo: filters.tipo })}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>

            {anyFilterActive && <ActiveFiltersChips filters={filters} onChange={setFilters} tipoContext={subTipo} />}

            {/* 4. Recomendados — só sem filtros nem IA */}
            {!anyFilterActive && !loading && aiResults.length === 0 && (
              <RecommendedSection
                editais={subTipo === "edital" ? editais : []}
                palcos={subTipo === "palco" ? palcosCurados : []}
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

            {/* 5. Contador */}
            {(filtered.length > 0 || anyFilterActive) && (
              <div className="text-xs text-muted-foreground">
                {filtered.length}{" "}
                {subTipo === "edital"
                  ? filtered.length === 1 ? "edital" : "editais"
                  : filtered.length === 1 ? "palco" : "palcos"}
                {anyFilterActive ? " com filtros aplicados" : ""}
              </div>
            )}

            {/* 6. Grade */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-[0.875rem]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="rounded-[0.875rem]">
                <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
                  {anyFilterActive ? (
                    <>
                      <p>Nenhum resultado com esses filtros.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFilters({ ...DEFAULT_FILTERS, tipo: filters.tipo })}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Limpar filtros
                      </Button>
                    </>
                  ) : (
                    <p>
                      Nenhuma oportunidade carregada ainda.
                      <br />
                      Use a busca por IA acima para descobrir{" "}
                      {subTipo === "edital" ? "editais" : "palcos"} novos.
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

          {/* ───────── Minhas candidaturas ───────── */}
          <TabsContent value="candidaturas" className="mt-4">
            {loadingApps ? (
              <Skeleton className="h-40 rounded-[0.875rem]" />
            ) : applications.length === 0 ? (
              <Card className="rounded-[0.875rem]">
                <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
                  <p>
                    Você ainda não tem candidaturas.
                    <br />
                    Vá em <strong>Explorar</strong> e clique em <strong>Candidatar</strong> ou{" "}
                    <strong>Tenho interesse</strong>.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setTab("explorar")}>
                    Ir para Explorar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ApplicationsBoard
                applications={applications}
                onOpen={handleApplicationClick}
                onStatusChange={handleStatusChange}
                onRegisterResult={(a) => setResultApp(a)}
                onDelete={(id) => deleteApp.mutate(id)}
                deletingId={deleteApp.isPending ? (deleteApp.variables as string | undefined) : null}
              />
            )}
          </TabsContent>
        </Tabs>

        <OpportunityDetailSheet
          opportunity={detailOp}
          open={!!detailOp}
          onOpenChange={(o) => !o && setDetailOp(null)}
          onApply={(op) => {
            void handleInterest(op);
          }}
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
