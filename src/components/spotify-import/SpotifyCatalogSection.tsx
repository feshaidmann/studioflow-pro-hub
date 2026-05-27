import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Disc3, Music, Trash2, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useSpotifyCatalog,
  useDeleteSpotifyRelease,
  useCatalogPopularity,
} from "@/hooks/useSpotifyImport";
import { LinkAnalysisTrackDialog } from "@/components/spotify-import/LinkAnalysisTrackDialog";

const TYPE_LABEL: Record<string, string> = {
  album: "Álbum",
  ep: "EP",
  single: "Single",
  compilation: "Compilação",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function popularityBadgeColor(p: number): string {
  if (p >= 61) return "bg-emerald-50 text-emerald-700";
  if (p >= 41) return "bg-blue-50 text-blue-700";
  if (p >= 21) return "bg-amber-50 text-amber-700";
  return "bg-muted text-muted-foreground";
}

function maxPopColor(p: number): string {
  if (p >= 61) return "text-emerald-600";
  if (p >= 41) return "text-blue-600";
  if (p >= 21) return "text-amber-600";
  return "text-muted-foreground";
}

export function SpotifyCatalogSection() {
  const { data: releases = [], isLoading } = useSpotifyCatalog();
  const deleteRelease = useDeleteSpotifyRelease();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "popularity">("date");
  const [linkTarget, setLinkTarget] = useState<{ trackId: string; trackLabel: string; currentAnalysisId: string | null } | null>(null);

  const allTrackIds = useMemo(
    () => releases.flatMap((r) => (r.tracks ?? []).map((t) => t.spotify_track_id)),
    [releases],
  );
  const { data: popularityMap = {} } = useCatalogPopularity(allTrackIds);

  const sortedReleases = useMemo(() => {
    if (sortBy === "date") return releases;
    return [...releases].sort((a, b) => {
      const maxA = (a.tracks ?? []).reduce(
        (m, t) => Math.max(m, popularityMap[t.spotify_track_id] ?? 0),
        0,
      );
      const maxB = (b.tracks ?? []).reduce(
        (m, t) => Math.max(m, popularityMap[t.spotify_track_id] ?? 0),
        0,
      );
      return maxB - maxA;
    });
  }, [releases, sortBy, popularityMap]);

  if (isLoading || releases.length === 0) return null;

  async function handleDelete(id: string) {
    try {
      await deleteRelease.mutateAsync(id);
      toast.success("Lançamento removido do catálogo");
    } catch {
      toast.error("Não foi possível remover");
    } finally {
      setConfirmId(null);
    }
  }

  const hasPopularityData = Object.keys(popularityMap).length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Disc3 className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Catálogo Publicado</h2>
          <Badge variant="secondary" className="text-[10px]">
            {releases.length} {releases.length === 1 ? "lançamento" : "lançamentos"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSortBy("date")}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              sortBy === "date" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recentes
          </button>
          <button
            type="button"
            onClick={() => setSortBy("popularity")}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              sortBy === "popularity" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Popularidade
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sortedReleases.map((r) => {
          const isExpanded = expandedId === r.id;
          const year = r.release_date?.slice(0, 4) ?? "—";
          const tracks = r.tracks ?? [];
          const maxPop = tracks.reduce<number | null>((max, t) => {
            const p = popularityMap[t.spotify_track_id];
            if (typeof p !== "number") return max;
            return max === null ? p : Math.max(max, p);
          }, null);

          return (
            <div
              key={r.id}
              className="border border-border rounded-xl bg-card overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={r.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {year} · {r.total_tracks ?? 0}{" "}
                      {(r.total_tracks ?? 0) === 1 ? "faixa" : "faixas"}
                    </p>
                  </div>
                  {maxPop !== null && (
                    <span
                      className={`text-xs font-medium tabular-nums flex-shrink-0 ${maxPopColor(maxPop)}`}
                      title="Popularidade máxima das faixas"
                    >
                      ↑{maxPop}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {TYPE_LABEL[r.release_type] ?? r.release_type}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.spotify_album_uri && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Abrir no Spotify"
                    >
                      <a
                        href={`https://open.spotify.com/album/${r.spotify_album_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmId(r.id)}
                    title="Remover do catálogo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isExpanded && tracks.length > 0 && (
                <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1">
                  {tracks
                    .slice()
                    .sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0))
                    .map((t) => {
                      const pop = popularityMap[t.spotify_track_id];
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 text-xs py-1.5"
                        >
                          <span className="w-6 text-muted-foreground text-right tabular-nums">
                            {t.track_number ?? "—"}
                          </span>
                          <span className="flex-1 truncate text-foreground">{t.name}</span>
                          {pop === undefined ? null : pop === null ? (
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">—</span>
                          ) : (
                            <span
                              className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium tabular-nums shrink-0 ${popularityBadgeColor(pop)}`}
                              title="Popularidade Spotify"
                            >
                              {pop}
                            </span>
                          )}
                          {t.linked_analysis && (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Link2 className="h-2.5 w-2.5" />
                              DNA {t.linked_analysis.version_label ?? `v${t.linked_analysis.version_number ?? 1}`}
                            </Badge>
                          )}
                          {t.isrc && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {t.isrc}
                            </span>
                          )}
                          <span className="text-muted-foreground tabular-nums w-10 text-right">
                            {formatDuration(t.duration_ms)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title={t.linked_analysis ? "Editar vínculo de análise" : "Vincular análise"}
                            onClick={() => setLinkTarget({
                              trackId: t.id,
                              trackLabel: t.name,
                              currentAnalysisId: t.linked_analysis?.id ?? null,
                            })}
                          >
                            <Link2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasPopularityData && (
        <p className="text-[10px] text-muted-foreground text-right">
          Popularidade Spotify: <span className="text-emerald-700">61–100 alta</span> ·{" "}
          <span className="text-blue-700">41–60 moderada</span> ·{" "}
          <span className="text-amber-700">21–40 crescimento</span> · 0–20 inicial
        </p>
      )}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento e todas as suas faixas serão removidos do catálogo. Monitoramentos de
              playlist associados a essas faixas continuarão ativos mas não terão faixa vinculada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && handleDelete(confirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkAnalysisTrackDialog
        open={linkTarget !== null}
        onOpenChange={(o) => !o && setLinkTarget(null)}
        mode={linkTarget ? {
          kind: "pick-analysis",
          trackId: linkTarget.trackId,
          trackLabel: linkTarget.trackLabel,
          currentAnalysisId: linkTarget.currentAnalysisId,
        } : null}
      />
    </section>
  );
}
