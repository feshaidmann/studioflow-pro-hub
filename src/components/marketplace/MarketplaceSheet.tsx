import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Store, Inbox } from "lucide-react";
import { useMarketplaceProviders } from "@/hooks/useMarketplace";
import { SPECIALTY_OPTIONS } from "@/constants/specialtyOptions";
import { BRAZIL_STATES } from "@/constants/brazilStates";
import { ProviderCard } from "./ProviderCard";
import { ProviderProfileSheet } from "./ProviderProfileSheet";
import { RequestQuoteModal } from "./RequestQuoteModal";
import { MyRequestsSheet } from "./MyRequestsSheet";
import type { MarketplaceProvider } from "@/types/marketplace";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialSpecialty?: string;
  initialGenre?: string;
  projectId?: string;
}

export function MarketplaceSheet({ open, onOpenChange, initialSpecialty, initialGenre, projectId }: Props) {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "all");
  const [state, setState] = useState("all");

  const { providers, loading } = useMarketplaceProviders({
    specialty: specialty === "all" ? undefined : specialty,
    genre: initialGenre,
    state: state === "all" ? undefined : state,
    search: search || undefined,
  });

  const [quoteTarget, setQuoteTarget] = useState<MarketplaceProvider | null>(null);
  const [profileTarget, setProfileTarget] = useState<MarketplaceProvider | null>(null);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Marketplace de Profissionais
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground -mr-2 -mt-1"
                onClick={() => setMyRequestsOpen(true)}
              >
                <Inbox className="h-4 w-4" /> Meus Pedidos
              </Button>
            </div>
            <SheetDescription>
              Descubra prestadores, envie um briefing curto e receba orçamentos.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou bio..."
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger><SelectValue placeholder="Especialidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas especialidades</SelectItem>
                  {SPECIALTY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estados</SelectItem>
                  {BRAZIL_STATES.map((s) => (
                    <SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loading ? (
              <p className="text-muted-foreground text-sm col-span-2 py-8 text-center animate-pulse">Carregando...</p>
            ) : providers.length === 0 ? (
              <div className="col-span-2 py-12 text-center space-y-2">
                <Store className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">Nenhum profissional encontrado com esses filtros.</p>
              </div>
            ) : (
              providers.map((p) => (
                <ProviderCard
                  key={p.provider_ref}
                  provider={p}
                  onRequestQuote={setQuoteTarget}
                  onOpenProfile={setProfileTarget}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <RequestQuoteModal
        open={!!quoteTarget}
        onOpenChange={(v) => !v && setQuoteTarget(null)}
        provider={quoteTarget}
        projectId={projectId}
        specialty={specialty === "all" ? undefined : specialty}
      />

      <MyRequestsSheet open={myRequestsOpen} onOpenChange={setMyRequestsOpen} />

      <ProviderProfileSheet
        provider={profileTarget}
        open={!!profileTarget}
        onOpenChange={(v) => !v && setProfileTarget(null)}
        onRequestQuote={(p) => {
          setProfileTarget(null);
          setQuoteTarget(p);
        }}
      />
    </>
  );
}
