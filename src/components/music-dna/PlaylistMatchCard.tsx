import { useEffect, useMemo, useState } from "react";
import { ListMusic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FEATURE_LABELS,
  loadPlaylistProfiles,
  matchPlaylists,
  type PlaylistFeatureVector,
  type PlaylistMatch,
} from "@/lib/playlistMatch";

interface Props {
  user: PlaylistFeatureVector;
}

function formatValue(feature: string, value: number): string {
  switch (feature) {
    case "lufs_integrated":
      return `${value.toFixed(1)} LUFS`;
    case "dynamic_range_db":
      return `${value.toFixed(1)} dB`;
    case "spectral_centroid":
      return `${Math.round(value)} Hz`;
    case "tempo_bpm":
      return `${Math.round(value)} BPM`;
    default:
      return value.toFixed(2);
  }
}

export function PlaylistMatchCard({ user }: Props) {
  const [matches, setMatches] = useState<PlaylistMatch[] | null>(null);

  useEffect(() => {
    let active = true;
    loadPlaylistProfiles().then((profiles) => {
      if (!active) return;
      setMatches(matchPlaylists(user, profiles, 3));
    });
    return () => {
      active = false;
    };
  }, [user]);

  const hasUserData = useMemo(
    () => Object.values(user).some((v) => typeof v === "number" && !Number.isNaN(v)),
    [user]
  );

  if (!hasUserData) return null;

  return (
    <Card className="border-primary/15">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          Compatibilidade com playlists
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Clusters do banco de referência ({matches?.[0]?.profile.size ?? "—"} faixas no mais próximo). Quanto maior o score, mais a sua faixa "encaixa" no perfil sonoro.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!matches && (
          <p className="text-xs text-muted-foreground">Calculando…</p>
        )}
        {matches?.map((m, idx) => (
          <div key={m.profile.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{m.profile.name}</span>
                  {idx === 0 && <Badge variant="secondary" className="text-[10px]">Melhor match</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{m.profile.description}</p>
              </div>
              <span className="text-xs font-mono text-primary shrink-0">{Math.round(m.score * 100)}%</span>
            </div>
            <Progress value={m.score * 100} className="h-1.5" />
            {idx === 0 && m.gaps.length > 0 && (
              <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
                <span className="block font-medium text-foreground/80">Pontos para se aproximar:</span>
                <ul className="space-y-0.5">
                  {m.gaps.map((g) => (
                    <li key={g.feature} className="flex justify-between gap-2">
                      <span>{FEATURE_LABELS[g.feature]}</span>
                      <span className="font-mono">
                        {formatValue(g.feature, g.userValue)} → {formatValue(g.feature, g.targetValue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {idx === 0 && m.profile.sample_tracks?.length > 0 && (
              <p className="text-[11px] text-muted-foreground italic pt-1">
                Ex.: {m.profile.sample_tracks.slice(0, 3).map((t) => `${t.band}`).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default PlaylistMatchCard;
