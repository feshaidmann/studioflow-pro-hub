import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogNeighbor } from "@/hooks/useMusicDNA";

interface UserTrack {
  bpm?: number | null;
  lufs?: number | null;
  energy?: number | null;
  danceability?: number | null;
  dynamic_range?: number | null;
  spectral_centroid?: number | null;
  key?: string | null;
}

interface MetricRow {
  label: string;
  unit: string;
  user: number | null | undefined;
  ref: number | null | undefined;
  digits?: number;
  interpret: (delta: number) => string;
  higherIsBetter?: "user" | "ref" | "neutral";
}

const fmt = (n: number | null | undefined, digits = 1) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

export function NeighborDetailDialog({
  neighbor,
  userTrack,
  open,
  onOpenChange,
}: {
  neighbor: CatalogNeighbor | null;
  userTrack: UserTrack;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!neighbor) return null;

  const sim = Math.round((Number(neighbor.similarity_score) || 0) * 100);

  const rows: MetricRow[] = [
    {
      label: "BPM",
      unit: "",
      user: userTrack.bpm,
      ref: neighbor.tempo_bpm,
      digits: 0,
      interpret: (d) =>
        Math.abs(d) < 2
          ? "Pulso praticamente igual."
          : d > 0
          ? `Sua faixa está ${Math.abs(d).toFixed(0)} BPM mais rápida — pode soar mais urgente.`
          : `Sua faixa está ${Math.abs(d).toFixed(0)} BPM mais lenta — sensação mais relaxada.`,
    },
    {
      label: "LUFS",
      unit: "LUFS",
      user: userTrack.lufs,
      ref: neighbor.lufs_integrated,
      digits: 1,
      interpret: (d) =>
        Math.abs(d) < 0.5
          ? "Volume percebido equivalente."
          : d > 0
          ? `Sua faixa está ${Math.abs(d).toFixed(1)} dB mais alta — competitiva no streaming.`
          : `Sua faixa está ${Math.abs(d).toFixed(1)} dB mais baixa — pode soar tímida ao lado dessa referência. Considere subir o nível geral no master.`,
    },
    {
      label: "Energia",
      unit: "",
      user: userTrack.energy,
      ref: neighbor.energy,
      digits: 2,
      interpret: (d) =>
        Math.abs(d) < 0.05
          ? "Mesmo nível de intensidade."
          : d > 0
          ? "Sua faixa entrega mais intensidade — bom para playlists de ativação."
          : "A referência tem mais punch — vale revisar dinâmica do refrão e densidade do arranjo.",
    },
    {
      label: "Dançabilidade",
      unit: "",
      user: userTrack.danceability,
      ref: neighbor.danceability,
      digits: 2,
      interpret: (d) =>
        Math.abs(d) < 0.05
          ? "Apelo de dança equivalente."
          : d > 0
          ? "Sua faixa convida mais ao movimento."
          : "A referência é mais dançante — groove mais marcado pode ajudar.",
    },
    {
      label: "Dynamic Range",
      unit: "LU",
      user: userTrack.dynamic_range,
      ref: neighbor.dynamic_range_db,
      digits: 1,
      interpret: (d) =>
        Math.abs(d) < 1
          ? "Mesma respiração dinâmica."
          : d > 0
          ? "Sua faixa tem mais range — mais espaço entre suaves e fortes."
          : "A referência respira mais — talvez seu master esteja comprimindo demais.",
    },
    {
      label: "Centroide espectral",
      unit: "Hz",
      user: userTrack.spectral_centroid,
      ref: neighbor.spectral_centroid,
      digits: 0,
      interpret: (d) =>
        Math.abs(d) < 200
          ? "Brilho semelhante."
          : d > 0
          ? "Sua faixa é mais brilhante — equilibre se estiver fadigando o ouvido."
          : "Sua faixa é mais escura — pode ganhar presença com ar em 8–12 kHz.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span className="truncate">{neighbor.band}</span>
            <Badge variant="outline" className={cn(
              "font-mono text-xs",
              sim >= 80 ? "bg-primary/10 text-primary border-primary/30"
              : sim >= 55 ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
              : "bg-muted text-muted-foreground border-border"
            )}>
              {sim}% proximidade técnica
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {neighbor.filename}
            {neighbor.genre && <> · <span className="uppercase tracking-wide">{neighbor.genre}</span></>}
            {neighbor.key_name && <> · Tom {neighbor.key_name}{neighbor.mode ? ` ${neighbor.mode}` : ""}</>}
            <div className="mt-2 text-[11px] text-foreground/60">
              Comparação por LUFS, dinâmica, espectro, ritmo e atributos perceptivos. Não é identificação por fingerprint.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>Sua faixa</span>
            <span className="text-center">Δ</span>
            <span className="text-right">Referência</span>
          </div>
          {rows.map((r) => {
            const hasBoth =
              typeof r.user === "number" && Number.isFinite(r.user) &&
              typeof r.ref === "number" && Number.isFinite(r.ref);
            const delta = hasBoth ? (r.user as number) - (r.ref as number) : null;
            const Icon = delta == null ? Minus : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
            return (
              <div key={r.label} className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    {r.label}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className="text-base font-bold text-primary">
                    {fmt(r.user, r.digits)} <span className="text-xs text-muted-foreground font-normal">{r.unit}</span>
                  </span>
                  <span className={cn(
                    "inline-flex items-center justify-center h-6 w-6 rounded-full",
                    delta == null ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-base font-bold text-right text-foreground/80">
                    {fmt(r.ref, r.digits)} <span className="text-xs text-muted-foreground font-normal">{r.unit}</span>
                  </span>
                </div>
                {hasBoth && (
                  <p className="text-xs leading-relaxed text-foreground/70 pt-1 border-t border-border/40">
                    {r.interpret(delta as number)}
                  </p>
                )}
              </div>
            );
          })}

          {/* TODO: Player de preview — adicionar quando tivermos URLs de áudio em music_reference_tracks */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
