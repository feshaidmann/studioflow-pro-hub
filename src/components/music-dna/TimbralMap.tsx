import { useEffect, useMemo, useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectionDataV2 {
  version: 2;
  method: "umap";
  scaler: { features: string[]; mean: number[]; scale: number[] };
  umap: { n_neighbors: number; min_dist: number; seed: number };
  clusters: { k: number };
  z: number[][];
  points: { x: number; y: number; g?: string; c?: number }[];
}

interface Props {
  user: Record<string, number | undefined | null>;
}

const CLUSTER_COLORS = [
  "hsl(210 70% 55%)",
  "hsl(150 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(280 60% 60%)",
  "hsl(0 70% 60%)",
  "hsl(180 60% 45%)",
  "hsl(50 80% 50%)",
  "hsl(330 60% 55%)",
];

const K_NEIGHBORS = 15;

let cached: ProjectionDataV2 | null = null;
async function loadProjection(): Promise<ProjectionDataV2 | null> {
  if (cached) return cached;
  try {
    const res = await fetch("/data/reference_projection.json");
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.version !== 2 || !Array.isArray(json?.z) || !Array.isArray(json?.points)) {
      // eslint-disable-next-line no-console
      console.warn("[TimbralMap] reference_projection.json desatualizado (esperado v2 UMAP). Rode scripts/build_reference_projection.py.");
      return null;
    }
    cached = json as ProjectionDataV2;
    return cached;
  } catch {
    return null;
  }
}

/** Aplica clip/log iguais ao gerador Python para gerar o vetor cru x.
 *  Features ausentes são imputadas com a média do scaler (z=0 após padronização),
 *  evitando que o ponto deixe de aparecer só por faltar 1-2 dimensões.
 *  Retorna null apenas se a cobertura for muito baixa (< MIN_PRESENT).
 */
const MIN_PRESENT = 6; // de 13 features
function buildUserVector(
  user: Record<string, number | undefined | null>,
  features: string[],
  mean: number[],
): { x: number[]; present: number; missing: string[] } | null {
  const out: number[] = [];
  const missing: string[] = [];
  let present = 0;
  for (let i = 0; i < features.length; i++) {
    const name = features[i];
    let v: number | null | undefined;
    if (name.startsWith("mfcc_")) {
      const idx = Number(name.slice(5));
      const arr = (user["mfcc"] ?? user["mfccs"]) as unknown as number[] | undefined;
      v = Array.isArray(arr) ? arr[idx] : undefined;
    } else {
      v = user[name] as number | undefined;
    }

    if (typeof v !== "number" || !Number.isFinite(v)) {
      out.push(mean[i]); // imputação → contribuição neutra após padronização
      missing.push(name);
      continue;
    }

    switch (name) {
      case "lufs_integrated":
        v = Math.max(-30, Math.min(-5, v));
        break;
      case "dynamic_range_db":
        v = Math.max(0, Math.min(30, v));
        break;
      case "tempo_bpm":
        v = Math.max(50, Math.min(200, v));
        break;
      case "spectral_centroid":
      case "spectral_rolloff":
      case "spectral_bandwidth":
        v = Math.log(Math.max(v, 1));
        break;
    }
    out.push(v);
    present++;
  }
  if (present < MIN_PRESENT) return null;
  return { x: out, present, missing };
}

/** Padroniza com o mesmo scaler salvo no JSON. */
function standardize(x: number[], data: ProjectionDataV2): number[] {
  const { mean, scale } = data.scaler;
  return x.map((v, i) => (v - mean[i]) / (scale[i] || 1));
}

/**
 * Projeta o ponto do usuário no plano UMAP via média ponderada dos K vizinhos
 * mais próximos no espaço padronizado (UMAP não tem inverse-transform).
 */
function projectUserByKNN(
  z: number[],
  data: ProjectionDataV2,
  k = K_NEIGHBORS,
): { x: number; y: number } | null {
  const refs = data.z;
  const pts = data.points;
  if (refs.length === 0 || refs[0].length !== z.length) return null;

  // distâncias euclidianas
  const dists: { d: number; i: number }[] = new Array(refs.length);
  for (let i = 0; i < refs.length; i++) {
    const r = refs[i];
    let s = 0;
    for (let j = 0; j < z.length; j++) {
      const diff = z[j] - r[j];
      s += diff * diff;
    }
    dists[i] = { d: Math.sqrt(s), i };
  }
  dists.sort((a, b) => a.d - b.d);
  const top = dists.slice(0, Math.min(k, dists.length));

  // pesos ∝ 1 / (d + ε); se o mais próximo é virtualmente zero, ancora nele.
  const eps = 1e-6;
  if (top[0].d < eps) {
    const p = pts[top[0].i];
    return { x: p.x, y: p.y };
  }
  let wsum = 0;
  let x = 0;
  let y = 0;
  for (const { d, i } of top) {
    const w = 1 / (d + eps);
    wsum += w;
    x += w * pts[i].x;
    y += w * pts[i].y;
  }
  return { x: x / wsum, y: y / wsum };
}

export function TimbralMap({ user }: Props) {
  const [data, setData] = useState<ProjectionDataV2 | null>(null);

  useEffect(() => {
    loadProjection().then(setData);
  }, []);

  // Chave estável para memoizar com base nos valores relevantes do usuário.
  const userKey = useMemo(() => {
    if (!data) return "";
    return data.scaler.features
      .map((f) => {
        if (f.startsWith("mfcc_")) {
          const idx = Number(f.slice(5));
          const arr = (user["mfcc"] ?? user["mfccs"]) as unknown as number[] | undefined;
          return Array.isArray(arr) ? arr[idx] : undefined;
        }
        return user[f];
      })
      .join("|");
  }, [data, user]);

  const userResult = useMemo(() => {
    if (!data) return null;
    const built = buildUserVector(user, data.scaler.features, data.scaler.mean);
    if (!built) return null;
    const z = standardize(built.x, data);
    const point = projectUserByKNN(z, data);
    if (!point) return null;
    return { point, present: built.present, missing: built.missing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, userKey]);
  const userPoint = userResult?.point ?? null;
  const isImputed = !!userResult && userResult.missing.length > 0;

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" />
            Mapa timbral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Carregando referência…</p>
        </CardContent>
      </Card>
    );
  }

  const xs = data.points.map((p) => p.x);
  const ys = data.points.map((p) => p.y);
  if (userPoint) {
    xs.push(userPoint.x);
    ys.push(userPoint.y);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 0.3;
  const w = 400;
  const h = 280;
  const sx = (x: number) => ((x - minX + pad) / (maxX - minX + 2 * pad)) * w;
  const sy = (y: number) => h - ((y - minY + pad) / (maxY - minY + 2 * pad)) * h;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-primary" />
          Mapa timbral (UMAP do banco de referência)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {data.points.length} faixas projetadas em 2D. Sua faixa em vermelho. Vizinhos = sonoridade parecida.
        </p>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto rounded-md bg-muted/20"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Mapa timbral 2D"
        >
          {data.points.map((p, i) => (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={1.2}
              fill={CLUSTER_COLORS[(p.c ?? 0) % CLUSTER_COLORS.length]}
              opacity={0.55}
            />
          ))}
          {userPoint && (
            <>
              <circle
                cx={sx(userPoint.x)}
                cy={sy(userPoint.y)}
                r={10}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth={1.5}
                opacity={0.45}
              />
              <circle
                cx={sx(userPoint.x)}
                cy={sy(userPoint.y)}
                r={5}
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
              />
            </>
          )}
        </svg>
        {!userPoint && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Faltam features para posicionar a faixa no mapa.
          </p>
        )}
        {userPoint && isImputed && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Projeção aproximada — {userResult!.missing.length} de {data.scaler.features.length} features não foram extraídas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default TimbralMap;
