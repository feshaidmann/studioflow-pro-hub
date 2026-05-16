import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TrackVersionRow } from "@/hooks/useTrackVersions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: TrackVersionRow[];
  defaultLeftId: string;
  defaultRightId: string;
}

interface MetricSpec {
  key: string;
  label: string;
  unit: string;
  digits: number;
  /** "higher" => mais alto é melhor; "lower" => mais baixo é melhor; "neutral" => sem viés */
  preference: "higher" | "lower" | "neutral";
  get: (v: TrackVersionRow) => number | null | undefined;
}

const METRICS: MetricSpec[] = [
  {
    key: "lufs",
    label: "LUFS integrado",
    unit: "LUFS",
    digits: 1,
    preference: "neutral",
    get: (v) => v.diagnosis?.realAnalysis?.lufs_integrated,
  },
  {
    key: "tp",
    label: "True Peak",
    unit: "dBTP",
    digits: 2,
    preference: "lower",
    get: (v) => v.diagnosis?.realAnalysis?.true_peak_dbtp,
  },
  {
    key: "dr",
    label: "Dynamic Range",
    unit: "LU",
    digits: 1,
    preference: "higher",
    get: (v) => v.diagnosis?.realAnalysis?.dynamic_range_lu,
  },
  {
    key: "bpm",
    label: "BPM",
    unit: "",
    digits: 0,
    preference: "neutral",
    get: (v) => v.diagnosis?.realAnalysis?.bpm,
  },
  {
    key: "centroid",
    label: "Centroide espectral",
    unit: "Hz",
    digits: 0,
    preference: "neutral",
    get: (v) => v.diagnosis?.realAnalysis?.spectral_centroid_hz,
  },
];

function fmt(n: number | null | undefined, digits: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function TrackVersionCompare({
  open,
  onOpenChange,
  versions,
  defaultLeftId,
  defaultRightId,
}: Props) {
  const [leftId, setLeftId] = useState(defaultLeftId);
  const [rightId, setRightId] = useState(defaultRightId);

  const left = useMemo(() => versions.find((v) => v.id === leftId), [versions, leftId]);
  const right = useMemo(() => versions.find((v) => v.id === rightId), [versions, rightId]);

  const renderHeader = (v: TrackVersionRow | undefined) => {
    if (!v) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {v.version_label ?? `v${v.version_number ?? "?"}`}
          </Badge>
          {v.summary_variant && (
            <Badge variant="outline" className="text-[10px] font-mono">
              Resumo {v.summary_variant}
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            {new Date(v.created_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
        <p className="text-sm font-medium">{v.track_name}</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Comparar versões</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.version_label ?? `v${v.version_number ?? "?"}`} ·{" "}
                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.version_label ?? `v${v.version_number ?? "?"}`} ·{" "}
                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-3 bg-muted/20">
            {renderHeader(left)}
          </div>
          <div className="rounded-md border border-border p-3 bg-muted/20">
            {renderHeader(right)}
          </div>
        </div>

        {/* Resumos lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Resumo executivo
            </p>
            <p className="text-xs leading-relaxed text-foreground/85">
              {left?.diagnosis?.diagnostico_resumo ?? "—"}
            </p>
          </div>
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Resumo executivo
            </p>
            <p className="text-xs leading-relaxed text-foreground/85">
              {right?.diagnosis?.diagnostico_resumo ?? "—"}
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Métrica</th>
                <th className="text-right px-3 py-2 font-mono text-muted-foreground">
                  {left?.version_label ?? "A"}
                </th>
                <th className="text-right px-3 py-2 font-mono text-muted-foreground">
                  {right?.version_label ?? "B"}
                </th>
                <th className="text-right px-3 py-2 font-mono text-muted-foreground">Δ</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => {
                const a = left ? m.get(left) : null;
                const b = right ? m.get(right) : null;
                const hasBoth =
                  typeof a === "number" && Number.isFinite(a) &&
                  typeof b === "number" && Number.isFinite(b);
                const delta = hasBoth ? (b as number) - (a as number) : null;
                let color = "text-muted-foreground";
                let Icon = ArrowRight;
                if (delta != null && Math.abs(delta) > 0.05) {
                  if (m.preference === "higher") {
                    color = delta > 0 ? "text-primary" : "text-destructive";
                  } else if (m.preference === "lower") {
                    color = delta < 0 ? "text-primary" : "text-destructive";
                  } else {
                    color = "text-foreground/70";
                  }
                  Icon = delta > 0 ? ArrowUp : ArrowDown;
                }
                return (
                  <tr key={m.key} className="border-t border-border/60">
                    <td className="px-3 py-2">
                      <span className="text-foreground">{m.label}</span>
                      {m.unit && (
                        <span className="text-muted-foreground"> ({m.unit})</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(a, m.digits)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(b, m.digits)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${color}`}>
                      {delta == null ? (
                        "—"
                      ) : (
                        <span className="inline-flex items-center justify-end gap-1">
                          <Icon className="h-3 w-3" />
                          {fmt(Math.abs(delta), m.digits)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
