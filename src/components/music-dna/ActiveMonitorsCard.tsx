import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookmarkCheck, Loader2, Radio, RefreshCw, Trash2, ExternalLink, Music2 } from "lucide-react";
import { toast } from "sonner";
import {
  useActiveMonitors,
  useCheckMonitor,
  useDeleteMonitor,
  useUpdateMonitorUri,
  type PlaylistMonitor,
} from "@/hooks/usePlaylistMonitors";

const URI_RE = /^spotify:track:[A-Za-z0-9]{22}$/;

function relativeLabel(iso: string | null): string {
  if (!iso) return "Ainda não verificada";
  try {
    return `há ${formatDistanceToNow(new Date(iso), { locale: ptBR })}`;
  } catch {
    return "—";
  }
}

function foundLabel(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "";
  }
}

function AddUriForm({ monitor, onDone }: { monitor: PlaylistMonitor; onDone: () => void }) {
  const [uri, setUri] = useState("");
  const [name, setName] = useState(monitor.track_name === "Faixa sem nome" ? "" : monitor.track_name);
  const updateUri = useUpdateMonitorUri();

  async function handleSave() {
    if (!URI_RE.test(uri.trim())) {
      toast.error("URI inválida. Use o formato spotify:track:XXXXXXXXXXXXXXXXXXXXXX");
      return;
    }
    try {
      await updateUri.mutateAsync({
        id: monitor.id,
        track_spotify_uri: uri.trim(),
        track_name: name.trim() || monitor.track_name,
      });
      toast.success("Monitoramento ativado!");
      onDone();
    } catch {
      toast.error("Não foi possível salvar a URI");
    }
  }

  return (
    <div className="mt-2 space-y-2 border-t border-border/60 pt-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Adicione a URI do Spotify para ativar o alerta. Encontre em: Spotify for Artists → Catálogo → "•••" → Copiar URI.
      </p>
      <Input
        className="h-7 text-xs"
        placeholder="spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
        value={uri}
        onChange={(e) => setUri(e.target.value)}
      />
      <Input
        className="h-7 text-xs"
        placeholder="Nome da faixa"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateUri.isPending}>
          {updateUri.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Ativar monitoramento
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function MonitorRow({ monitor }: { monitor: PlaylistMonitor }) {
  const check = useCheckMonitor();
  const del = useDeleteMonitor();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [addingUri, setAddingUri] = useState(false);

  const isFound = monitor.status === "found";
  const isBookmarked = monitor.status === "bookmarked";
  const isChecking = check.isPending && checkingId === monitor.id;

  async function handleCheck() {
    if (!monitor.track_spotify_uri) return;
    setCheckingId(monitor.id);
    try {
      const res = await check.mutateAsync({
        monitor_id: monitor.id,
        playlist_id: monitor.playlist_id,
        track_spotify_uri: monitor.track_spotify_uri,
      });
      if (res.found && monitor.status === "monitoring") {
        toast.success("Sua faixa entrou na playlist!");
      } else if (!res.found) {
        toast("Ainda não encontrada nesta playlist", { description: "Verificada agora." });
      }
    } catch {
      toast.error("Não foi possível verificar agora");
    } finally {
      setCheckingId(null);
    }
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(monitor.id);
      toast.success("Monitoramento removido");
    } catch {
      toast.error("Não foi possível remover");
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 flex gap-3 bg-card relative">
      {monitor.playlist_image_url ? (
        <img
          src={monitor.playlist_image_url}
          alt={monitor.playlist_name}
          loading="lazy"
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Music2 className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1.5 pr-7">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" title={monitor.playlist_name}>
            {monitor.playlist_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {monitor.playlist_owner_name || "—"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {isBookmarked ? (
            <span className="italic">Aguardando publicação no Spotify</span>
          ) : (
            <>Monitorando: <span className="text-foreground">"{monitor.track_name}"</span></>
          )}
        </p>
        {!isBookmarked && (
          <p className="text-[11px] text-muted-foreground">
            {isFound
              ? `Encontrada em ${foundLabel(monitor.found_at)}`
              : `Última verificação: ${relativeLabel(monitor.last_checked_at)}`}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {isFound ? (
            <span className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
              Faixa adicionada!
            </span>
          ) : isBookmarked ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <BookmarkCheck className="h-3 w-3" /> Referência salva
            </span>
          ) : (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Radio className="h-3 w-3" /> Monitorando
            </span>
          )}

          {isFound && monitor.playlist_external_url ? (
            <a
              href={monitor.playlist_external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Abrir no Spotify <ExternalLink className="h-3 w-3" />
            </a>
          ) : isBookmarked ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setAddingUri((v) => !v)}
            >
              {addingUri ? "Cancelar" : "Adicionar URI do Spotify"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={handleCheck}
              disabled={isChecking}
            >
              {isChecking ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Verificar agora
            </Button>
          )}
        </div>

        {addingUri && (
          <AddUriForm monitor={monitor} onDone={() => setAddingUri(false)} />
        )}
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted/50 transition-colors"
        aria-label="Remover monitoramento"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBookmarked ? "Remover referência?" : "Parar de monitorar esta playlist?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBookmarked
                ? `A referência à playlist "${monitor.playlist_name}" será removida.`
                : `Você não receberá mais notificações sobre "${monitor.track_name}" em "${monitor.playlist_name}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {isBookmarked ? "Remover" : "Parar de monitorar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ActiveMonitorsCard() {
  const { data: monitors, isLoading } = useActiveMonitors();

  if (isLoading) return null;
  if (!monitors || monitors.length === 0) return null;

  const active = monitors.filter((m) => m.status !== "found");
  const found = monitors.filter((m) => m.status === "found");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          Monitoramentos Ativos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Acompanhe se suas faixas foram adicionadas às playlists escolhidas.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.map((m) => (
          <MonitorRow key={m.id} monitor={m} />
        ))}
        {found.length > 0 && active.length > 0 && (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium pt-1">
            Encontradas
          </p>
        )}
        {found.map((m) => (
          <MonitorRow key={m.id} monitor={m} />
        ))}
      </CardContent>
    </Card>
  );
}

export default ActiveMonitorsCard;
