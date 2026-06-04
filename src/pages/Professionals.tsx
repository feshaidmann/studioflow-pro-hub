import { useMemo, useState, useEffect } from "react";
import { Users, Plus, Filter, Store, Inbox, BriefcaseBusiness } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { MarketplaceSheet } from "@/components/marketplace/MarketplaceSheet";
import { MyRequestsSheet } from "@/components/marketplace/MyRequestsSheet";
import { InboundRequestsSheet } from "@/components/marketplace/InboundRequestsSheet";
import { useProfile } from "@/contexts/ProfileContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { useProfessionalsList } from "@/hooks/useProfessionalsList";
import { ProfessionalsFilters, type StatusFilter } from "@/components/professionals/ProfessionalsFilters";
import { ProfessionalsTable } from "@/components/professionals/ProfessionalsTable";
import { ProfessionalsCardList } from "@/components/professionals/ProfessionalsCardList";
import { ProfessionalDetailModal } from "@/components/professionals/ProfessionalDetailModal";
import { ProfessionalFormDialog } from "@/components/professionals/ProfessionalFormDialog";
import { DeleteProfessionalDialog } from "@/components/professionals/DeleteProfessionalDialog";
import type { Professional } from "@/components/professionals/types";

export default function Professionals() {
  const isMobile = useIsMobile();
  const { professionals, ratingsMap, allocationsMap, loading, refetch, toggleFavorite, remove } = useProfessionalsList();

  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterAllocated, setFilterAllocated] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);

  const [detailProf, setDetailProf] = useState<Professional | null>(null);
  const [editTarget, setEditTarget] = useState<Professional | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);
  const [inboundOpen, setInboundOpen] = useState(false);
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("openRequests") === "1") {
      setMyRequestsOpen(true);
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("openInbound") === "1") {
      setInboundOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const specialties = useMemo(
    () => Array.from(new Set(professionals.map((p) => p.specialty).filter(Boolean))).sort(),
    [professionals]
  );

  const filtered = useMemo(() => professionals.filter((p) => {
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
  }), [professionals, search, filterSpecialty, filterStatus, filterAllocated, filterFavorite, allocationsMap]);

  const hasActiveFilters = search !== "" || filterSpecialty !== "all" || filterStatus !== "all" || filterAllocated || filterFavorite;

  const clearFilters = () => {
    setSearch(""); setFilterSpecialty("all"); setFilterStatus("all"); setFilterAllocated(false); setFilterFavorite(false);
  };

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (p: Professional) => { setDetailProf(null); setEditTarget(p); setFormOpen(true); };
  const handleInvite = (_p: Professional) => { setDetailProf(_p); };

  const handleEditByEmail = (email: string) => {
    const target = professionals.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (target) { setEditTarget(target); setFormOpen(true); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <MobileStickyHeader
        title="Meus Contatos"
        subtitle={`${professionals.length} contato${professionals.length !== 1 ? "s" : ""}`}
        cta={
          <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        }
      />

      <header className="hidden md:flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" /> Meus Contatos
          </h1>
          <p className="text-muted-foreground mt-1">Sua agenda de profissionais — músicos, engenheiros e colaboradores.</p>
        </div>
        <div className="flex gap-2">
          {profile?.allow_global_listing && (
            <Button variant="outline" onClick={() => setInboundOpen(true)} className="gap-2">
              <BriefcaseBusiness className="h-4 w-4" /> Pedidos Recebidos
            </Button>
          )}
          <Button variant="outline" onClick={() => setMyRequestsOpen(true)} className="gap-2">
            <Inbox className="h-4 w-4" /> Meus Pedidos
          </Button>
          <Button variant="outline" onClick={() => setMarketplaceOpen(true)} className="gap-2">
            <Store className="h-4 w-4" /> Marketplace
          </Button>
          <Button onClick={openCreate} className="gap-2 active:scale-95 transition-transform">
            <Plus className="h-4 w-4" /> Novo Contato
          </Button>
        </div>
      </header>

      <Card className="glass-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="pb-3">
          <ProfessionalsFilters
            search={search} onSearchChange={setSearch}
            status={filterStatus} onStatusChange={setFilterStatus}
            favorite={filterFavorite} onFavoriteChange={setFilterFavorite}
            allocated={filterAllocated} onAllocatedChange={setFilterAllocated}
            specialty={filterSpecialty} onSpecialtyChange={setFilterSpecialty}
            specialties={specialties}
            total={professionals.length} filtered={filtered.length}
            onClear={clearFilters} hasActive={hasActiveFilters}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-1 py-2">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : professionals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Users className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-medium">Nenhum contato ainda</p>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Adicione músicos e colaboradores para reutilizá-los nos seus projetos.
                </p>
              </div>
              <Button className="mt-2" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar primeiro contato
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">Nenhum contato encontrado com esses filtros.</p>
              <button onClick={clearFilters} className="text-primary text-sm hover:underline">Limpar filtros</button>
            </div>
          ) : isMobile ? (
            <ProfessionalsCardList
              rows={filtered}
              ratingsMap={ratingsMap}
              allocationsMap={allocationsMap}
              onOpen={setDetailProf}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggleFavorite={(p) => toggleFavorite(p.id, p.favorite)}
              onInvite={handleInvite}
            />
          ) : (
            <ProfessionalsTable
              rows={filtered}
              ratingsMap={ratingsMap}
              allocationsMap={allocationsMap}
              onOpen={setDetailProf}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggleFavorite={(p) => toggleFavorite(p.id, p.favorite)}
              onInvite={handleInvite}
            />
          )}
        </CardContent>
      </Card>

      <ProfessionalDetailModal
        professional={detailProf}
        onClose={() => setDetailProf(null)}
        onEdit={openEdit}
      />

      <ProfessionalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        existingEmails={professionals.map((p) => p.email)}
        onSaved={refetch}
        onRequestEdit={handleEditByEmail}
      />

      <DeleteProfessionalDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <MarketplaceSheet open={marketplaceOpen} onOpenChange={setMarketplaceOpen} />
      <MyRequestsSheet open={myRequestsOpen} onOpenChange={setMyRequestsOpen} />
      <InboundRequestsSheet open={inboundOpen} onOpenChange={setInboundOpen} />
    </div>
  );
}
