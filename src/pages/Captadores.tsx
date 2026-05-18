import { useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCaptadores, type CaptadorFilters, type CaptadorProfile } from "@/hooks/useCaptadores";
import CaptadorCard from "@/components/captadores/CaptadorCard";
import CaptadoresFilters from "@/components/captadores/CaptadoresFilters";
import CaptadorContactModal from "@/components/captadores/CaptadorContactModal";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Captadores() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CaptadorFilters>({});
  const { data, loading } = useCaptadores(filters);
  const [contact, setContact] = useState<CaptadorProfile | null>(null);

  // Total ignoring search (server-side filters applied), filtered is what we show
  const total = data.length;
  const filtered = data.length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold inline-flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Captadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Diretório de produtores executivos, bookers e curadores que contratam shows.
            Filtre por tipo de palco, gênero e região para achar quem pode encaixar seu projeto.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/settings")}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Sou captador
        </Button>
      </header>

      <Card className="glass-card">
        <CardContent className="p-4">
          <CaptadoresFilters filters={filters} onChange={setFilters} total={total} filtered={filtered} />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12 animate-pulse">Carregando…</p>
      ) : data.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-muted-foreground">Nenhum captador encontrado com esses filtros.</p>
          <p className="text-xs text-muted-foreground">Em breve mais profissionais aparecerão aqui — você também pode se cadastrar.</p>
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
