import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Trophy, ClipboardList, ListFilter, ExternalLink, Calendar, RotateCcw, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEditais } from "@/hooks/useEditais";
import { usePalcos } from "@/hooks/usePalcos";
import {
  useEditalApplications,
  useCreateApplication,
  useUpdateApplication,
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
import ActiveFiltersChips from "@/components/carreira/ActiveFiltersChips";
import RecommendedSection from "@/components/carreira/RecommendedSection";
import EditalResultModal from "@/components/editais/EditalResultModal";
import {
  editalToOpportunity,
  palcoToOpportunity,
  type Opportunity,
} from "@/components/carreira/types";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useProjects } from "@/contexts/ProjectContext";
import { trackAppEvent } from "@/lib/analytics";

function normalize(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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
  const isMobile = useIsMobile();
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
      const palcoId = op.editalId || (op.raw as any).id || null;
      if (palcoId) return { id: palcoId, tipo: "palco" };
      // Palco vindo da IA sem id ainda — salva primeiro
      await savePalcos([op.raw as any]);
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
    const key = (op.raw as any).session_key || sessionKeyFor(op.titulo, op.organizador);
    await saveEditais([op.raw as any]);
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
      await createApp.mutateAsync({ opportunity_id: resolved.id, tipo: resolved.tipo });
      await refetchApps();
      void trackAppEvent("carreira_interest_marked", {
        opportunity_type: op.tipo,
        opportunity_title: op.titulo,
        origem: op.origem,
      });
      toast.success(op.tipo === "edital" ? "Candidatura iniciada" : "Interesse registrado", {
        action: { label: "Ver pipeline", onClick: () => setTab("inscricoes") },
      });
    } catch {
      // toast tratado pelo hook
    } finally {
      setInterestPending(null);
    }
  };

  const handleSave = async (op: Opportunity) => {
    try {
      if (op.tipo === "edital") await saveEditais([op.raw as any]);
      else await savePalcos([op.raw as any]);
      void trackAppEvent("carreira_opportunity_saved", { opportunity_type: op.tipo });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
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

  const handleAIResults = (r: Opportunity[]) => {
    setAiResults(r);
    void trackAppEvent("carreira_ai_search", { results_count: r.length });
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    await updateApp.mutateAsync({ id, status });
    void trackAppEvent("carreira_application_status_changed", { status });
  };

  const handleApplicationClick = (a: EditalApplication) => {
    if (a.tipo === "palco") {
      // Reabre como sheet em vez do assistente de inscrição
      const op: Opportunity = {
        key: a.opportunity_id,
        tipo: "palco",
        titulo: a.edital?.titulo || "Palco",
        organizador: a.edital?.orgao || "",
        estado: a.edital?.estado || null,
        status: a.edital?.status || "Indefinido",
        prazo: a.edital?.prazo || null,
        link: a.edital?.link || null,
        valor: null,
        resumo: a.edital?.resumo || null,
        editalId: a.opportunity_id,
        origem: "saved",
        raw: (a.edital as any) || {},
      };
      setDetailOp(op);
    } else {
      navigate(`/editais/inscricao/${a.opportunity_id}`);
    }
  };

  const loading = loadingEditais || loadingCurados;

  const FiltersSidebar = (
    <OpportunityFilters
      filters={filters}
      onChange={setFilters}
      className="rounded-[0.875rem] border border-border bg-card/60 backdrop-blur-sm p-4"
    />
  );

  return (
    <div className="space-y-4 pb-8">
      <MobileStickyHeader
        title="Carreira"
        cta={
          tab === "descobrir" ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <ListFilter className="h-3.5 w-3.5 mr-1" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-4">
                  <OpportunityFilters filters={filters} onChange={setFilters} />
                </div>
              </SheetContent>
            </Sheet>
          ) : null
        }
      />

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

        <TabsContent value="descobrir" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
            <div className="hidden md:flex flex-col gap-4">
              {FiltersSidebar}
              <AISearchPanel onResults={handleAIResults} projectId={activeProject?.id || null} />
            </div>

            <div className="md:hidden">
              <AISearchPanel onResults={handleAIResults} projectId={activeProject?.id || null} />
            </div>

            <div>
              {/* Pra você (esconde quando filtros ativos) */}
              {!totalActive && !loading && (
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

              {/* Chips de filtros ativos */}
              {totalActive && (
                <ActiveFiltersChips filters={filters} onChange={setFilters} className="mb-3" />
              )}

              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground gap-2 flex-wrap">
                <span>{filtered.length} oportunidade(s){totalActive ? " com filtros aplicados" : ""}</span>
                <div className="flex items-center gap-1">
                  {totalActive && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Limpar filtros
                    </Button>
                  )}
                  {aiResults.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAiResults([])}>
                      Limpar resultados da IA
                    </Button>
                  )}
                </div>
              </div>

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
                        Use a busca inteligente {isMobile ? "acima" : "ao lado"} para descobrir editais e palcos novos.
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
            </div>
          </div>
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
              {applications.map((a) => {
                const isPalco = a.tipo === "palco";
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
                              {a.edital.prazo}
                            </span>
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleApplicationClick(a)}
                          >
                            <ClipboardList className="h-3 w-3 mr-1" />
                            {isPalco ? "Detalhes" : "Abrir"}
                          </Button>
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
  );
}
