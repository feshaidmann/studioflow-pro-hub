import { useMemo, useState } from "react";
import { GitCompare, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrackVersions } from "@/hooks/useTrackVersions";
import { trackSlug } from "@/lib/trackSlug";
import { TrackVersionCompare } from "@/components/music-dna/TrackVersionCompare";

interface Props {
  trackName: string;
  currentAnalysisId?: string;
}

export function TrackVersionsPanel({ trackName, currentAnalysisId }: Props) {
  const { data: groups = [], isLoading } = useTrackVersions();
  const [compareOpen, setCompareOpen] = useState(false);

  const slug = useMemo(() => trackSlug(trackName), [trackName]);
  const group = useMemo(
    () => groups.find((g) => g.trackSlug === slug),
    [groups, slug],
  );

  if (isLoading || !group || group.versions.length < 1) return null;

  const sorted = [...group.versions].sort(
    (a, b) => (a.version_number ?? 0) - (b.version_number ?? 0),
  );

  const canCompare = sorted.length >= 2;

  return (
    <>
      <Card className="border-border animate-fade-in">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Versões desta música
              </p>
              <Badge variant="outline" className="text-[10px] font-mono">
                {sorted.length}
              </Badge>
            </div>
            {canCompare && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => setCompareOpen(true)}
              >
                <GitCompare className="h-3.5 w-3.5" />
                Comparar versões
              </Button>
            )}
          </div>

          <ul className="space-y-1.5">
            {sorted.map((v) => {
              const lufs = v.diagnosis?.realAnalysis?.lufs_integrated;
              const dr = v.diagnosis?.realAnalysis?.dynamic_range_lu;
              const dateStr = new Date(v.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });
              const isCurrent = v.id === currentAnalysisId;
              return (
                <li
                  key={v.id}
                  className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${
                    isCurrent ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                      {v.version_label ?? `v${v.version_number ?? "?"}`}
                    </Badge>
                    <span className="text-muted-foreground shrink-0">{dateStr}</span>
                    {v.summary_variant && (
                      <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                        Resumo {v.summary_variant}
                      </Badge>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-primary">(atual)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-foreground/70 shrink-0">
                    {typeof lufs === "number" && (
                      <span>{lufs.toFixed(1)} LUFS</span>
                    )}
                    {typeof dr === "number" && (
                      <span>{dr.toFixed(1)} DR</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {canCompare && (
        <TrackVersionCompare
          open={compareOpen}
          onOpenChange={setCompareOpen}
          versions={sorted}
          defaultLeftId={sorted[sorted.length - 2].id}
          defaultRightId={sorted[sorted.length - 1].id}
        />
      )}
    </>
  );
}
