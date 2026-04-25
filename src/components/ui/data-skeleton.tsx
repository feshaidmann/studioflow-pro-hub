import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataSkeletonProps {
  lines?: number;
  className?: string;
  /** "card" renderiza um bloco com altura mínima e linhas; "list" repete linhas simples; "kpi" grid 2x2/4 */
  variant?: "card" | "list" | "kpi";
}

/**
 * Skeleton unificado para fetchers em estado de carregamento.
 * Use enquanto dados do Supabase estão chegando para evitar "estalo" de UI.
 */
export function DataSkeleton({
  lines = 3,
  className,
  variant = "list",
}: DataSkeletonProps) {
  if (variant === "kpi") {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-4 space-y-3",
          className,
        )}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${90 - i * 12}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-9 w-full rounded-md"
        />
      ))}
    </div>
  );
}
