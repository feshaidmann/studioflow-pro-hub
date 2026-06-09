import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";

interface Report {
  id: string;
  user_id: string;
  opportunity_kind: "edital" | "palco";
  opportunity_id: string;
  reason: string;
  comment: string | null;
  status: "open" | "resolved" | "ignored";
  created_at: string;
  resolved_at: string | null;
  // resolved row
  opportunity_title?: string;
  opportunity_link?: string | null;
}

const REASON_LABEL: Record<string, string> = {
  link_broken: "🔗 Link quebrado",
  wrong_deadline: "📅 Prazo errado",
  wrong_value: "💰 Valor errado",
  duplicate: "👥 Duplicado",
  outdated: "🕰️ Desatualizado",
  other: "✏️ Outro",
};

export default function ReportsTab({ onOpenOpportunity }: { onOpenOpportunity?: (kind: "edital" | "palco", id: string) => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"open" | "resolved" | "ignored">("open");
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("opportunity_reports")
      .select("id,user_id,opportunity_kind,opportunity_id,reason,comment,status,created_at,resolved_at")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data as Report[]) || [];

    // resolve titles
    const editalIds = list.filter(r => r.opportunity_kind === "edital").map(r => r.opportunity_id);
    const palcoIds = list.filter(r => r.opportunity_kind === "palco").map(r => r.opportunity_id);
    const [edRes, paRes] = await Promise.all([
      editalIds.length ? supabase.from("editais").select("id,titulo,link").in("id", editalIds) : Promise.resolve({ data: [] }),
      palcoIds.length ? supabase.from("palcos_curados").select("id,nome,link").in("id", palcoIds) : Promise.resolve({ data: [] }),
    ]);
    const map = new Map<string, { title: string; link: string | null }>();
    (edRes.data || []).forEach((e: any) => map.set(e.id, { title: e.titulo, link: e.link }));
    (paRes.data || []).forEach((p: any) => map.set(p.id, { title: p.nome, link: p.link }));
    setReports(list.map(r => ({
      ...r,
      opportunity_title: map.get(r.opportunity_id)?.title || "(removido)",
      opportunity_link: map.get(r.opportunity_id)?.link ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [filter]);

  async function updateStatus(id: string, status: "resolved" | "ignored") {
    setBusy((s) => new Set(s).add(id));
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("opportunity_reports")
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq("id", id);
    setBusy((s) => { const n = new Set(s); n.delete(id); return n; });
    if (error) return toast.error(error.message);
    toast.success(status === "resolved" ? "Resolvido" : "Ignorado");
    fetchReports();
  }

  // Agrupa por edital
  const grouped = reports.reduce((acc, r) => {
    const k = `${r.opportunity_kind}:${r.opportunity_id}`;
    (acc[k] ??= []).push(r);
    return acc;
  }, {} as Record<string, Report[]>);

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
      <TabsList>
        <TabsTrigger value="open">Abertos</TabsTrigger>
        <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
        <TabsTrigger value="ignored">Ignorados</TabsTrigger>
      </TabsList>
      <TabsContent value={filter} className="mt-4">
        <Card>
          <CardContent className="p-0">
            {loading && <div className="p-6 text-sm text-muted-foreground text-center">Carregando...</div>}
            {!loading && Object.keys(grouped).length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center">
                Nenhum report {filter === "open" ? "aberto" : filter}.
              </div>
            )}
            <div className="divide-y">
              {Object.entries(grouped).map(([key, items]) => {
                const first = items[0];
                return (
                  <div key={key} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <p className="font-medium text-sm">{first.opportunity_title}</p>
                          <Badge variant="outline" className="text-[10px]">{first.opportunity_kind}</Badge>
                          {items.length > 1 && <Badge className="text-[10px]">{items.length} reports</Badge>}
                        </div>
                        {first.opportunity_link && (
                          <a href={first.opportunity_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            {first.opportunity_link.replace(/^https?:\/\//, "").slice(0, 60)} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {onOpenOpportunity && (
                        <Button size="sm" variant="outline" onClick={() => onOpenOpportunity(first.opportunity_kind, first.opportunity_id)}>
                          Abrir no editor
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {items.map((r) => (
                        <div key={r.id} className="flex items-start gap-2 text-xs border-l-2 border-muted pl-2 py-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{REASON_LABEL[r.reason] || r.reason}</p>
                            {r.comment && <p className="text-muted-foreground italic mt-0.5">"{r.comment}"</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                          {filter === "open" && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" disabled={busy.has(r.id)} onClick={() => updateStatus(r.id, "resolved")} title="Resolver">
                                {busy.has(r.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                              </Button>
                              <Button size="icon" variant="ghost" disabled={busy.has(r.id)} onClick={() => updateStatus(r.id, "ignored")} title="Ignorar">
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
