import { TrendingUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrackPopularity } from "@/hooks/useTrackPopularity";

interface Props {
  spotifyTrackId: string | null | undefined;
  genre: string | null | undefined;
}

function popularityLabel(n: number): { label: string; color: string } {
  if (n <= 20) return { label: "Muito baixa — ainda construindo audiência", color: "text-muted-foreground" };
  if (n <= 40) return { label: "Em crescimento", color: "text-amber-600" };
  if (n <= 60) return { label: "Moderada — relevante na plataforma", color: "text-blue-600" };
  if (n <= 80) return { label: "Alta — forte tração", color: "text-emerald-600" };
  return { label: "Viral — nível mainstream", color: "text-emerald-700 font-semibold" };
}

function Bar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.round((value / max) * 100)}%` }}
      />
    </div>
  );
}

export function SpotifyPopularityCard({ spotifyTrackId, genre }: Props) {
  const { data, isLoading } = useTrackPopularity(spotifyTrackId, genre);

  if (!spotifyTrackId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.track_popularity === null) return null;

  const { track_popularity, genre_median, genre_name, references_count } = data;
  const { label, color } = popularityLabel(track_popularity);
  const delta = genre_median !== null ? track_popularity - genre_median : null;
  const deltaLabel = delta !== null
    ? delta > 0 ? `+${delta} acima da mediana` : delta < 0 ? `${delta} abaixo da mediana` : "na mediana"
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Popularidade no Spotify
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Índice 0–100 calculado pelo Spotify com base no volume de streams recentes.
                Reflete tração atual, não histórico acumulado.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Sua faixa</span>
            <span className="text-2xl font-semibold tabular-nums">{track_popularity}</span>
          </div>
          <Bar value={track_popularity} color="bg-primary" />
          <p className={`text-xs ${color}`}>{label}</p>
        </div>

        {genre_median !== null && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">
                Mediana {genre_name ?? genre}
                {references_count > 0 && (
                  <span className="ml-1 opacity-60">({references_count} faixas)</span>
                )}
              </span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">{genre_median}</span>
            </div>
            <Bar value={genre_median} color="bg-muted-foreground/40" />
            {deltaLabel && (
              <p className={`text-xs ${delta! > 0 ? "text-emerald-600" : delta! < 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                {deltaLabel} do gênero
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
