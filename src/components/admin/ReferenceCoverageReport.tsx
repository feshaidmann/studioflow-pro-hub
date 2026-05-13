import { useEffect, useState, useMemo } from "react";
import Papa from "papaparse";
import { Loader2, RefreshCw, Download, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CoverageRow {
  genre: string;
  total: number;
  active: number;
  quarantined: number;
  healthy_pct: number;
  distinct_bands_active: number;
  avg_dims_filled: number;
  pct_above_floor: number;
  tracks_per_band_avg: number;
  tracks_per_band_max: number;
  monopoly_risk: number;
  lufs_stddev: number;
  bpm_stddev: number;
  centroid_stddev: number;
  dr_stddev: number;
  quality_score: number;
  quality_label: "Crítico" | "Frágil" | "Aceitável" | "Sólido" | string;
}

const labelVariant = (label: string) => {
  switch (label) {
    case "Sólido": return "default" as const;
    case "Aceitável": return "secondary" as const;
    case "Frágil": return "outline" as const;
    case "Crítico": return "destructive" as const;
    default: return "outline" as const;
  }
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const fmtNum = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function ReferenceCoverageReport() {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("report_reference_coverage");
      if (error) throw error;
      setRows((data ?? []) as CoverageRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar cobertura");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const active = rows.reduce((s, r) => s + r.active, 0);
    const quarantined = rows.reduce((s, r) => s + r.quarantined, 0);
    const total = active + quarantined;
    const critical = rows.filter((r) => r.quality_label === "Crítico").length;
    const fragile = rows.filter((r) => r.quality_label === "Frágil").length;
    return { active, quarantined, total, critical, fragile, healthyPct: total > 0 ? active / total : 0 };
  }, [rows]);

  const toggle = (genre: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre); else next.add(genre);
      return next;
    });
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const exportRows = rows.map((r) => ({
      genero: r.genre,
      total: r.total,
      ativas: r.active,
      quarentenadas: r.quarantined,
      saudavel_pct: fmtPct(r.healthy_pct),
      bandas_distintas: r.distinct_bands_active,
      dimensoes_medias: fmtNum(r.avg_dims_filled, 2),
      acima_do_piso_pct: fmtPct(r.pct_above_floor),
      faixas_por_banda_media: fmtNum(r.tracks_per_band_avg, 2),
      faixas_por_banda_max: r.tracks_per_band_max,
      risco_monopolio: fmtNum(r.monopoly_risk, 3),
      desvio_lufs: fmtNum(r.lufs_stddev, 3),
      desvio_bpm: fmtNum(r.bpm_stddev, 3),
      desvio_centroid: fmtNum(r.centroid_stddev, 1),
      desvio_dr: fmtNum(r.dr_stddev, 3),
      score_qualidade: fmtNum(r.quality_score, 1),
      classificacao: r.quality_label,
    }));
    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cobertura-referencias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Faixas ativas</div>
          <div className="text-2xl font-semibold">{summary.active.toLocaleString("pt-BR")}</div>
          <div className="text-[11px] text-muted-foreground">de {summary.total.toLocaleString("pt-BR")} no catálogo</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Em quarentena</div>
          <div className="text-2xl font-semibold">{summary.quarantined.toLocaleString("pt-BR")}</div>
          <div className="text-[11px] text-muted-foreground">excluídas do RPC</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">% saudável global</div>
          <div className="text-2xl font-semibold">{fmtPct(summary.healthyPct)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Gêneros frágeis / críticos</div>
          <div className="text-2xl font-semibold">{summary.fragile} / {summary.critical}</div>
          <div className="text-[11px] text-muted-foreground">de {rows.length} gêneros</div>
        </CardContent></Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Score (0–100)</strong> = 30% saúde do catálogo + 25% volume (ideal ≥30 ativas) +
          25% % de faixas com pelo menos 8 das 15 dimensões técnicas + 20% diversidade
          (penaliza monopólio de um único artista). Reflete a confiança esperada nos resultados de
          <em> Referências mais próximas</em>.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Cobertura por gênero</CardTitle>
            <CardDescription>Clique em uma linha para detalhar dimensões, diversidade e dispersão estatística.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead className="text-right">Ativas</TableHead>
                <TableHead className="text-right">Quarentena</TableHead>
                <TableHead className="text-right">Bandas</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Classificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sem dados.</TableCell></TableRow>
              )}
              {rows.map((r) => {
                const open = expanded.has(r.genre);
                return (
                  <>
                    <TableRow
                      key={r.genre}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggle(r.genre)}
                    >
                      <TableCell>
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{r.genre || "(sem gênero)"}</TableCell>
                      <TableCell className="text-right">{r.active}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.quarantined}</TableCell>
                      <TableCell className="text-right">{r.distinct_bands_active}</TableCell>
                      <TableCell className="text-right font-mono">{fmtNum(r.quality_score, 1)}</TableCell>
                      <TableCell>
                        <Badge variant={labelVariant(r.quality_label)} className="text-[10px]">
                          {r.quality_label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={`${r.genre}-detail`} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={6} className="text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 py-2">
                            <div>
                              <div className="text-muted-foreground mb-1">Cobertura simples</div>
                              <div>Total: <strong>{r.total}</strong></div>
                              <div>Saudável: <strong>{fmtPct(r.healthy_pct)}</strong></div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-1">Dimensões técnicas (de 15)</div>
                              <div>Média: <strong>{fmtNum(r.avg_dims_filled, 2)}</strong></div>
                              <div>Acima do piso (≥8): <strong>{fmtPct(r.pct_above_floor)}</strong></div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-1">Diversidade</div>
                              <div>Faixas/banda: <strong>{fmtNum(r.tracks_per_band_avg, 2)}</strong> (máx {r.tracks_per_band_max})</div>
                              <div>Risco de monopólio: <strong>{fmtNum(r.monopoly_risk * 100, 1)}%</strong></div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-1">Dispersão estatística</div>
                              <div>LUFS σ: <strong>{fmtNum(r.lufs_stddev, 2)}</strong></div>
                              <div>BPM σ: <strong>{fmtNum(r.bpm_stddev, 1)}</strong></div>
                              <div>Centroid σ: <strong>{fmtNum(r.centroid_stddev, 0)}</strong> Hz</div>
                              <div>DR σ: <strong>{fmtNum(r.dr_stddev, 2)}</strong></div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
