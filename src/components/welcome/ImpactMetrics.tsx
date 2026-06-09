import { useEffect, useState } from "react";
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

type Tone = "orange" | "pink" | "purple" | "neutral";

const CARDS: ReadonlyArray<{
  key: keyof Omit<Stats, "generatedAt">;
  label: string;
  tone: Tone;
}> = [
  { key: "artistsActive",          label: "Artistas ativos",          tone: "orange" },
  { key: "editaisAtivos",          label: "Editais abertos",          tone: "pink" },
  { key: "projectsPublished",      label: "Projetos publicados",      tone: "purple" },
  { key: "professionalsAvailable", label: "Profissionais cadastrados", tone: "neutral" },
];

const TONE_BG: Record<Tone, string> = {
  orange: "bg-orange-600",
  pink: "bg-pink-700",
  purple: "bg-purple-900/40 border border-white/5",
  neutral: "bg-white/5 border border-white/5",
};

const TONE_LABEL: Record<Tone, string> = {
  orange: "text-orange-200",
  pink: "text-pink-200",
  purple: "text-white/50",
  neutral: "text-white/40",
};

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
      className="welcome-fade"
      style={{ "--delay": "200ms" } as React.CSSProperties}
      aria-label="Impacto da plataforma"
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARDS.map(({ key, label, tone }) => (
          <div
            key={key}
            role="group"
            aria-label={label}
            className={`flex flex-col items-center justify-center rounded-3xl p-6 text-center ${TONE_BG[tone]}`}
          >
            {status === "loading" || !stats ? (
              <Skeleton className="h-8 w-12 bg-white/10" />
            ) : (
              <span className="font-display text-4xl text-white">
                {nf.format(stats[key] ?? 0)}
              </span>
            )}
            <span className={`mt-1 text-[10px] font-bold uppercase tracking-tight ${TONE_LABEL[tone]}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
