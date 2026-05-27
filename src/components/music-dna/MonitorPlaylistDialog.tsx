import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Music2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreateMonitor, useCheckMonitor } from "@/hooks/usePlaylistMonitors";

export interface MonitorPlaylistTarget {
  playlist_id: string;
  playlist_name: string;
  playlist_image_url?: string | null;
  playlist_external_url?: string | null;
  playlist_owner_name?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: MonitorPlaylistTarget | null;
  onImportRequest?: () => void;
}

interface TrackOption {
  spotify_track_uri: string;
  name: string;
  source: "catalog" | "dna";
}

const URI_RE = /^spotify:track:[A-Za-z0-9]{22}$/;

export function MonitorPlaylistDialog({ open, onOpenChange, playlist, onImportRequest }: Props) {
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedTrackUri, setSelectedTrackUri] = useState<string>("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUri, setManualUri] = useState("");
  const [manualName, setManualName] = useState("");

  const createMonitor = useCreateMonitor();
  const checkMonitor = useCheckMonitor();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingTracks(true);

    Promise.all([
      supabase
        .from("spotify_tracks")
        .select("spotify_track_uri, name")
        .order("name", { ascending: true })
        .limit(100),
      supabase
        .from("music_dna_analyses")
        .select("spotify_id, track_name, created_at")
        .not("spotify_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
    ]).then(([catalogRes, dnaRes]) => {
      if (cancelled) return;

      const seen = new Set<string>();
      const merged: TrackOption[] = [];

      for (const t of catalogRes.data ?? []) {
        if (!t.spotify_track_uri || seen.has(t.spotify_track_uri)) continue;
        seen.add(t.spotify_track_uri);
        merged.push({ spotify_track_uri: t.spotify_track_uri, name: t.name, source: "catalog" });
      }

      for (const t of dnaRes.data ?? []) {
        if (!t.spotify_id) continue;
        const uri = `spotify:track:${t.spotify_id}`;
        if (seen.has(uri)) continue;
        seen.add(uri);
        merged.push({
          spotify_track_uri: uri,
          name: t.track_name || "Faixa sem nome",
          source: "dna",
        });
      }

      setTracks(merged);
      setLoadingTracks(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedTrackUri("");
      setManualOpen(false);
      setManualUri("");
      setManualName("");
    }
  }, [open]);

  const selectedTrack = useMemo(
    () => tracks.find((t) => t.spotify_track_uri === selectedTrackUri) ?? null,
    [tracks, selectedTrackUri],
  );

  const submitting = createMonitor.isPending || checkMonitor.isPending;

  async function handleSubmit() {
    if (!playlist) return;
    let uri = "";
    let name = "";
    if (selectedTrackUri) {
      uri = selectedTrackUri;
      name = selectedTrack?.name ?? "Faixa";
    } else if (manualOpen) {
      if (!URI_RE.test(manualUri.trim())) {
        toast.error("URI inválida. Use o formato spotify:track:XXXXXXXXXXXXXXXXXXXXXX");
        return;
      }
      if (!manualName.trim()) {
        toast.error("Informe o nome da faixa");
        return;
      }
      uri = manualUri.trim();
      name = manualName.trim();
    } else {
      toast.error("Selecione uma faixa ou informe a URI manualmente");
      return;
    }

    try {
      const monitor = await createMonitor.mutateAsync({
        playlist_id: playlist.playlist_id,
        playlist_name: playlist.playlist_name,
        playlist_image_url: playlist.playlist_image_url ?? null,
        playlist_external_url: playlist.playlist_external_url ?? null,
        playlist_owner_name: playlist.playlist_owner_name ?? null,
        track_spotify_uri: uri,
        track_name: name,
      });

      checkMonitor
        .mutateAsync({
          monitor_id: monitor.id,
          playlist_id: playlist.playlist_id,
          track_spotify_uri: uri,
        })
        .catch(() => {
          /* silencioso */
        });

      toast.success(`Monitoramento ativo para ${playlist.playlist_name}`);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "duplicate_monitor") {
        toast.error("Você já monitora esta combinação");
      } else {
        toast.error("Não foi possível iniciar o monitoramento");
      }
    }
  }

  const hasCatalog = tracks.some((t) => t.source === "catalog");
  const hasDna = tracks.some((t) => t.source === "dna");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Monitorar esta playlist</DialogTitle>
          <DialogDescription>
            Você será notificado quando a faixa entrar nesta playlist.
          </DialogDescription>
        </DialogHeader>

        {playlist && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            {playlist.playlist_image_url ? (
              <img
                src={playlist.playlist_image_url}
                alt={playlist.playlist_name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Music2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{playlist.playlist_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {playlist.playlist_owner_name || "—"}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm">Qual faixa você quer monitorar?</Label>

          {loadingTracks ? (
            <p className="text-xs text-muted-foreground italic">Carregando faixas…</p>
          ) : tracks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              Nenhuma faixa com link do Spotify encontrada.{" "}
              {onImportRequest ? (
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    onOpenChange(false);
                    onImportRequest();
                  }}
                >
                  Importe seu catálogo
                </button>
              ) : (
                <span>Importe seu catálogo do Spotify</span>
              )}{" "}
              ou informe a URI manualmente abaixo.
            </p>
          ) : (
            <Select value={selectedTrackUri} onValueChange={setSelectedTrackUri}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma faixa" />
              </SelectTrigger>
              <SelectContent>
                {hasCatalog && (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">
                    Catálogo importado
                  </div>
                )}
                {tracks
                  .filter((t) => t.source === "catalog")
                  .map((t) => (
                    <SelectItem key={t.spotify_track_uri} value={t.spotify_track_uri}>
                      {t.name}
                    </SelectItem>
                  ))}
                {hasDna && (
                  <div
                    className={`px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide ${
                      hasCatalog ? "border-t mt-1 pt-2" : ""
                    }`}
                  >
                    Análises Music DNA
                  </div>
                )}
                {tracks
                  .filter((t) => t.source === "dna")
                  .map((t) => (
                    <SelectItem key={t.spotify_track_uri} value={t.spotify_track_uri}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
                Informar URI do Spotify manualmente
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <Input
                placeholder="spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
                value={manualUri}
                onChange={(e) => setManualUri(e.target.value)}
              />
              <Input
                placeholder="Nome da faixa"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Começar a monitorar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MonitorPlaylistDialog;
