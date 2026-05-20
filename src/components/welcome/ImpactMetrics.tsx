import { useEffect, useState } from "react";
import { Music, Trophy, Rocket, Users, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  artistsActive: number;
  editaisAtivos: number;
  projectsPublished: number;
  professionalsAvailable: number;
  generatedAt: string;
};

type CacheEntry = { data: Stats; cachedAt: number };

const CACHE_KEY = "sf_impact_stats_v1";
const TTL_MS = 60 * 60 * 1000;
const nf = new Intl.NumberFormat("pt-BR");

const CARDS: ReadonlyArray<{ key: keyof Omit<Stats, "generatedAt">; icon: LucideIcon; label: string }> = [
  { key: "artistsActive", icon: Music, label: "artistas ativos" },
  { key: "editaisAtivos", icon: Trophy, label: "editais abertos" },
  { key: "projectsPublished", icon: Rocket, label: "projetos publicados" },
  { key: "professionalsAvailable", icon: Users, label: "profissionais cadastrados" },
];

function readCache(): Stats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: Stats) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() } satisfies CacheEntry));
  } catch {
    /* noop */
  }
}

export function ImpactMetrics() {
  const [stats, setStats] = useState<Stats | null>(() => readCache());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() =>
    readCache() ? "ready" : "loading",
  );

  useEffect(() => {
    if (stats) return;
    let cancelled = false;
    supabase.functions
      .invoke("public-stats")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setStatus("error");
          return;
        }
        setStats(data as Stats);
        writeCache(data as Stats);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [stats]);

  if (status === "error") return null;

  return (
    <section
      className="welcome-fade mt-7 w-full"
      style={{ "--delay": "90ms" } as React.CSSProperties}
      aria-label="Impacto da plataforma"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map(({ key, icon: Icon, label }) => (
          <div
            key={key}
            role="group"
            aria-label={label}
            className="rounded-[var(--radius)] border border-border/50 bg-card/60 backdrop-blur-sm p-3 flex flex-col gap-2"
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            {status === "loading" || !stats ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-semibold leading-none text-foreground">
                {nf.format(stats[key] ?? 0)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground leading-snug">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
