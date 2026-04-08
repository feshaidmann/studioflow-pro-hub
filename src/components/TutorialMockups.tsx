import { Badge } from "@/components/ui/badge";
import {
  Music2,
  Upload,
  DollarSign,
  Plus,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Percent,
  CalendarDays,
  MapPin,
  Clock,
  Mic2,
  Dna,
  Activity,
} from "lucide-react";

/* ── reusable frame ── */
function PagePreview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-background/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border/40">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="p-3 space-y-2 text-[11px]">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">{children}</span>
  );
}

/* ── 1. Dashboard ── */
export function DashboardMockup() {
  return (
    <PagePreview title="Dashboard">
      <Label>Active Projects</Label>
      <div className="space-y-1.5">
        {[
          { name: "Summer Vibes", artist: "MC Flow", pct: 72, stage: "mix" },
          { name: "Night Drive", artist: "DJ Pulse", pct: 45, stage: "rough" },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-2 rounded-md bg-card/60 border border-border/30 px-2 py-1.5">
            <Music2 className="h-3 w-3 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-muted-foreground font-mono">{p.pct}%</span>
              </div>
              <span className="text-muted-foreground">{p.artist}</span>
              <div className="h-1 mt-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{p.stage}</Badge>
          </div>
        ))}
      </div>

      <Label>Resumo Financeiro</Label>
      <div className="grid grid-cols-2 gap-1.5 mt-1 mb-1">
        {[
          { label: "Receita Total", value: "R$ 4.200", icon: DollarSign, color: "text-[hsl(var(--success))]" },
          { label: "Despesas", value: "R$ 1.350", icon: TrendingDown, color: "text-destructive" },
          { label: "Lucro", value: "R$ 2.850", icon: TrendingUp, color: "text-[hsl(var(--success))]" },
          { label: "Margem", value: "67%", icon: Percent, color: "text-primary" },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-card/60 border border-border/30 px-2 py-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <k.icon className={`h-2.5 w-2.5 ${k.color}`} />
              <span>{k.label}</span>
            </div>
            <span className={`font-bold font-mono ${k.color}`}>{k.value}</span>
          </div>
        ))}
      </div>

      <Label>Checklist do Dia</Label>
      <div className="rounded-md bg-muted/20 border border-border/30 px-2 py-2 mt-1 text-muted-foreground text-center">
        Nenhuma tarefa ainda
      </div>
    </PagePreview>
  );
}

/* ── 2. Projetos ── */
export function ProjectsMockup() {
  return (
    <PagePreview title="Projetos">
      <div className="flex items-center justify-between mb-1">
        <Label>Tabela de Projetos</Label>
        <div className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 rounded px-1.5 py-0.5">
          <Plus className="h-3 w-3" /> Novo Projeto
        </div>
      </div>
      <div className="rounded-md border border-border/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground">
              {["Projeto", "Artista", "BPM/Key", "Mix %", "Stage"].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { n: "Summer Vibes", a: "MC Flow", bpm: "128 / Am", mix: "72%", s: "mix" },
              { n: "Night Drive", a: "DJ Pulse", bpm: "140 / F#", mix: "45%", s: "rough" },
            ].map((r) => (
              <tr key={r.n} className="border-t border-border/20">
                <td className="px-2 py-1 font-medium">{r.n}</td>
                <td className="px-2 py-1 text-muted-foreground">{r.a}</td>
                <td className="px-2 py-1 font-mono">{r.bpm}</td>
                <td className="px-2 py-1 font-mono">{r.mix}</td>
                <td className="px-2 py-1"><Badge variant="secondary" className="text-[9px] h-4 px-1.5">{r.s}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Label>Formulário de Criação</Label>
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {["Nome", "Artista", "BPM", "Tonalidade", "Etapa"].map((f) => (
          <div key={f} className="rounded bg-muted/30 border border-border/30 px-2 py-1 text-muted-foreground">{f}</div>
        ))}
      </div>
    </PagePreview>
  );
}

/* ── 3. Master Analyzer ── */
export function MasterAnalyzerMockup() {
  return (
    <PagePreview title="Master Analyzer">
      <div className="flex items-center justify-center rounded-md border-2 border-dashed border-border/40 bg-muted/20 py-3 mb-2">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span>Arraste seu arquivo .wav / .mp3</span>
        </div>
      </div>

      <Label>Gauges de Análise</Label>
      <div className="flex justify-around mt-1">
        {[
          { label: "LUFS", value: "-14.2", color: "text-[hsl(var(--success))]" },
          { label: "True Peak", value: "-1.1 dBTP", color: "text-[hsl(var(--success))]" },
          { label: "Dynamic Range", value: "8.5 dB", color: "text-[hsl(var(--warning))]" },
        ].map((g) => (
          <div key={g.label} className="flex flex-col items-center gap-0.5">
            <div className="h-10 w-10 rounded-full border-2 border-primary/30 flex items-center justify-center">
              <span className={`text-[9px] font-bold font-mono ${g.color}`}>{g.value}</span>
            </div>
            <span className="text-muted-foreground">{g.label}</span>
          </div>
        ))}
      </div>

      <Label>Sugestões</Label>
      <div className="rounded-md bg-muted/20 border border-border/30 px-2 py-1.5 mt-1 text-muted-foreground">
        ✅ LUFS dentro do alvo · ⚠️ Dynamic Range pode melhorar
      </div>
    </PagePreview>
  );
}

/* ── 4. Financeiro ── */
export function FinancialMockup() {
  return (
    <PagePreview title="Financeiro">
      <div className="grid grid-cols-2 gap-2 mb-1">
        {[
          { label: "Total Recebido", value: "R$ 4.200", icon: DollarSign, color: "text-[hsl(var(--success))]" },
          { label: "Total Pendente", value: "R$ 1.350", icon: DollarSign, color: "text-[hsl(var(--warning))]" },
        ].map((c) => (
          <div key={c.label} className="rounded-md bg-card/60 border border-border/30 px-2 py-1.5">
            <div className="flex items-center gap-1 text-muted-foreground">
              <c.icon className="h-3 w-3" />
              <span>{c.label}</span>
            </div>
            <span className={`font-bold font-mono ${c.color}`}>{c.value}</span>
          </div>
        ))}
      </div>

      <Label>Gráfico Mensal</Label>
      <div className="flex items-end gap-1 h-10 mt-1 mb-2">
        {[40, 65, 50, 80, 70, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-primary/40" style={{ height: `${h}%` }} />
        ))}
      </div>

      <Label>Transações Recentes</Label>
      <div className="rounded-md border border-border/40 overflow-hidden mt-1">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground">
              {["Item", "Categoria", "Valor", "Status"].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { it: "Beat License", cat: "Receita", v: "R$ 500", s: "Pago" },
              { it: "Plugin Serum", cat: "Despesa", v: "R$ 189", s: "Pago" },
            ].map((r) => (
              <tr key={r.it} className="border-t border-border/20">
                <td className="px-2 py-1 font-medium">{r.it}</td>
                <td className="px-2 py-1 text-muted-foreground">{r.cat}</td>
                <td className="px-2 py-1 font-mono">{r.v}</td>
                <td className="px-2 py-1"><Badge variant="secondary" className="text-[9px] h-4 px-1.5">{r.s}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PagePreview>
  );
}

/* ── 5. Agenda ── */
export function AgendaMockup() {
  const events = [
    { time: "10:00", title: "Gravação — MC Flow", type: "Gravação", location: "Studio A", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { time: "14:30", title: "Mix Review — Night Drive", type: "Mix", location: "Home Studio", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.2)]" },
    { time: "19:00", title: "Show — Festival SP", type: "Show", location: "Ibirapuera", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  ];
  return (
    <PagePreview title="Agenda">
      <div className="flex items-center justify-between mb-1">
        <Label>Hoje — 24 Mar</Label>
        <div className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 rounded px-1.5 py-0.5">
          <Plus className="h-3 w-3" /> Novo Evento
        </div>
      </div>
      <div className="space-y-1.5">
        {events.map((e) => (
          <div key={e.time} className={`flex gap-2 items-start rounded-md border px-2 py-1.5 ${e.bg}`}>
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <Clock className={`h-2.5 w-2.5 ${e.color}`} />
              <span className={`text-[9px] font-mono font-bold mt-0.5 ${e.color}`}>{e.time}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{e.title}</p>
              <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{e.location}</span>
              </div>
            </div>
            <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 shrink-0 ${e.color}`}>{e.type}</Badge>
          </div>
        ))}
      </div>
      <Label>Esta semana</Label>
      <div className="flex gap-1 mt-1">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
          <div key={d} className={`flex-1 flex flex-col items-center gap-0.5 rounded py-1 ${i === 1 ? "bg-primary/15 border border-primary/20" : "bg-muted/30"}`}>
            <span className="text-[8px] text-muted-foreground">{d}</span>
            {i === 0 ? <Mic2 className="h-2 w-2 text-primary" /> : i === 2 ? <Music2 className="h-2 w-2 text-[hsl(var(--success))]" /> : <span className="h-2 w-2" />}
          </div>
        ))}
      </div>
    </PagePreview>
  );
}

/* ── 6. DNA Musical ── */
export function MusicDNAMockup() {
  const sections = [
    { label: "Intro", w: "12%", color: "bg-muted-foreground/30" },
    { label: "Verso", w: "28%", color: "bg-primary/40" },
    { label: "Refrão", w: "22%", color: "bg-primary/70" },
    { label: "Bridge", w: "14%", color: "bg-[hsl(var(--warning))]/40" },
    { label: "Refrão", w: "18%", color: "bg-primary/70" },
    { label: "Outro", w: "6%", color: "bg-muted-foreground/30" },
  ];

  return (
    <PagePreview title="DNA Musical">
      {/* Upload area */}
      <div className="flex items-center justify-center rounded-md border-2 border-dashed border-primary/30 bg-primary/5 py-3 mb-2">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Dna className="h-5 w-5 text-primary" />
          <span>Arraste seu arquivo de áudio</span>
          <span className="text-[9px] text-muted-foreground/60">.wav, .mp3, .flac — até 50 MB</span>
        </div>
      </div>

      {/* Metrics grid */}
      <Label>Métricas Técnicas</Label>
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {[
          { label: "LUFS", value: "-12.7", status: "⚠" },
          { label: "True Peak", value: "+0.6 dBTP", status: "🔴" },
          { label: "DR", value: "9.1 LU", status: "✅" },
          { label: "BPM", value: "128.4", status: "" },
          { label: "Tom", value: "Am", status: "" },
          { label: "Duração", value: "3:33", status: "" },
        ].map((m) => (
          <div key={m.label} className="rounded bg-card/60 border border-border/30 px-2 py-1.5 text-center">
            <p className="text-muted-foreground text-[8px]">{m.label}</p>
            <p className="font-bold font-mono text-[10px] text-foreground">
              {m.status && <span className="mr-0.5">{m.status}</span>}
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Section timeline */}
      <Label>Timeline de Seções</Label>
      <div className="flex gap-0.5 h-5 rounded overflow-hidden mt-1">
        {sections.map((s, i) => (
          <div
            key={i}
            className={`${s.color} flex items-center justify-center`}
            style={{ width: s.w }}
          >
            <span className="text-[7px] text-foreground/80 font-medium truncate px-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Radar placeholder */}
      <Label>Perfil Acústico</Label>
      <div className="flex items-center justify-around mt-1 rounded bg-card/60 border border-border/30 px-2 py-2">
        {[
          { label: "Energia", value: "72%" },
          { label: "Dança", value: "65%" },
          { label: "Acústica", value: "18%" },
          { label: "Valência", value: "45%" },
        ].map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-0.5">
            <div className="h-6 w-6 rounded-full border border-primary/30 flex items-center justify-center">
              <span className="text-[8px] font-bold font-mono text-primary">{f.value}</span>
            </div>
            <span className="text-[8px] text-muted-foreground">{f.label}</span>
          </div>
        ))}
      </div>

      {/* AI diagnosis preview */}
      <Label>Diagnóstico IA</Label>
      <div className="rounded bg-primary/5 border border-primary/20 px-2 py-1.5 mt-1 text-[10px] text-muted-foreground leading-relaxed">
        <span className="text-foreground font-medium">🎯 Resumo:</span> Faixa com LUFS acima do target Spotify (−14). True Peak em +0.6 dBTP causará clipagem. Contraste verso→refrão insuficiente (+1.4 dB). Centroide em 1840 Hz indica déficit na faixa de presença.
      </div>
    </PagePreview>
  );
}
