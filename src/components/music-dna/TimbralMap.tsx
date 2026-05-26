import { useEffect, useMemo, useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectionData {
  scaler: { features: string[]; mean: number[]; scale: number[] };
  pca: { components: number[][]; mean: number[] };
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

let cached: ProjectionData | null = null;
async function loadProjection(): Promise<ProjectionData | null> {
  if (cached) return cached;
  try {
    const res = await fetch("/data/reference_projection.json");
    if (!res.ok) return null;
    cached = (await res.json()) as ProjectionData;
    return cached;
  } catch {
    return null;
  }
}

function projectUser(user: Record<string, number | undefined | null>, data: ProjectionData): { x: number; y: number } | null {
  const z: number[] = [];
  for (let i = 0; i < data.scaler.features.length; i++) {
    const key = data.scaler.features[i];
    const v = user[key];
    if (typeof v !== "number" || Number.isNaN(v)) return null;
    z.push((v - data.scaler.mean[i]) / (data.scaler.scale[i] || 1));
  }
  const project = (axis: number) => {
    const comp = data.pca.components[axis];
    let s = 0;
    for (let i = 0; i < comp.length; i++) s += comp[i] * z[i];
    return s;
  };
  return { x: project(0), y: project(1) };
}

export function TimbralMap({ user }: Props) {
  const [data, setData] = useState<ProjectionData | null>(null);

  useEffect(() => {
    loadProjection().then(setData);
  }, []);

  const userPoint = useMemo(() => (data ? projectUser(user, data) : null), [data, user]);

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

  // Determine viewbox bounds from points
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
          Mapa timbral (PCA do banco de referência)
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
      </CardContent>
    </Card>
  );
}

export default TimbralMap;
