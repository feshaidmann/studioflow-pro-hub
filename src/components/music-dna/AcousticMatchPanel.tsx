import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Radar, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { RealAudioAnalysis } from "@/lib/audioAnalysis";
import type {
  AggBucket,
  CatalogTrack,
  QueryFeatures,
  ScoredTrack,
} from "@/workers/acousticMatch.worker";

const SNAPSHOT_BUCKET = "creative-assets";
const SNAPSHOT_PATH = "acoustic-catalog/v1.json";
const CACHE_KEY = "acoustic-catalog:v1";

interface CatalogPayload {
  version: string;
  generated_at: string;
  count: number;
  tracks: CatalogTrack[];
}

interface MatchResult {
  topTracks: ScoredTrack[];
  topArtists: AggBucket[];
  topGenres: AggBucket[];
  scoredCount: number;
}

interface AcousticMatchPanelProps {
  analysis: RealAudioAnalysis;
}

async function loadCatalog(): Promise<CatalogPayload> {
  // sessionStorage cache
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached) as CatalogPayload;
  } catch { /* ignore */ }

  const { data: pub } = supabase.storage.from(SNAPSHOT_BUCKET).getPublicUrl(SNAPSHOT_PATH);
  const res = await fetch(pub.publicUrl, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Falha ao baixar catálogo (HTTP ${res.status})`);
  const payload = (await res.json()) as CatalogPayload;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch { /* quota — ignore */ }
  return payload;
}

function parseKey(key: string | undefined): { key_name: string | null; mode: string | null } {
  if (!key) return { key_name: null, mode: null };
  const trimmed = key.trim();

  // Long form: "A minor", "F# major" (catalog / CSV format)
  const parts = trimmed.split(" ");
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toLowerCase();
    if (last === "major" || last === "minor") {
      return { key_name: parts.slice(0, -1).join(" "), mode: last };
    }
  }

  // Short form from audioAnalysis.ts: "Am", "F#m", "C#m" → minor; "A", "F#" → major
  // Root is 1–2 chars ("A", "F#", "C#", "D#", "A#", "G#" …)
  if (trimmed.endsWith("m")) {
    const root = trimmed.slice(0, -1);
    if (root.length >= 1 && root.length <= 2) {
      return { key_name: root, mode: "minor" };
    }
  }

  return { key_name: trimmed, mode: "major" };
}

function toQuery(a: RealAudioAnalysis): QueryFeatures {
  const { key_name, mode } = parseKey(a.key);
  return {
    bpm: a.bpm,
    lufs_integrated: a.lufs_integrated,
    dynamic_range_lu: a.crest_factor_db ?? a.dynamic_range_lu,
    spectral_centroid_hz: a.spectral_centroid_hz,
    spectral_rolloff_hz: a.spectral_rolloff_hz,
    spectral_flatness: a.spectral_flatness,
    energy: a.energy,
    danceability: a.danceability,
    valence: a.valence,
    acousticness: a.acousticness,
    instrumentalness: a.instrumentalness,
    liveness: a.liveness,
    speechiness: a.speechiness,
    mfcc: a.mfcc ?? null,
    chroma_cens: a.chroma_cens ?? null,
    key_name,
    mode,
  };
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export function AcousticMatchPanel({ analysis }: AcousticMatchPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [meta, setMeta] = useState<{ count: number; generatedAt: string } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const query = useMemo(() => toQuery(analysis), [analysis]);
  const hasFingerprint = (analysis.mfcc?.length ?? 0) > 0 && (analysis.chroma_cens?.length ?? 0) > 0;

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = await loadCatalog();
      setMeta({ count: payload.count, generatedAt: payload.generated_at });

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("../../workers/acousticMatch.worker.ts", import.meta.url),
          { type: "module" },
        );
      }
      const worker = workerRef.current;

      const matchResult = await new Promise<MatchResult>((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          const data = event.data;
          worker.removeEventListener("message", onMessage);
          if (data?.type === "result") {
            resolve({
              topTracks: data.topTracks,
              topArtists: data.topArtists,
              topGenres: data.topGenres,
              scoredCount: data.scoredCount,
            });
          } else {
            reject(new Error(data?.error || "Falha desconhecida no worker"));
          }
        };
        worker.addEventListener("message", onMessage);
        worker.postMessage({ type: "match", query, catalog: payload.tracks, topN: 5 });
      });

      setResult(matchResult);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFingerprint) {
      void run();
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-primary">
            <Radar className="h-3 w-3" /> Match Acústico (Local · MFCC + Chroma)
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={run}
            disabled={loading || !hasFingerprint}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Recalcular
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Comparação direta da impressão acústica da sua faixa contra o catálogo de referência (cálculo no navegador,
          nada é enviado para nenhuma API).
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {!hasFingerprint && (
          <p className="text-xs text-muted-foreground">
            A análise atual não inclui MFCC/Chroma — re-rode a análise da faixa para habilitar este painel.
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">Erro: {error}</p>
        )}
        {loading && !result && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Comparando contra o catálogo…
          </div>
        )}

        {result && (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Artistas mais próximos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.topArtists.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sem dados</span>
                  )}
                  {result.topArtists.map((a) => (
                    <Badge key={a.label} variant="secondary" className="text-[11px] font-mono gap-1">
                      {a.label}
                      <span className="text-muted-foreground">{pct(a.similarity)}</span>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Gêneros mais próximos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.topGenres.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sem dados</span>
                  )}
                  {result.topGenres.map((g) => (
                    <Badge key={g.label} variant="outline" className="text-[11px] font-mono gap-1">
                      {g.label}
                      <span className="text-muted-foreground">{pct(g.similarity)}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Top {result.topTracks.length} faixas similares
              </p>
              <div className="space-y-1">
                {result.topTracks.map((t, idx) => (
                  <div
                    key={`${t.band}-${t.filename}-${idx}`}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/30 border border-border/50"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{t.band}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-mono">
                        {t.filename}{t.genre ? ` · ${t.genre}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-primary">{pct(t.similarity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {meta && (
              <p className="text-[10px] text-muted-foreground font-mono">
                Catálogo v1 · {meta.count} faixas · gerado em {new Date(meta.generatedAt).toLocaleString("pt-BR")} ·
                comparadas {result.scoredCount}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AcousticMatchPanel;
