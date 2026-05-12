import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Trophy, ClipboardList, ListFilter, ExternalLink, Calendar } from "lucide-react";
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
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  type ApplicationStatus,
} from "@/hooks/useEditalApplications";
import OpportunityCard from "@/components/carreira/OpportunityCard";
import OpportunityFilters, { type CarreiraFilters } from "@/components/carreira/OpportunityFilters";
import AISearchPanel from "@/components/carreira/AISearchPanel";
import {
  editalToOpportunity,
  palcoToOpportunity,
  type Opportunity,
} from "@/components/carreira/types";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function normalize(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function Carreira() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTipo = (searchParams.get("tipo") as CarreiraFilters["tipo"]) || "todos";

  const [filters, setFilters] = useState<CarreiraFilters>({
    tipo: initialTipo === "edital" || initialTipo === "palco" ? initialTipo : "todos",
    status: "todos",
    estado: "todos",
    query: "",
  });

  const [aiResults, setAiResults] = useState<Opportunity[]>([]);
  const [tab, setTab] = useState<"descobrir" | "inscricoes">("descobrir");

  const { editais, loading: loadingEditais, saveResults: saveEditais, deleteEdital } = useEditais();
  const { palcosCurados, loadingCurados, saveResults: savePalcos } = usePalcos();
  const { data: applications = [], isLoading: loadingApps } = useEditalApplications();
  const createApp = useCreateApplication();

  // Persiste tipo na querystring para deep-linking e redirects de /editais|/palcos
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filters.tipo === "todos") next.delete("tipo");
    else next.set("tipo", filters.tipo);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.tipo]);

  // Lista unificada
  const allOpportunities: Opportunity[] = useMemo(() => {
    const list: Opportunity[] = [
      ...editais.map(editalToOpportunity),
      ...palcosCurados.map((p) => palcoToOpportunity(p, "curated")),
      ...aiResults,
    ];
    // Dedup por (tipo + key)
    const seen = new Set<string>();
    return list.filter((o) => {
      const k = `${o.tipo}:${o.key}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [editais, palcosCurados, aiResults]);

  const filtered = useMemo(() => {
    const q = normalize(filters.query);
    return allOpportunities
      .filter((o) => filters.tipo === "todos" || o.tipo === filters.tipo)
      .filter((o) => filters.status === "todos" || o.status === filters.status)
      .filter((o) => {
        if (filters.estado === "todos") return true;
        return (o.estado || "").toLowerCase() === filters.estado.toLowerCase();
      })
      .filter((o) => {
        if (!q) return true;
        const hay = normalize(`${o.titulo} ${o.organizador} ${o.estado || ""} ${o.resumo || ""}`);
        return hay.includes(q);
      })
      .sort((a, b) => {
        // Aberto > Previsto > Indefinido > Encerrado
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

  const appliedEditalIds = useMemo(
    () => new Set(applications.map((a) => a.edital_id)),
    [applications]
  );

  const handleApply = async (op: Opportunity) => {
    if (op.tipo !== "edital" || !op.editalId) {
      toast.info("Use o link oficial para se candidatar a este palco.");
      return;
    }
    if (appliedEditalIds.has(op.editalId)) {
      toast.info("Você já tem uma candidatura para este edital.");
      setTab("inscricoes");
      return;
    }
    try {
      await createApp.mutateAsync({ edital_id: op.editalId });
      setTab("inscricoes");
    } catch {
      // toast já é exibido pelo onError do hook
    }
  };

  const handleSave = async (op: Opportunity) => {
    try {
      if (op.tipo === "edital") {
        await saveEditais([op.raw as any]);
      } else {
        await savePalcos([op.raw as any]);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleRemove = async (op: Opportunity) => {
    if (op.tipo === "edital" && op.editalId) {
      await deleteEdital(op.editalId);
    }
  };

  const loading = loadingEditais || loadingCurados;

  // ── Sidebar (filtros) ────────────────────────────────────────────────────
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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <ListFilter className="h-3.5 w-3.5 mr-1" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
              <div className="mt-4">
                <OpportunityFilters filters={filters} onChange={setFilters} />
              </div>
            </SheetContent>
          </Sheet>
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
            {/* Sidebar desktop */}
            <div className="hidden md:flex flex-col gap-4">
              {FiltersSidebar}
              <AISearchPanel onResults={(r) => setAiResults(r)} />
            </div>

            {/* Mobile: AI search inline */}
            <div className="md:hidden">
              <AISearchPanel onResults={(r) => setAiResults(r)} />
            </div>

            {/* Lista */}
            <div>
              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                <span>{filtered.length} oportunidade(s)</span>
                {aiResults.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAiResults([])}>
                    Limpar resultados da IA
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-[0.875rem]" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <Card className="rounded-[0.875rem]">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    Nenhuma oportunidade encontrada.<br />
                    Use a busca inteligente acima para descobrir editais e palcos novos.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filtered.map((op) => (
                    <OpportunityCard
                      key={`${op.tipo}-${op.key}`}
                      opportunity={op}
                      onApply={op.tipo === "edital" && op.editalId ? handleApply : undefined}
                      alreadyApplied={op.tipo === "edital" && !!op.editalId && appliedEditalIds.has(op.editalId)}
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
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Você ainda não iniciou nenhuma candidatura.<br />
                Encontre uma oportunidade na aba Descobrir e clique em <strong>Candidatar</strong>.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {applications.map((a) => (
                <Card
                  key={a.id}
                  className="rounded-[0.875rem] cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => navigate(`/editais/inscricao/${a.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[11px]", APPLICATION_STATUS_COLORS[a.status as ApplicationStatus])}
                          >
                            {APPLICATION_STATUS_LABELS[a.status as ApplicationStatus]}
                          </Badge>
                          {a.edital?.estado && <span className="text-[11px] text-muted-foreground">{a.edital.estado}</span>}
                        </div>
                        <h3 className="text-sm font-semibold leading-snug truncate">
                          {a.edital?.titulo || "Edital removido"}
                        </h3>
                        {a.edital?.orgao && (
                          <p className="text-xs text-muted-foreground truncate">{a.edital.orgao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.edital?.prazo && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {a.edital.prazo}
                          </span>
                        )}
                        {a.edital?.link && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={a.edital.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <ClipboardList className="h-3 w-3 mr-1" /> Abrir
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
    </div>
  );
}
