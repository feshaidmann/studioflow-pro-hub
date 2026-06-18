import { useState } from "react";
import { Users2 } from "lucide-react";
import { trackAppEvent } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { NeighborDetailDialog } from "@/components/music-dna/NeighborDetailDialog";
import type { CatalogNeighbor } from "@/hooks/useMusicDNA";

interface Props {
  neighbors: CatalogNeighbor[] | undefined;
  totalCompared?: number;
  userTrack: {
    bpm?: number | null;
    lufs?: number | null;
    energy?: number | null;
    danceability?: number | null;
    dynamic_range?: number | null;
    spectral_centroid?: number | null;
    key?: string | null;
  };
  limit?: number;
}

function cleanTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+\s*[-._]\s*/, "")
    .trim();
}

export function CatalogNeighborsPanel({ neighbors, totalCompared, userTrack, limit = 5 }: Props) {
  const [selected, setSelected] = useState<CatalogNeighbor | null>(null);

  const list = (neighbors ?? []).slice(0, limit);

  return (
    <>
      <Card className="border-primary/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" />
            Vizinhos no catálogo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Quais faixas reais do banco têm timbre e dinâmica mais parecidos com a sua.
            {typeof totalCompared === "number" && totalCompared > 0 && (
              <> Comparado com {totalCompared.toLocaleString("pt-BR")} referências.</>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {list.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma faixa próxima encontrada no catálogo com as features extraídas.
            </p>
          )}
          {list.map((n, idx) => {
            const sim = Math.round((Number(n.similarity_score) || 0) * 100);
            const tone =
              sim >= 80 ? "text-primary" : sim >= 55 ? "text-amber-600" : "text-muted-foreground";
            return (
              <button
                key={`${n.band}-${n.filename}-${idx}`}
                type="button"
                onClick={() => {
                  setSelected(n);
                  trackAppEvent("neighbor_clicked", {
                    similarity: Math.round((Number(n.similarity_score) || 0) * 100),
                    genre: n.genre ?? null,
                  });
                }}
                className="w-full text-left rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors p-2.5 space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {n.band}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {cleanTitle(n.filename)}
                      {n.genre && <> · <span className="uppercase tracking-wide">{n.genre}</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn("text-base font-mono leading-none", tone)}>{sim}%</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">proximidade</div>
                  </div>
                </div>
                <Progress value={sim} className="h-1" aria-label={`Proximidade ${sim}%`} />
              </button>
            );
          })}
          {list.length > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Toque numa faixa para ver delta de LUFS, BPM, dinâmica e preview público.
            </p>
          )}
        </CardContent>
      </Card>

      <NeighborDetailDialog
        neighbor={selected}
        userTrack={userTrack}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </>
  );
}

export default CatalogNeighborsPanel;
