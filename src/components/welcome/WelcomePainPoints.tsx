import { CheckCircle2 } from "lucide-react";
import { PAIN_POINTS } from "./welcome.data";

export function WelcomePainPoints() {
  return (
    <section
      className="welcome-fade mt-10 w-full"
      style={{ "--delay": "240ms" } as React.CSSProperties}
    >
      <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Já passou por isso?
      </p>

      <div className="space-y-2">
        {PAIN_POINTS.map((item, i) => (
          <article
            key={i}
            className="rounded-[var(--radius)] border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex gap-3 p-3.5">
              <div className="shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-destructive/70" />
                </div>
              </div>
              <div className="space-y-2 min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  &ldquo;{item.pain}&rdquo;
                </p>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {item.solve}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
