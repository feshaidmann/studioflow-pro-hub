import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileStickyHeaderProps {
  title: string;
  subtitle?: string;
  cta?: ReactNode;
  className?: string;
}

/**
 * Sticky header mobile-only com título e CTA primário.
 * Em telas md+ não renderiza (assume header desktop próprio da página).
 */
export function MobileStickyHeader({
  title,
  subtitle,
  cta,
  className,
}: MobileStickyHeaderProps) {
  return (
    <div
      className={cn(
        "md:hidden sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-background/85 backdrop-blur-md border-b border-border flex items-center gap-3",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate leading-tight">
            {subtitle}
          </p>
        )}
      </div>
      {cta && <div className="shrink-0">{cta}</div>}
    </div>
  );
}
