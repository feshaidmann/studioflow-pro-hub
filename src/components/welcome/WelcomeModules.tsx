import { MODULES } from "./welcome.data";

export function WelcomeModules() {
  return (
    <section
      className="welcome-fade pt-8"
      style={{ "--delay": "300ms" } as React.CSSProperties}
      aria-label="Módulos integrados"
    >
      <h2 className="font-display mb-2 text-4xl text-white">Tudo que um lançamento precisa</h2>
      <p className="mb-8 text-white/40">
        {MODULES.length} módulos integrados — use o que precisar.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {MODULES.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <div
              key={i}
              className="rounded-3xl border border-white/5 bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-orange-400">
                <Icon className="h-4 w-4" />
              </div>
              <h4 className="mb-1 font-bold text-white">{mod.name}</h4>
              <p className="text-xs text-white/50 leading-snug">{mod.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
