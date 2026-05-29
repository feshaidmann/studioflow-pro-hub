import { useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaptadores, type CaptadorFilters, type CaptadorProfile } from "@/hooks/useCaptadores";
import CaptadorCard from "@/components/captadores/CaptadorCard";
import CaptadoresFilters from "@/components/captadores/CaptadoresFilters";
import CaptadorContactModal from "@/components/captadores/CaptadorContactModal";
import { Button } from "@/components/ui/button";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Captadores() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CaptadorFilters>({});
  const { data, loading } = useCaptadores(filters);
  const [contact, setContact] = useState<CaptadorProfile | null>(null);

  // Total ignoring search (server-side filters applied), filtered is what we show
  const total = data.length;
  const filtered = data.length;

  const handleRegisterAsCaptador = () => {
    toast.info("Ative seu perfil de captador nas configurações da conta.");
    navigate("/settings");
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <MobileStickyHeader
        title="Captadores"
        subtitle="Bookers e produtores executivos"
        cta={
          <Button size="sm" variant="outline" className="h-9" onClick={handleRegisterAsCaptador}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Sou captador
          </Button>
        }
      />

      <header className="hidden md:flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold inline-flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Captadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Diretório de produtores executivos, bookers e curadores que contratam shows.
            Filtre por tipo de palco, gênero e região para achar quem pode encaixar seu projeto.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRegisterAsCaptador}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Sou captador
        </Button>
      </header>

      <Card className="glass-card">
        <CardContent className="p-4">
          <CaptadoresFilters filters={filters} onChange={setFilters} total={total} filtered={filtered} />
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Megaphone className="h-10 w-10 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">Nenhum captador encontrado</p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Tente ajustar os filtros ou volte em breve — novos profissionais são adicionados regularmente.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRegisterAsCaptador}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar meu perfil
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((c) => (
            <CaptadorCard key={c.id} c={c} onContact={setContact} />
          ))}
        </div>
      )}

      <CaptadorContactModal
        open={!!contact}
        onOpenChange={(v) => { if (!v) setContact(null); }}
        captador={contact}
      />
    </div>
  );
}
