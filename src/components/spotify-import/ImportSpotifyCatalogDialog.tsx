import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Music, CheckCircle2, ExternalLink, Disc3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFetchSpotifyCatalog,
  useImportSpotifySelection,
  useExistingReleaseIds,
  type CatalogResponse,
  type SpotifyReleasePayload,
} from "@/hooks/useSpotifyImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const URL_REGEX = /^https?:\/\/open\.spotify\.com\/(intl-[a-z]{2}\/)?artist\/[a-zA-Z0-9]+(\?.*)?$/;

type Step = "url" | "select" | "done";

const TYPE_ORDER: SpotifyReleasePayload["type"][] = ["album", "ep", "single", "compilation"];
const TYPE_LABEL: Record<SpotifyReleasePayload["type"], string> = {
  album: "Álbuns",
  ep: "EPs",
  single: "Singles",
  compilation: "Compilações",
};

export function ImportSpotifyCatalogDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ releases: number; tracks: number } | null>(null);

  const fetchMut = useFetchSpotifyCatalog();
  const importMut = useImportSpotifySelection();
  const { data: existingIds } = useExistingReleaseIds();

  const urlValid = useMemo(() => URL_REGEX.test(url.trim()), [url]);

  const grouped = useMemo(() => {
    if (!catalog) return new Map<SpotifyReleasePayload["type"], SpotifyReleasePayload[]>();
    const g = new Map<SpotifyReleasePayload["type"], SpotifyReleasePayload[]>();
    for (const r of catalog.releases) {
      const list = g.get(r.type) ?? [];
      list.push(r);
      g.set(r.type, list);
    }
    for (const [k, list] of g) {
      list.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
      g.set(k, list);
    }
    return g;
  }, [catalog]);

  const reset = () => {
    setStep("url");
    setUrl("");
    setCatalog(null);
    setSelected(new Set());
    setResult(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFetch = async () => {
    if (!urlValid) return;
    try {
      const data = await fetchMut.mutateAsync(url.trim());
      setCatalog(data);
      // Pré-seleciona todos que ainda não foram importados
      const ids = new Set<string>();
      for (const r of data.releases) {
        if (!existingIds?.has(r.spotify_album_id)) ids.add(r.spotify_album_id);
      }
      setSelected(ids);
      setStep("select");
      if (data.truncated) {
        toast.info("Catálogo grande — mostrando os 200 lançamentos mais recentes.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao buscar catálogo");
    }
  };

  const toggle = (albumId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  };

  const allSelectableIds = useMemo(
    () =>
      (catalog?.releases ?? [])
        .filter((r) => !existingIds?.has(r.spotify_album_id))
        .map((r) => r.spotify_album_id),
    [catalog, existingIds],
  );
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.has(id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allSelectableIds));
  };

  const handleImport = async () => {
    if (!catalog) return;
    const toImport = catalog.releases.filter((r) => selected.has(r.spotify_album_id));
    if (toImport.length === 0) return;
    try {
      const res = await importMut.mutateAsync(toImport);
      const trackTotal = toImport.reduce((acc, r) => acc + r.tracks.length, 0);
      setResult({ releases: res.releasesInserted, tracks: res.tracksInserted || trackTotal });
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5" />
            Importar catálogo do Spotify
          </DialogTitle>
          <DialogDescription>
            {step === "url" && "Traga seus lançamentos automaticamente — nome, capa, data e URI."}
            {step === "select" && catalog?.artist_name && `Catálogo de ${catalog.artist_name}`}
            {step === "done" && "Importação concluída"}
          </DialogDescription>
        </DialogHeader>

        {step === "url" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spotify-url">Link do perfil de artista</Label>
              <Input
                id="spotify-url"
                placeholder="https://open.spotify.com/artist/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
              {url && !urlValid && (
                <p className="text-xs text-destructive">
                  Use um link no formato https://open.spotify.com/artist/...
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Como encontrar: app do Spotify → seu perfil → ··· → Compartilhar → Copiar link
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFetch} disabled={!urlValid || fetchMut.isPending}>
                {fetchMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando…
                  </>
                ) : (
                  <>Buscar catálogo →</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "select" && catalog && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("url")}>
                ← Voltar
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{selected.size} selecionados</span>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allSelected ? "Limpar seleção" : "Selecionar todos"}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-5">
                {TYPE_ORDER.map((t) => {
                  const list = grouped.get(t);
                  if (!list || list.length === 0) return null;
                  return (
                    <section key={t} className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {TYPE_LABEL[t]} <span className="text-xs">({list.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {list.map((r) => {
                          const already = existingIds?.has(r.spotify_album_id) ?? false;
                          const checked = already ? true : selected.has(r.spotify_album_id);
                          const year = r.release_date?.slice(0, 4) ?? "—";
                          return (
                            <label
                              key={r.spotify_album_id}
                              className={`flex items-center gap-3 rounded-xl border border-border p-3 transition-colors ${
                                already
                                  ? "bg-muted/50 cursor-not-allowed"
                                  : "bg-card hover:bg-accent/40 cursor-pointer"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={already}
                                onCheckedChange={() => !already && toggle(r.spotify_album_id)}
                              />
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                                {r.image_url ? (
                                  <img
                                    src={r.image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Music className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {year} · {r.total_tracks}{" "}
                                  {r.total_tracks === 1 ? "faixa" : "faixas"}
                                </p>
                              </div>
                              {already && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Já importado
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                {catalog.releases.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum lançamento encontrado para este artista.
                  </p>
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={selected.size === 0 || importMut.isPending}>
                {importMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…
                  </>
                ) : (
                  <>Importar selecionados ({selected.size})</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <div>
                <h3 className="text-lg font-semibold">Importação concluída</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.releases} {result.releases === 1 ? "lançamento" : "lançamentos"} e{" "}
                  {result.tracks} {result.tracks === 1 ? "faixa" : "faixas"} no seu catálogo.
                </p>
              </div>
            </div>
            <DialogFooter className="sm:justify-between gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  handleClose(false);
                  navigate("/projects");
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Ver catálogo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
