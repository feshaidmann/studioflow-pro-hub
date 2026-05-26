import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ListMusic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

function formatDelta(feature: string, delta: number): string {
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  switch (feature) {
    case "lufs_integrated":
    case "dynamic_range_db":
      return `${sign}${abs.toFixed(1)}`;
    case "spectral_centroid":
    case "tempo_bpm":
      return `${sign}${Math.round(abs)}`;
    default:
      return `${sign}${abs.toFixed(2)}`;
  }
}

function scoreLabel(score: number): { label: string; tone: string } {
  if (score >= 0.6) return { label: "Forte", tone: "text-emerald-600" };
  if (score >= 0.3) return { label: "Médio", tone: "text-amber-600" };
  return { label: "Fraco", tone: "text-muted-foreground" };
}

/**
 * Disambigua nomes repetidos anexando "· variante B/C/…" baseado na ordem
 * em que aparecem na lista de matches.
 */
function buildDisplayNames(matches: PlaylistMatch[]): string[] {
  const counts = new Map<string, number>();
  return matches.map((m) => {
    const base = m.profile.name;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    if (seen === 0) return base;
    const suffix = String.fromCharCode("A".charCodeAt(0) + seen); // 1 -> B, 2 -> C
    return `${base} · variante ${suffix}`;
  });
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

  const displayNames = useMemo(
    () => (matches ? buildDisplayNames(matches) : []),
    [matches]
  );

  if (!hasUserData) return null;

  const best = matches?.[0];
  const rest = matches?.slice(1) ?? [];

  return (
    <Card className="border-primary/15">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          Compatibilidade com playlists
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Para onde fazer pitch: score de afinidade da sua faixa com cada cluster/playlist alvo do banco de referência.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!matches && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        )}

        {best && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold truncate">{displayNames[0]}</span>
                  <Badge variant="secondary" className="text-[10px]">Melhor match</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{best.profile.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  {best.profile.size} faixas no cluster
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-mono text-primary leading-none">
                  {Math.round(best.score * 100)}%
                </div>
                <div className={cn("text-[11px] font-medium mt-1", scoreLabel(best.score).tone)}>
                  {scoreLabel(best.score).label}
                </div>
              </div>
            </div>
            <Progress
              value={best.score * 100}
              className="h-1.5"
              aria-label={`Compatibilidade com ${displayNames[0]}: ${Math.round(best.score * 100)}%`}
            />
            {best.score < 0.5 && (
              <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/40 border border-border/60 rounded-md px-2 py-1.5">
                Nenhum cluster com afinidade forte (≥60%). Sua faixa tem um perfil próprio — use os deltas abaixo como direção, não como obrigação.
              </p>
            )}
            {best.gaps.length > 0 && (
              <div className="text-[11px] space-y-1.5 pt-1">

                <span className="block font-medium text-foreground/80">Pontos para se aproximar:</span>
                <ul className="space-y-1">
                  {best.gaps.map((g) => {
                    const needsDecrease = g.userValue > g.targetValue;
                    const rawDelta = g.targetValue - g.userValue;
                    const Icon = needsDecrease ? ArrowDown : ArrowUp;
                    const tone = needsDecrease ? "text-rose-500" : "text-emerald-600";
                    return (
                      <li key={g.feature} className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon className={cn("h-3 w-3", tone)} />
                          {FEATURE_LABELS[g.feature]}
                          <span className={cn("font-mono", tone)}>
                            {formatDelta(g.feature, rawDelta)}
                          </span>
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatValue(g.feature, g.userValue)} → {formatValue(g.feature, g.targetValue)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {best.profile.sample_tracks?.length > 0 && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-primary/10">
                <span className="block mb-1">Faixas típicas desse perfil:</span>
                <span className="italic">
                  {best.profile.sample_tracks.slice(0, 4).map((t) => t.band).join(" · ")}
                </span>
              </div>
            )}
          </div>
        )}

        {rest.length > 0 && (
          <div className="space-y-3 pt-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Outros perfis próximos
            </span>
            {rest.map((m, i) => {
              const idx = i + 1;
              const score = Math.round(m.score * 100);
              return (
                <div key={m.profile.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{displayNames[idx]}</div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.profile.description} · {m.profile.size} faixas
                      </p>
                    </div>
                    <span className="text-xs font-mono text-primary shrink-0">{score}%</span>
                  </div>
                  <Progress
                    value={score}
                    className="h-1"
                    aria-label={`Compatibilidade com ${displayNames[idx]}: ${score}%`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlaylistMatchCard;
