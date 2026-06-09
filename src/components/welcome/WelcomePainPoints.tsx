import { PAIN_POINTS } from "./welcome.data";

const TONES = [
  { iconBg: "bg-orange-500/20", iconText: "text-orange-400" },
  { iconBg: "bg-pink-500/20",   iconText: "text-pink-400" },
  { iconBg: "bg-purple-500/20", iconText: "text-purple-400" },
] as const;

export function WelcomePainPoints() {
  return (
    <section
      className="welcome-fade pt-4"
      style={{ "--delay": "240ms" } as React.CSSProperties}
      aria-label="Dores comuns"
    >
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-white/40">
        Já passou por isso?
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PAIN_POINTS.map((item, i) => {
          const tone = TONES[i % TONES.length];
          const Icon = item.icon;
          return (
            <article
              key={i}
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <div className={`mb-6 flex h-10 w-10 items-center justify-center rounded-xl ${tone.iconBg} ${tone.iconText}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="mb-4 italic text-white/60">&ldquo;{item.pain}&rdquo;</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {item.solve}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
