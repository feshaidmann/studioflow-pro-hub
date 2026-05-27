import { useMemo, useState } from "react";
import { Search, Link2, X, Disc3, FileAudio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpotifyCatalog } from "@/hooks/useSpotifyImport";
import { useSavedAnalyses } from "@/hooks/useSavedAnalyses";
import { useLinkAnalysisToSpotifyTrack } from "@/hooks/useAnalysisCatalogLink";

/** Modos:
 *  - "pick-track" : abrir a partir de uma análise; usuário escolhe a faixa do catálogo
 *  - "pick-analysis" : abrir a partir de uma faixa do catálogo; usuário escolhe a análise
 */
type Mode =
  | { kind: "pick-track"; analysisId: string; currentTrackId?: string | null; analysisLabel: string }
  | { kind: "pick-analysis"; trackId: string; currentAnalysisId?: string | null; trackLabel: string };

export function LinkAnalysisTrackDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode | null;
}) {
  const [q, setQ] = useState("");
  const { data: releases = [] } = useSpotifyCatalog();
  const { savedAnalyses } = useSavedAnalyses();
  const linkMut = useLinkAnalysisToSpotifyTrack();

  const trackOptions = useMemo(() => {
    if (mode?.kind !== "pick-track") return [];
    const items: Array<{
      trackId: string;
      trackName: string;
      releaseName: string;
      image: string | null;
      number: number | null;
      taken: boolean;
      currentAnalysisId: string | null;
    }> = [];
    for (const r of releases) {
      for (const t of r.tracks ?? []) {
        items.push({
          trackId: t.id,
          trackName: t.name,
          releaseName: r.name,
          image: r.image_url,
          number: t.track_number,
          taken: !!t.linked_analysis && t.linked_analysis.id !== mode.analysisId,
          currentAnalysisId: t.linked_analysis?.id ?? null,
        });
      }
    }
    const needle = q.trim().toLowerCase();
    return needle
      ? items.filter((i) => i.trackName.toLowerCase().includes(needle) || i.releaseName.toLowerCase().includes(needle))
      : items;
  }, [mode, releases, q]);

  const analysisOptions = useMemo(() => {
    if (mode?.kind !== "pick-analysis") return [];
    const linkedTrackIds = new Set<string>();
    for (const r of releases) for (const t of r.tracks ?? []) if (t.linked_analysis) linkedTrackIds.add(t.linked_analysis.id);
    const items = savedAnalyses.map((a: any) => ({
      id: a.id,
      label: a.track_name,
      sub: `${a.version_label ?? "v1"} · ${a.genre || "—"} · ${new Date(a.created_at).toLocaleDateString("pt-BR")}`,
      taken: !!a.spotify_track_id && a.id !== (mode.currentAnalysisId ?? null) ? true : linkedTrackIds.has(a.id),
    }));
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((i) => i.label.toLowerCase().includes(needle)) : items;
  }, [mode, savedAnalyses, releases, q]);

  async function handlePickTrack(trackId: string | null) {
    if (mode?.kind !== "pick-track") return;
    await linkMut.mutateAsync({ analysisId: mode.analysisId, spotifyTrackId: trackId });
    onOpenChange(false);
  }
  async function handlePickAnalysis(analysisId: string | null) {
    if (mode?.kind !== "pick-analysis") return;
    if (analysisId) {
      await linkMut.mutateAsync({ analysisId, spotifyTrackId: mode.trackId });
    } else if (mode.currentAnalysisId) {
      await linkMut.mutateAsync({ analysisId: mode.currentAnalysisId, spotifyTrackId: null });
    }
    onOpenChange(false);
  }

  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            {mode.kind === "pick-track" ? "Vincular faixa do catálogo" : "Vincular análise"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode.kind === "pick-track"
              ? <>Escolha a faixa do catálogo que corresponde a <strong>{mode.analysisLabel}</strong>.</>
              : <>Escolha a análise que corresponde a <strong>{mode.trackLabel}</strong>.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode.kind === "pick-track" ? "Buscar faixa ou álbum..." : "Buscar análise..."}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <ScrollArea className="h-[320px] -mx-1 px-1">
          {mode.kind === "pick-track" && (
            <div className="space-y-1">
              {trackOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-6 text-center">
                  Nenhuma faixa encontrada. Importe seu catálogo em Projetos.
                </p>
              ) : (
                trackOptions.map((t) => {
                  const isCurrent = t.currentAnalysisId === mode.analysisId;
                  return (
                    <button
                      key={t.trackId}
                      disabled={t.taken && !isCurrent}
                      onClick={() => handlePickTrack(t.trackId)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg border border-border bg-card hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
                    >
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : <Disc3 className="w-full h-full p-2 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{t.number ? `${t.number}. ` : ""}{t.trackName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{t.releaseName}</p>
                      </div>
                      {isCurrent && <Badge variant="secondary" className="text-[10px]">vinculada</Badge>}
                      {t.taken && !isCurrent && <Badge variant="outline" className="text-[10px]">indisponível</Badge>}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {mode.kind === "pick-analysis" && (
            <div className="space-y-1">
              {analysisOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-6 text-center">
                  Nenhuma análise salva ainda. Gere uma análise em Music DNA.
                </p>
              ) : (
                analysisOptions.map((a) => {
                  const isCurrent = a.id === mode.currentAnalysisId;
                  return (
                    <button
                      key={a.id}
                      disabled={a.taken && !isCurrent}
                      onClick={() => handlePickAnalysis(a.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg border border-border bg-card hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
                    >
                      <FileAudio className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{a.label}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{a.sub}</p>
                      </div>
                      {isCurrent && <Badge variant="secondary" className="text-[10px]">vinculada</Badge>}
                      {a.taken && !isCurrent && <Badge variant="outline" className="text-[10px]">já vinculada</Badge>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        {((mode.kind === "pick-track" && mode.currentTrackId) ||
          (mode.kind === "pick-analysis" && mode.currentAnalysisId)) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => (mode.kind === "pick-track" ? handlePickTrack(null) : handlePickAnalysis(null))}
            disabled={linkMut.isPending}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Remover vínculo atual
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
