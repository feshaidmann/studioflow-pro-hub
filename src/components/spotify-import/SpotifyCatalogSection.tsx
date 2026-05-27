import { useState } from "react";
import { ChevronDown, ChevronRight, Disc3, Music, Trash2, ExternalLink } from "lucide-react";
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
import { useSpotifyCatalog, useDeleteSpotifyRelease } from "@/hooks/useSpotifyImport";

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

export function SpotifyCatalogSection() {
  const { data: releases = [], isLoading } = useSpotifyCatalog();
  const deleteRelease = useDeleteSpotifyRelease();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Disc3 className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Catálogo Publicado</h2>
        <Badge variant="secondary" className="text-[10px]">
          {releases.length} {releases.length === 1 ? "lançamento" : "lançamentos"}
        </Badge>
      </div>

      <div className="space-y-2">
        {releases.map((r) => {
          const isExpanded = expandedId === r.id;
          const year = r.release_date?.slice(0, 4) ?? "—";
          const tracks = r.tracks ?? [];

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
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 text-xs py-1.5"
                      >
                        <span className="w-6 text-muted-foreground text-right tabular-nums">
                          {t.track_number ?? "—"}
                        </span>
                        <span className="flex-1 truncate text-foreground">{t.name}</span>
                        {t.isrc && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {t.isrc}
                          </span>
                        )}
                        <span className="text-muted-foreground tabular-nums w-10 text-right">
                          {formatDuration(t.duration_ms)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
    </section>
  );
}
