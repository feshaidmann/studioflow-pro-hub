import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, AlertTriangle, FileQuestion, Clock, Sparkles, Inbox, HelpCircle,
} from "lucide-react";

export interface HealthMetrics {
  total_editais: number;
  links_ok: number;
  links_broken: number;
  links_unchecked: number;
  sem_resumo: number;
  sem_prazo_valido: number;
  novos_7d: number;
  pendente_revisao: number;
  reports_abertos: number;
}

export type HealthFilter =
  | null
  | "links_broken"
  | "links_unchecked"
  | "sem_resumo"
  | "sem_prazo"
  | "novos_7d"
  | "pendente_revisao";

interface Props {
  onFilter: (f: HealthFilter) => void;
  active: HealthFilter;
  refreshKey?: number;
}

export default function HealthBar({ onFilter, active, refreshKey }: Props) {
  const [m, setM] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.rpc("admin_carreira_health" as any).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error(error);
      const row = Array.isArray(data) ? data[0] : data;
      setM((row as HealthMetrics) ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading || !m) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}><CardContent className="p-3 h-[68px]" /></Card>
        ))}
      </div>
    );
  }

  const pctOk = m.total_editais > 0 ? Math.round((m.links_ok / m.total_editais) * 100) : 0;

  const items: Array<{ key: HealthFilter; label: string; value: string | number; icon: any; cls: string; sub?: string }> = [
    { key: null, label: "Editais ativos", value: m.total_editais, icon: Inbox, cls: "text-foreground" },
    { key: null, label: "Links OK", value: `${pctOk}%`, icon: CheckCircle2, cls: "text-emerald-600", sub: `${m.links_ok}/${m.total_editais}` },
    { key: "links_broken", label: "Links quebrados", value: m.links_broken, icon: AlertTriangle, cls: "text-destructive" },
    { key: "links_unchecked", label: "Não verificados", value: m.links_unchecked, icon: HelpCircle, cls: "text-muted-foreground" },
    { key: "sem_resumo", label: "Sem resumo IA", value: m.sem_resumo, icon: FileQuestion, cls: "text-amber-600" },
    { key: "sem_prazo", label: "Prazo inválido/vencido", value: m.sem_prazo_valido, icon: Clock, cls: "text-orange-600" },
    { key: "novos_7d", label: "Novos 7d", value: m.novos_7d, icon: Sparkles, cls: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const clickable = it.key !== null;
        const isActive = clickable && active === it.key;
        return (
          <Card
            key={idx}
            className={`transition-all ${clickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""} ${isActive ? "ring-2 ring-primary" : ""}`}
            onClick={() => clickable && onFilter(active === it.key ? null : it.key)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground font-medium leading-tight">{it.label}</p>
                <Icon className={`h-3.5 w-3.5 ${it.cls}`} />
              </div>
              <p className={`text-xl font-bold ${it.cls}`}>{it.value}</p>
              {it.sub && <p className="text-[10px] text-muted-foreground">{it.sub}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
