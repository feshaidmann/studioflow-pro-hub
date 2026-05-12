import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogNeighbor } from "@/hooks/useMusicDNA";
import { useNeighborEnrichment } from "@/hooks/useNeighborEnrichment";

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

          <NeighborEnrichmentSection artist={neighbor.band} title={neighbor.filename} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NeighborEnrichmentSection({ artist, title }: { artist: string; title: string }) {
  // Tenta tirar título limpo do filename (remove extensão e prefixos numéricos)
  const cleanTitle = title.replace(/\.[^.]+$/, "").replace(/^\d+\s*[-._]\s*/, "").trim();
  const { data, isLoading } = useNeighborEnrichment(artist, cleanTitle);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground animate-pulse">
        Buscando contexto público da referência…
      </div>
    );
  }

  if (!data || (!data.deezer_preview_url && !data.musicbrainz_tags?.length && !data.listenbrainz_similar?.length)) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3 w-3" /> Contexto público
      </div>

      {data.deezer_preview_url && (
        <div className="flex items-center gap-3">
          {data.deezer_cover_url && (
            <img src={data.deezer_cover_url} alt={artist} className="h-12 w-12 rounded-md object-cover" loading="lazy" />
          )}
          <audio controls preload="none" src={data.deezer_preview_url} className="h-9 flex-1 min-w-0">
            Seu navegador não suporta áudio.
          </audio>
        </div>
      )}

      {data.musicbrainz_tags?.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">Tags coletivas (MusicBrainz)</div>
          <div className="flex flex-wrap gap-1.5">
            {data.musicbrainz_tags.slice(0, 8).map((t) => (
              <Badge key={t.name} variant="secondary" className="text-[10px] font-normal">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.listenbrainz_similar?.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" /> Quem ouve isso também ouve (ListenBrainz)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.listenbrainz_similar.slice(0, 6).map((a) => (
              <Badge key={a.name} variant="outline" className="text-[10px] font-normal">
                {a.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        Dados públicos via Deezer · MusicBrainz · ListenBrainz. Comparativo cultural complementar — não substitui análise técnica.
      </p>
    </div>
  );
}
