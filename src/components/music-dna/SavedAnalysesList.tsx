import { useState } from "react";
import { FileAudio, History, ChevronRight, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSavedAnalyses, type SavedAnalysis } from "@/hooks/useSavedAnalyses";
import { LinkAnalysisTrackDialog } from "@/components/spotify-import/LinkAnalysisTrackDialog";

// ── SAVED ANALYSES LIST ──────────────────────────────────────────────────────

export function SavedAnalysesList({ onLoad }: {
  onLoad: (analysis: SavedAnalysis) => void;
}) {
  const { savedAnalyses, isLoading, deleteAnalysis } = useSavedAnalyses();
  const [linkTarget, setLinkTarget] = useState<{ analysisId: string; analysisLabel: string; currentTrackId: string | null } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading || savedAnalyses.length === 0) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2"
          onClick={() => setCollapsed((v) => !v)}
        >
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> Análises salvas
            <span className="text-muted-foreground font-normal normal-case tracking-normal">
              ({savedAnalyses.length})
            </span>
          </CardTitle>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              collapsed ? "" : "rotate-90"
            )}
          />
        </button>
      </CardHeader>
      {!collapsed && (
      <CardContent className="space-y-1.5">
        {savedAnalyses.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => onLoad(a)}
          >
            <FileAudio className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{a.track_name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {a.genre} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                {a.spotify_tracks && (
                  <span className="ml-2 text-primary">
                    · 🔗 {a.spotify_tracks.spotify_releases?.name ?? "Catálogo"} / {a.spotify_tracks.name}
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              title={a.spotify_track_id ? "Editar vínculo de catálogo" : "Vincular faixa do catálogo"}
              onClick={(e) => {
                e.stopPropagation();
                setLinkTarget({ analysisId: a.id, analysisLabel: a.track_name, currentTrackId: a.spotify_track_id ?? null });
              }}
            >
              <Link2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
      )}
      <LinkAnalysisTrackDialog
        open={linkTarget !== null}
        onOpenChange={(o) => !o && setLinkTarget(null)}
        mode={linkTarget ? {
          kind: "pick-track",
          analysisId: linkTarget.analysisId,
          analysisLabel: linkTarget.analysisLabel,
          currentTrackId: linkTarget.currentTrackId,
        } : null}
      />
    </Card>
  );
}
