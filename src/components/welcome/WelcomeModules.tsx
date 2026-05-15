import { MODULES } from "./welcome.data";

export function WelcomeModules() {
  return (
    <section
      className="welcome-fade mt-10 w-full"
      style={{ "--delay": "300ms" } as React.CSSProperties}
    >
      <p className="mb-1 text-center text-base font-semibold text-foreground">
        Tudo que um lançamento precisa
      </p>
      <p className="mb-4 text-center text-xs text-muted-foreground">
        {MODULES.length} módulos integrados — use o que precisar.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MODULES.map((mod, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-border/50 bg-card/60 backdrop-blur-sm p-3 flex flex-col gap-2 hover:border-primary/30 hover:bg-card/80 transition-colors"
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <mod.icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-tight">
                {mod.name}
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                {mod.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
