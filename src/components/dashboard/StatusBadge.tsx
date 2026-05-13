import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors",
  {
    variants: {
      variant: {
        critical: "bg-destructive/10 text-destructive border-destructive/30",
        warning: "bg-warning/10 text-warning border-warning/30",
        success: "bg-success/10 text-success border-success/30",
        info: "bg-info/10 text-info border-info/30",
        primary: "bg-primary/10 text-primary border-primary/30",
        neutral: "bg-secondary/40 text-muted-foreground border-border/40",
      },
      size: {
        sm: "h-4 px-1.5 text-[10px]",
        md: "h-5 px-2 text-[11px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "sm" },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: LucideIcon;
}

export function StatusBadge({ className, variant, size, icon: Icon, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant, size }), className)} {...props}>
      {Icon && <Icon className="h-2.5 w-2.5 shrink-0" />}
      {children}
    </span>
  );
}

export { statusBadgeVariants };
