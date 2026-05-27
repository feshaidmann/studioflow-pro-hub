import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Users, Music2, Radio, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useActiveMonitors } from "@/hooks/usePlaylistMonitors";
import { MonitorPlaylistDialog, type MonitorPlaylistTarget } from "@/components/music-dna/MonitorPlaylistDialog";

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner_name: string;
  followers: number;
  image_url: string;
  external_url: string;
  tracks_total: number;
}

interface ApiResponse {
  editorial: SpotifyPlaylist[];
  ugc: SpotifyPlaylist[];
}

interface Props {
  genre?: string;
  subgenre?: string;
  mood?: string[];
  styleTags?: string[];
  references?: string[];
}

function formatFollowers(n: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M seg.`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k seg.`;
  return `${n} seg.`;
}

function PlaylistCard({
  playlist,
  editorial,
  isMonitored,
  onMonitor,
}: {
  playlist: SpotifyPlaylist;
  editorial: boolean;
  isMonitored: boolean;
  onMonitor: (p: SpotifyPlaylist) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-3 border border-border rounded-xl bg-card hover:shadow-sm transition-shadow">
      <div className="relative">
        <img
          src={playlist.image_url}
          alt={playlist.name}
          loading="lazy"
          className="aspect-square w-full object-cover rounded-lg bg-muted"
        />
        {editorial && (
          <span className="absolute top-2 left-2 bg-green-50 text-green-700 text-[10px] rounded-full px-2 py-0.5 font-medium border border-green-100">
            Spotify Editorial
          </span>
        )}
      </div>
      <div className="space-y-1 min-h-[3.5rem]">
        <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug" title={playlist.name}>
          {playlist.name}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1" title={playlist.owner_name}>
          {playlist.owner_name || "—"}
        </p>
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {formatFollowers(playlist.followers)}
        </span>
        <a
          href={playlist.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
        >
          Abrir <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <Button
        size="sm"
        variant={isMonitored ? "ghost" : "outline"}
        disabled={isMonitored}
        onClick={() => onMonitor(playlist)}
        className={cn(
          "h-7 text-xs gap-1.5 mt-1",
          isMonitored && "text-green-700 hover:text-green-700 cursor-default",
        )}
      >
        {isMonitored ? (
          <>
            <Check className="h-3 w-3" /> Monitorando
          </>
        ) : (
          <>
            <Radio className="h-3 w-3" /> Monitorar
          </>
        )}
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3 border border-border rounded-xl space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function CompatiblePlaylistsCard({ genre, subgenre, mood, styleTags, references }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const hasInput = Boolean(
    (genre && genre.trim()) ||
    (mood && mood.length) ||
    (styleTags && styleTags.length),
  );

  useEffect(() => {
    if (!hasInput) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    supabase.functions
      .invoke<ApiResponse>("search-compatible-playlists", {
        body: {
          genre: genre ?? "",
          subgenre: subgenre ?? "",
          mood: mood ?? [],
          style_tags: styleTags ?? [],
          references: references ?? [],
          language: "pt",
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setError(true);
        } else {
          setData(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, subgenre, JSON.stringify(mood), JSON.stringify(styleTags), JSON.stringify(references)]);

  if (!hasInput) return null;

  const editorial = data?.editorial ?? [];
  const ugc = data?.ugc ?? [];
  const isEmpty = !loading && !error && editorial.length === 0 && ugc.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Music2 className="h-4 w-4 text-primary" />
          Playlists Compatíveis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Playlists do Spotify onde sua música tem fit, com base no DNA da faixa.
        </p>
      </CardHeader>
      <CardContent>
        {loading && <SkeletonGrid />}

        {!loading && error && (
          <p className="text-xs text-muted-foreground italic py-6 text-center">
            Não foi possível carregar as playlists agora. Tente novamente mais tarde.
          </p>
        )}

        {!loading && !error && isEmpty && (
          <p className="text-xs text-muted-foreground italic py-6 text-center">
            Nenhuma playlist compatível encontrada para este perfil sonoro.
          </p>
        )}

        {!loading && !error && !isEmpty && (
          <Tabs defaultValue={editorial.length > 0 ? "editorial" : "ugc"} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="editorial" disabled={editorial.length === 0}>
                Editoriais
                <Badge variant="secondary" className={cn("ml-2 text-[10px]", editorial.length === 0 && "opacity-50")}>
                  {editorial.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ugc" disabled={ugc.length === 0}>
                Comunidade
                <Badge variant="secondary" className={cn("ml-2 text-[10px]", ugc.length === 0 && "opacity-50")}>
                  {ugc.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editorial">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {editorial.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} editorial />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ugc">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ugc.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} editorial={false} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
