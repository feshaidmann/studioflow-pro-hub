import { useState } from "react";
import {
  BookOpen,
  FolderKanban,
  DollarSign,
  CalendarDays,
  Users,
  Bot,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  GraduationCap,
  Wand2,
  Sparkles,
  Music2,
  Plus,
  Send,
  Upload,
  Activity,
  CalendarPlus,
  UserPlus,
  Star,
  ChevronRight,
  Zap,
  LayoutDashboard,
  User,
  TrendingDown,
  TrendingUp,
  Percent,
  AlertTriangle,
  ListChecks,
  Dna,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Mini helpers ──────────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3 mt-3">
      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-3">
      <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{n}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{children}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

function ExampleQuery({
  icon: Icon,
  text,
  color = "text-primary",
}: {
  icon: React.ElementType;
  text: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-secondary/40 border border-border/30 px-3 py-2 mb-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
      <span className="text-xs text-foreground italic">"{text}"</span>
    </div>
  );
}

// ─── Mockup frame ─────────────────────────────────────────────────────────────

function MockupFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-card/40 overflow-hidden mb-6">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/40">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive/50" />
          <span className="h-2 w-2 rounded-full bg-amber-400/50" />
          <span className="h-2 w-2 rounded-full bg-green-400/50" />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
          {title}
        </span>
      </div>
      <div className="p-3 text-[11px]">{children}</div>
    </div>
  );
}

// ─── Mockups ──────────────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <MockupFrame title="Dashboard — StudioFlow Pro">
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: "Receita", value: "R$ 5.000", color: "text-[hsl(var(--success))]" },
          { label: "Despesas", value: "R$ 3.000", color: "text-destructive" },
          { label: "Resultado", value: "R$ 2.000", color: "text-[hsl(var(--success))]" },
          { label: "Margem", value: "40%", color: "text-primary" },
        ].map((k) => (
          <div key={k.label} className="rounded bg-card/60 border border-border/30 px-2 py-1.5">
            <p className="text-muted-foreground text-[9px]">{k.label}</p>
            <p className={cn("font-bold font-mono text-[11px]", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 space-y-1.5">
          <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Projetos</p>
          {[
            { name: "EP Raízes", stage: "master" },
            { name: "Álbum Vol.1", stage: "upload" },
            { name: "Single feat.", stage: "mix" },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-1.5 rounded bg-card/60 border border-border/30 px-2 py-1">
              <Music2 className="h-2.5 w-2.5 text-primary" />
              <span className="flex-1 truncate font-medium">{p.name}</span>
              <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{p.stage}</Badge>
            </div>
          ))}
        </div>
        <div className="col-span-1 space-y-1.5">
          <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Checklist</p>
          {["Confirmar upload", "Revisar EQ vocal", "Contrato assinado"].map((t, i) => (
            <div key={t} className="flex items-center gap-1.5 rounded bg-card/60 border border-border/30 px-2 py-1">
              <div className={cn("h-2.5 w-2.5 rounded-full border", i === 0 ? "bg-primary border-primary" : "border-border")} />
              <span className="truncate text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
        <div className="col-span-1 space-y-1.5">
          <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Assistente IA</p>
          <div className="rounded bg-card/60 border border-border/30 px-2 py-2 space-y-1">
            <div className="rounded bg-primary/10 px-1.5 py-1 text-muted-foreground">Como estão meus projetos?</div>
            <div className="rounded bg-secondary/40 px-1.5 py-1 text-foreground">Você tem 3 projetos ativos. O EP Raízes está em Master…</div>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function ProjectsMockup() {
  const stages = ["Projeto Iniciado", "Gravação", "Mix", "Master", "Upload", "Lançado"];
  return (
    <MockupFrame title="Projetos">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-foreground text-[10px]">Projetos</span>
        <div className="flex items-center gap-1 text-primary font-medium bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">
          <Plus className="h-2.5 w-2.5" /> <span>Novo Projeto</span>
        </div>
      </div>
      <div className="rounded bg-card/60 border border-border/30 px-2 py-1.5 flex items-center gap-2 mb-1.5 opacity-60">
        <Music2 className="h-3 w-3 text-primary shrink-0" />
        <span className="flex-1 font-medium truncate">Single feat. Ana</span>
        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 shrink-0">mix</Badge>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="rounded-lg border border-primary/40 bg-card/70 p-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground text-[10px]">EP Raízes — Banda XYZ</p>
            <p className="text-muted-foreground text-[8px]">Banda XYZ · 128 BPM · Am</p>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {stages.map((s, i) => (
            <span key={s} className={cn(
              "text-[7px] px-1.5 py-0.5 rounded border",
              i === 0 ? "bg-primary/20 border-primary/50 text-primary font-semibold" : "bg-secondary/40 border-border/30 text-muted-foreground"
            )}>{s}</span>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-[8px] mb-0.5">
            <span className="text-muted-foreground">Progresso do Mix</span>
            <span className="text-primary font-bold font-mono">10%</span>
          </div>
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: "10%" }} />
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function ProjectDetailMockup() {
  return (
    <MockupFrame title="Detalhe do Projeto — /projects/:id">
      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border/30">
        <ChevronRight className="h-3 w-3 text-muted-foreground rotate-180 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-foreground text-[10px]">EP Raízes <Badge variant="secondary" className="text-[7px] h-3 px-1 ml-1">EP</Badge></p>
          <p className="text-muted-foreground text-[8px]">Eu mesmo · Lançamento: 30/06/2025</p>
        </div>
      </div>
      <div className="rounded bg-card/60 border border-border/30 px-2 py-1.5 mb-2">
        <div className="flex justify-between text-[8px] mb-0.5">
          <span className="font-medium">Mix</span>
          <span className="text-primary font-bold font-mono">50%</span>
        </div>
        <div className="h-1 rounded-full bg-secondary overflow-hidden mb-1">
          <div className="h-full rounded-full bg-primary" style={{ width: "50%" }} />
        </div>
        <div className="flex justify-between">
          {["Iniciado", "Gravação", "Mix", "Master", "Upload", "Lançado"].map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-0.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", i < 2 ? "bg-[hsl(var(--success))]" : i === 2 ? "bg-primary ring-1 ring-primary/30" : "bg-muted-foreground/25")} />
              <span className={cn("text-[6px] hidden sm:block", i === 2 ? "text-primary font-semibold" : i < 2 ? "text-[hsl(var(--success))]/80" : "text-muted-foreground/40")}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[
          { label: "Faixas", value: "4/6", color: "text-primary" },
          { label: "Equipe", value: "3", color: "text-primary" },
          { label: "Receitas", value: "R$ 2k", color: "text-[hsl(var(--success))]" },
          { label: "Saldo", value: "+R$ 800", color: "text-primary" },
        ].map((k) => (
          <div key={k.label} className="rounded bg-card/60 border border-border/30 px-1.5 py-1 text-center">
            <p className={cn("font-bold text-[9px]", k.color)}>{k.value}</p>
            <p className="text-muted-foreground text-[7px]">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mb-2">
        {["🎵 Faixas", "👥 Equipe", "💰 Financeiro"].map((t, i) => (
          <span key={t} className={cn("text-[8px] px-2 py-0.5 rounded", i === 0 ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground")}>{t}</span>
        ))}
      </div>
      <div className="space-y-1">
        {[
          { name: "Intro", done: true },
          { name: "Vocal Principal", done: true },
          { name: "Baixo", done: false },
        ].map((tr) => (
          <div key={tr.name} className="flex items-center gap-1.5 rounded bg-card/60 border border-border/30 px-2 py-1">
            {tr.done
              ? <CheckCircle2 className="h-2.5 w-2.5 text-[hsl(var(--success))] shrink-0" />
              : <span className="h-2.5 w-2.5 rounded-full border border-border shrink-0" />}
            <span className={cn("text-[9px]", tr.done ? "text-muted-foreground line-through" : "font-medium")}>{tr.name}</span>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function FinanceMockup() {
  return (
    <MockupFrame title="Finanças">
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: "Receitas", value: "R$ 5.000", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/0.1)]" },
          { label: "Despesas", value: "R$ 3.000", color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Resultado", value: "+R$ 2.000", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/0.1)]" },
        ].map((c) => (
          <div key={c.label} className={cn("rounded border border-border/30 px-2 py-1.5", c.bg)}>
            <p className="text-muted-foreground text-[9px]">{c.label}</p>
            <p className={cn("font-bold font-mono", c.color)}>{c.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider mb-1.5">Transações Recentes</p>
      <div className="space-y-1">
        {[
          { desc: "Venda de Beat", value: "+R$ 1.500", paid: true },
          { desc: "Cachê — Músico Session", value: "-R$ 800", paid: false },
          { desc: "Licença Plugin", value: "-R$ 350", paid: true },
        ].map((t) => (
          <div key={t.desc} className="flex items-center gap-2 rounded bg-card/60 border border-border/30 px-2 py-1">
            <span className="flex-1 truncate font-medium">{t.desc}</span>
            <span className={cn("font-mono font-bold text-[10px] shrink-0", t.value.startsWith("+") ? "text-[hsl(var(--success))]" : "text-destructive")}>{t.value}</span>
            <Badge variant={t.paid ? "default" : "secondary"} className="text-[8px] h-3.5 px-1 shrink-0">{t.paid ? "Pago" : "Pendente"}</Badge>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function AgendaMockup() {
  return (
    <MockupFrame title="Agenda">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          {["Todos", "Hoje", "7 dias", "Mês"].map((f, i) => (
            <span key={f} className={cn("text-[9px] px-1.5 py-0.5 rounded", i === 0 ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground")}>{f}</span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-primary font-medium bg-primary/10 rounded px-1.5 py-0.5">
          <CalendarPlus className="h-2.5 w-2.5" /> <span>Novo Evento</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { title: "Show — SESC Pompéia", type: "Show", date: "Hoje • 20h00", color: "border-l-[hsl(var(--success))]" },
          { title: "Sessão de Gravação", type: "Gravação", date: "Amanhã • 14h00", color: "border-l-sky-400" },
          { title: "Entrega Mix — Álbum", type: "Prazo", date: "Sex • 23h59", color: "border-l-amber-400" },
        ].map((e) => (
          <div key={e.title} className={cn("rounded bg-card/60 border border-border/30 border-l-2 px-2 py-1.5", e.color)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-muted-foreground text-[9px]">{e.date}</p>
              </div>
              <Badge variant="secondary" className="text-[8px] h-3.5 px-1 shrink-0">{e.type}</Badge>
            </div>
          </div>
        ))}
      </div>
    </MockupFrame>
  );
}

function ProfessionalsMockup() {
  const rows = [
    { name: "Rodrigo Trevisan", specialty: "Produtor", stars: 5, invite: "button" },
    { name: "Ana Lima", specialty: "Vocalista", stars: 4, invite: "pending" },
    { name: "DJ Marcos", specialty: "DJ / Arranjador", stars: 3, invite: "accepted" },
  ];
  return (
    <MockupFrame title="Profissionais">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Parceiros</span>
        <div className="flex items-center gap-1 text-primary font-medium bg-primary/10 rounded px-1.5 py-0.5">
          <UserPlus className="h-2.5 w-2.5" /> <span>Novo</span>
        </div>
      </div>
      <div className="rounded border border-border/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground">
              {["Nome", "Especialidade", "⭐", "Convite"].map((h) => (
                <th key={h} className="px-1.5 py-1 text-left font-medium text-[8px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border/20">
                <td className="px-1.5 py-1 font-medium text-[8px]">{r.name}</td>
                <td className="px-1.5 py-1 text-muted-foreground text-[8px]">{r.specialty}</td>
                <td className="px-1.5 py-1 text-[8px]">
                  <span className="text-amber-400">{"★".repeat(r.stars)}</span>
                </td>
                <td className="px-1.5 py-1">
                  {r.invite === "button" && <span className="text-[7px] bg-primary text-primary-foreground rounded px-1.5 py-0.5 font-medium">Convidar</span>}
                  {r.invite === "pending" && <span className="text-[7px] bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded px-1.5 py-0.5">📧 Pendente</span>}
                  {r.invite === "accepted" && <span className="text-[7px] bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)] rounded px-1.5 py-0.5">✅ Aceito</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MockupFrame>
  );
}

function ProfileMockup() {
  return (
    <MockupFrame title="Meu Perfil">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border/30">
        <div className="h-10 w-10 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">DJ Marquinhos</p>
          <p className="text-muted-foreground text-[9px]">@djmarquinhos · Produtor</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded bg-card/60 border border-dashed border-border/40 px-2 py-2">
          <Upload className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground text-[9px]">Clique para enviar foto de perfil</span>
        </div>
        <div className="rounded bg-card/60 border border-border/30 px-2 py-1.5">
          <p className="text-[8px] text-muted-foreground mb-0.5">Bio</p>
          <p className="text-muted-foreground text-[9px]">Produtor independente, São Paulo...</p>
        </div>
      </div>
    </MockupFrame>
  );
}

function AIMockup() {
  return (
    <MockupFrame title="Assistente IA">
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 rounded-lg bg-secondary/40 border border-border/30 px-2 py-1.5 text-muted-foreground">
            Olá! Tenho acesso aos seus projetos, finanças e parceiros. Como posso ajudar?
          </div>
        </div>
        <div className="flex gap-1.5 flex-row-reverse">
          <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold">EU</span>
          </div>
          <div className="flex-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1.5 text-foreground text-right">
            Quais projetos estão atrasados?
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 rounded-lg bg-secondary/40 border border-border/30 px-2 py-1.5 text-muted-foreground">
            O <strong className="text-foreground">EP Raízes</strong> está em Master há 12 dias sem atualização…
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/40 px-2 py-1.5">
          <span className="flex-1 text-muted-foreground">Pergunte algo sobre seus projetos...</span>
          <Send className="h-3 w-3 text-primary" />
        </div>
      </div>
    </MockupFrame>
  );
}

function MusicDNAMockup() {
  return (
    <MockupFrame title="DNA Musical">
      <div className="flex items-center justify-center rounded-md border-2 border-dashed border-primary/30 bg-primary/5 py-3 mb-2">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Dna className="h-5 w-5 text-primary" />
          <span>Arraste seu arquivo de áudio</span>
          <span className="text-[9px] text-muted-foreground/60">.wav, .mp3, .flac — até 50 MB</span>
        </div>
      </div>
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
              {m.status && <span className="mr-0.5">{m.status}</span>}{m.value}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 h-4 rounded overflow-hidden mt-2">
        {[
          { label: "Intro", w: "12%", color: "bg-muted-foreground/30" },
          { label: "Verso", w: "28%", color: "bg-primary/40" },
          { label: "Refrão", w: "22%", color: "bg-primary/70" },
          { label: "Bridge", w: "14%", color: "bg-[hsl(var(--warning))]/40" },
          { label: "Refrão", w: "18%", color: "bg-primary/70" },
          { label: "Outro", w: "6%", color: "bg-muted-foreground/30" },
        ].map((s, i) => (
          <div key={i} className={`${s.color} flex items-center justify-center`} style={{ width: s.w }}>
            <span className="text-[6px] text-foreground/80 font-medium truncate px-0.5">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded bg-primary/5 border border-primary/20 px-2 py-1.5 mt-2 text-[10px] text-muted-foreground leading-relaxed">
        <span className="text-foreground font-medium">🎯 Diagnóstico IA:</span> True Peak acima de 0 dBTP causará clipagem. Contraste verso→refrão insuficiente. Centroide em 1840 Hz indica déficit na faixa de presença.
      </div>
    </MockupFrame>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const tabs = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", short: "Dash" },
  { id: "projects", icon: FolderKanban, label: "Projetos", short: "Proj" },
  { id: "project-detail", icon: ListChecks, label: "Detalhe do Projeto", short: "Detail" },
  { id: "music-dna", icon: Dna, label: "DNA Musical", short: "DNA" },
  { id: "finance", icon: DollarSign, label: "Finanças", short: "Fin" },
  { id: "agenda", icon: CalendarDays, label: "Agenda", short: "Agenda" },
  { id: "contacts", icon: Users, label: "Profissionais", short: "Prof" },
  { id: "profile", icon: User, label: "Meu Perfil", short: "Perfil" },
  { id: "ai", icon: Bot, label: "Assistente IA", short: "IA" },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ─── Tab contents ─────────────────────────────────────────────────────────────

const tabContent: Record<TabId, React.ReactNode> = {
  dashboard: (
    <div className="space-y-2">
      <DashboardMockup />
      <SectionTitle>O que é o StudioFlow Pro?</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Uma plataforma completa para{" "}
        <strong className="text-foreground">artistas independentes</strong>{" "}
        gerenciarem todo o ciclo de vida dos seus projetos — da criação até a distribuição.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {[
          { icon: FolderKanban, title: "Projetos", desc: "Acompanhe Rough → Mix → Master → Upload com detalhamento por faixa" },
          { icon: Dna, title: "DNA Musical", desc: "Diagnóstico técnico e artístico da faixa com IA — BPM, tom, seções, LUFS" },
          { icon: DollarSign, title: "Finanças", desc: "Receitas, despesas e saldo por projeto" },
          { icon: CalendarDays, title: "Agenda", desc: "Shows, gravações e prazos com detecção de conflito" },
          { icon: Users, title: "Profissionais", desc: "Parceiros com bio, especialidade e avaliação por estrelas" },
          { icon: Bot, title: "Assistente IA", desc: "Mentor educativo e analista dos seus dados" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-lg bg-card/50 border border-border/50 p-3">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Fluxo recomendado de um projeto</SectionTitle>
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50">
        {["Iniciado", "Gravação", "Mix", "Master", "Upload", "Lançado"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-2">
            <Badge variant={i === 2 ? "default" : "secondary"} className="text-xs">{s}</Badge>
            {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <Step n={1}>No <strong>Dashboard</strong>, você vê os KPIs financeiros globais, projetos ativos e o Checklist do Dia em uma só tela.</Step>
      <Step n={2}>Use o <strong>filtro de projeto</strong> no topo para focar nos números de um único projeto.</Step>
      <Step n={3}>O <strong>Checklist do Dia</strong> é preenchido por tarefas que você cria manualmente ou recebe do Assistente IA.</Step>
      <Tip>Mantenha todos os módulos atualizados — quanto mais dados, mais preciso será o Assistente IA.</Tip>
    </div>
  ),

  projects: (
    <div className="space-y-2">
      <ProjectsMockup />
      <SectionTitle>Criar um projeto</SectionTitle>
      <Step n={1}>Clique em <strong>"Novo Projeto"</strong> na barra superior.</Step>
      <Step n={2}>Preencha <strong>nome, artista, BPM e tonalidade (Key)</strong>. Ex: 128 BPM em Am (Lá menor).</Step>
      <Step n={3}>Escolha o <strong>tipo</strong>: Single, EP, Álbum, Beat, Trilha Guia ou Feat.</Step>
      <Step n={4}>Selecione a <strong>etapa atual</strong>: Rough (rascunho), Mix, Master ou Upload.</Step>

      <SectionTitle>Gerenciar projetos</SectionTitle>
      <Step n={1}>Na lista de projetos, clique em <strong>"Detalhes"</strong> para abrir a visão consolidada do projeto.</Step>
      <Step n={2}>Edite BPM, Key, estágio e % de progresso diretamente no card via botão <strong>✏️ editar</strong>.</Step>
      <Step n={3}>Quando concluído, marque o projeto como <strong>"Finalizado"</strong> para movê-lo ao histórico.</Step>

      <SectionTitle>Convites para profissionais</SectionTitle>
      <Step n={1}>Vá à página <strong>Profissionais</strong> e localize o parceiro na tabela — a coluna <strong>Convite</strong> exibe um botão <strong>"Convidar"</strong> para quem ainda não foi convidado.</Step>
      <Step n={2}>Ao clicar em <strong>"Convidar"</strong>, um e-mail é enviado com detalhes do projeto, função, cachê e prazo.</Step>
      <Step n={3}>Quando o profissional responde, o status atualiza para <strong>✅ Aceito</strong> ou <strong>❌ Recusado</strong>.</Step>
      <Tip>Quando o projeto chega em 100%, clique em "Concluir projeto" — ele vai para o histórico de Concluídos e incrementa o contador de projetos do seu perfil público.</Tip>
    </div>
  ),

  "project-detail": (
    <div className="space-y-2">
      <ProjectDetailMockup />
      <SectionTitle>O que é a tela de detalhe?</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Acessada pelo botão <strong className="text-foreground">"Detalhes"</strong> na lista de projetos, ela reúne em uma única tela tudo o que pertence ao projeto — faixas, equipe e finanças.
      </p>

      <SectionTitle>Aba Faixas (Tracks)</SectionTitle>
      <Step n={1}>Lista todas as faixas do projeto com <strong>nome da faixa, músico responsável</strong> e checkbox de concluído.</Step>
      <Step n={2}>Faixas marcadas como <strong>✅ done</strong> aparecem riscadas e contam no KPI de progresso.</Step>
      <Step n={3}>O KPI <strong>"Faixas"</strong> mostra quantas estão concluídas em relação ao total (ex: 4/6) em tempo real.</Step>

      <SectionTitle>Aba Equipe</SectionTitle>
      <Step n={1}>Lista todos os membros com nome, papel, cachê e contato.</Step>
      <Step n={2}>Use <strong>"Gerenciar equipe"</strong> para adicionar ou editar membros.</Step>

      <SectionTitle>Aba Financeiro</SectionTitle>
      <Step n={1}>Exibe <strong>receitas, despesas, margem e saldo</strong> específicos desse projeto.</Step>
      <Step n={2}>Lista todas as transações vinculadas ao projeto ordenadas por data.</Step>
      <Step n={3}>Você pode adicionar uma nova transação diretamente nessa aba.</Step>
      <Tip>Use a aba Financeiro como "mini-balanço" do projeto para calcular o ROI antes de aceitar novos projetos similares.</Tip>
    </div>
  ),

  "music-dna": (
    <div className="space-y-2">
      <MusicDNAMockup />
      <SectionTitle>O que é o DNA Musical?</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O <strong className="text-foreground">DNA Musical</strong> é um módulo de diagnóstico que analisa seu arquivo de áudio diretamente no navegador, extrai métricas técnicas reais e gera um laudo completo com IA — tudo sem sair da plataforma.
      </p>

      <SectionTitle>O que é analisado</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {[
          { title: "Loudness", desc: "LUFS integrado, LUFS short-term, True Peak e Dynamic Range" },
          { title: "Rítmica e harmonia", desc: "BPM (autocorrelação), tonalidade (chromagram), duração" },
          { title: "Espectro", desc: "Spectral Centroid (brilho), Rolloff (85% energia), Flatness (ruído vs. tonal)" },
          { title: "Perfil acústico", desc: "Energia, dançabilidade, acústica, valência, instrumentalidade, liveness, speechiness" },
          { title: "Segmentação", desc: "Intro, verso, pré-refrão, refrão, bridge, outro — com métricas por seção" },
          { title: "Contraste verso→refrão", desc: "Ganho de RMS, energia e brilho espectral entre seções" },
        ].map(({ title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-lg bg-card/50 border border-border/50 p-3">
            <div className="h-6 w-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Como usar</SectionTitle>
      <Step n={1}>Acesse <strong>DNA Musical</strong> no menu lateral.</Step>
      <Step n={2}>Dê um <strong>nome para a faixa</strong> e, opcionalmente, adicione notas descritivas e artistas de referência.</Step>
      <Step n={3}>Faça o <strong>upload do arquivo de áudio</strong> (.wav, .mp3 ou .flac).</Step>
      <Step n={4}>Clique em <strong>"Analisar"</strong> e acompanhe o progresso em tempo real: extração de áudio → perfil acústico → cálculo de distância → diagnóstico IA.</Step>

      <SectionTitle>O que você recebe</SectionTitle>
      <div className="space-y-1.5">
        {[
          "Gênero classificado automaticamente pela análise sonora",
          "Identidade musical: mood, território sonoro, tags e persona do ouvinte",
          "Diagnóstico técnico: avaliação de LUFS, True Peak, DR e espectro",
          "Análise de seções: contraste verso→refrão, seção mais forte e mais fraca",
          "Referências próximas: 3 artistas similares com % e motivo baseado em dados",
          "Pontos fortes e gargalos criativos — todos com números reais",
          "Sugestões de arranjo ancoradas em métricas",
          "Próximos passos priorizados (Alta/Média) com ação e impacto mensuráveis",
          "Gráfico de radar comparando a faixa com o perfil do gênero",
          "Timeline visual das seções detectadas",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Feedback e calibração</SectionTitle>
      <Step n={1}>Após o resultado, clique em <strong>"Dar Feedback"</strong> para corrigir o gênero ou ajustar os atributos acústicos.</Step>
      <Step n={2}>O sistema gera um resumo diferencial comparando o original com a correção — isso retroalimenta o modelo.</Step>

      <Tip>
        O DNA Musical analisa os dados técnicos reais do áudio — quanto melhor a qualidade do arquivo enviado (de preferência .wav sem compressão), mais preciso será o diagnóstico.
      </Tip>
      <Warn>
        Arquivos muito curtos (menos de 30 segundos) podem não ter seções suficientes para uma segmentação completa. O ideal é enviar a faixa inteira.
      </Warn>
    </div>
  ),

  finance: (
    <div className="space-y-2">
      <FinanceMockup />
      <SectionTitle>Registrar transações</SectionTitle>
      <Step n={1}>Clique em <strong>"Nova Transação"</strong> e escolha o tipo: <strong>Receita</strong> ou <strong>Despesa</strong>.</Step>
      <Step n={2}>Vincule a transação a um <strong>projeto</strong> para calcular o saldo de cada projeto.</Step>
      <Step n={3}>Escolha uma <strong>categoria</strong> específica do universo musical.</Step>
      <Step n={4}>Marque se o pagamento já foi <strong>efetuado</strong> ou está pendente.</Step>

      <SectionTitle>Categorias de receita</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Venda Música/Beat", "Shows e Apresentações", "Streaming", "ECAD / Direitos Autorais", "Licenciamento", "Sync / Trilha", "Royalties", "Aulas / Workshops", "Outros"].map((c) => (
          <Badge key={c} variant="secondary" className="text-xs font-normal">{c}</Badge>
        ))}
      </div>

      <SectionTitle>Categorias de despesa</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Músicos e Session", "Estúdio e Gravação", "Mix e Master", "Plugins e Software", "Equipamentos", "Marketing Digital", "Distribuição Digital", "Transporte e Logística", "Outros"].map((c) => (
          <Badge key={c} variant="outline" className="text-xs font-normal">{c}</Badge>
        ))}
      </div>

      <SectionTitle>Visão por projeto</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <FolderKanban className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Na <strong className="text-foreground">tela de Detalhe do Projeto</strong>, a aba Financeiro mostra receitas, despesas e saldo exclusivos daquele projeto.
        </p>
      </div>
      <Tip>Use a categoria "Outros" para despesas fora da lista — um campo de texto adicional aparecerá automaticamente.</Tip>
    </div>
  ),

  agenda: (
    <div className="space-y-2">
      <AgendaMockup />
      <SectionTitle>Criar eventos</SectionTitle>
      <Step n={1}>Clique em <strong>"Novo Evento"</strong> e preencha título, tipo, data e hora de início/fim.</Step>
      <Step n={2}>Vincule o evento a um <strong>projeto</strong> para organização contextual.</Step>
      <Step n={3}>Adicione <strong>localização</strong> e descrição com informações relevantes.</Step>

      <SectionTitle>Detecção de conflito de horário</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Ao criar um evento, o sistema verifica automaticamente se existe sobreposição de horário. Um aviso é exibido listando os conflitos — você pode <strong className="text-foreground">salvar mesmo assim</strong> ou ajustar.
        </p>
      </div>

      <SectionTitle>Tipos de evento</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {[
          { type: "Show / Apresentação", color: "border-l-[hsl(var(--success))]", desc: "Registre receita manualmente após o show" },
          { type: "Sessão de Gravação", color: "border-l-sky-400", desc: "Vinculada a projetos em andamento" },
          { type: "Ensaio", color: "border-l-primary", desc: "Preparação para shows" },
          { type: "Reunião", color: "border-l-amber-400", desc: "Produtores, selos, empresários" },
          { type: "Prazo de Entrega", color: "border-l-destructive", desc: "Marque prazos críticos de projeto" },
          { type: "Outros", color: "border-l-muted-foreground", desc: "Qualquer compromisso relevante" },
        ].map(({ type, color, desc }) => (
          <div key={type} className={cn("rounded-md bg-card/50 border border-border/40 border-l-2 px-3 py-2", color)}>
            <p className="text-sm font-medium">{type}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Filtros disponíveis</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Todos", "Hoje", "Próximos 7 dias", "Este mês", "Por tipo", "Por projeto"].map((f) => (
          <Badge key={f} variant="secondary" className="text-xs font-normal">{f}</Badge>
        ))}
      </div>
      <Tip>Sempre defina horário de início <em>e</em> de fim nos eventos para que a detecção de conflito funcione com precisão.</Tip>
    </div>
  ),

  contacts: (
    <div className="space-y-2">
      <ProfessionalsMockup />
      <SectionTitle>Adicionar profissionais</SectionTitle>
      <Step n={1}>Vá em <strong>Profissionais</strong> e clique em <strong>"Novo"</strong>.</Step>
      <Step n={2}>Preencha nome, especialidade, e-mail, WhatsApp e uma <strong>bio breve</strong>.</Step>
      <Step n={3}>Marque o profissional como <strong>ativo ou inativo</strong>.</Step>
      <Step n={4}>Avalie parceiros após projetos para construir seu <strong>histórico de reputação</strong>.</Step>

      <SectionTitle>Especialidades</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Produtor", "Mixagem", "Masterização", "Guitarrista", "Baterista", "Vocalista", "DJ", "Arranjador", "Instrumentista", "Engenheiro de Som", "Programador", "Letrista"].map((s) => (
          <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
        ))}
      </div>

      <SectionTitle>Avaliação de parceiros</SectionTitle>
      <Step n={1}>Use o botão <strong>"Avaliar parceiro"</strong> (ícone ⭐) no card do profissional.</Step>
      <Step n={2}>Atribua de 1 a 5 estrelas e adicione notas sobre a colaboração.</Step>
      <Step n={3}>O histórico de avaliações fica visível no card e alimenta o Assistente IA.</Step>

      <SectionTitle>Listagem pública (para freelancers)</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/20">
        <Zap className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Profissionais que ativam <strong className="text-foreground">"Permitir listagem pública"</strong> e aceitam convites aparecem na busca de outros produtores.
        </p>
      </div>
      <Tip>Adicione a bio e especialidade dos seus parceiros — o Assistente IA usa essas informações para recomendar quem está disponível.</Tip>
    </div>
  ),

  profile: (
    <div className="space-y-2">
      <ProfileMockup />
      <SectionTitle>Foto de perfil (avatar)</SectionTitle>
      <Step n={1}>Vá em <strong>Configurações → Meu Perfil</strong>.</Step>
      <Step n={2}>Clique no <strong>círculo da foto</strong> para abrir o seletor de arquivo.</Step>
      <Step n={3}>Escolha uma imagem JPG, PNG ou WebP com até <strong>2 MB</strong>.</Step>
      <Step n={4}>O upload é automático — a foto aparece imediatamente.</Step>

      <SectionTitle>Perfil público</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Seu perfil público fica em <strong className="text-foreground">/u/seu-username</strong> e exibe nome, bio, especialidades, cidade, projetos concluídos e avaliação média.
        </p>
      </div>

      <SectionTitle>Outras informações do perfil</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Nome artístico", "Username (@)", "Bio", "Cidade", "Especialidades", "WhatsApp", "E-mail público", "Aceitar convites"].map((f) => (
          <Badge key={f} variant="secondary" className="text-xs font-normal">{f}</Badge>
        ))}
      </div>
      <Warn>Ative <strong>"Aceitar convites"</strong> no perfil para que outros produtores possam te convidar para projetos.</Warn>
    </div>
  ),

  ai: (
    <div className="space-y-2">
      <AIMockup />
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3 mb-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground font-medium">
          O Assistente IA tem acesso em tempo real aos seus projetos, parceiros, tarefas e finanças. Ele é mentor educativo <em>e</em> analista dos seus dados.
        </p>
      </div>

      <SectionTitle>Sobre parceiros e equipe</SectionTitle>
      {["Quem da minha agenda pode fazer mix?", "Tem alguém disponível para masterização?", "Quais parceiros têm nota acima de 4 estrelas?"].map((q) => (
        <ExampleQuery key={q} icon={MessageSquare} text={q} />
      ))}

      <SectionTitle>Sobre projetos e prioridades</SectionTitle>
      {["Quais projetos estão atrasados?", "O que preciso fazer hoje nos meus projetos?", "Me ajude a priorizar minhas tarefas desta semana"].map((q) => (
        <ExampleQuery key={q} icon={FolderKanban} text={q} />
      ))}

      <SectionTitle>Sobre finanças</SectionTitle>
      {["Como estão minhas finanças esse mês?", "Qual projeto tem o melhor ROI?", "Quanto gastei com músicos nos últimos projetos?"].map((q) => (
        <ExampleQuery key={q} icon={DollarSign} text={q} />
      ))}

      <SectionTitle>Técnicas de produção e mixagem</SectionTitle>
      {["Como ajusto o ganho de uma faixa vocal?", "Qual a diferença entre compressão paralela e serial?", "Quando usar sidechain no kick e baixo?", "O que é LUFS e qual o alvo para streaming?", "Como fazer mastering para Spotify?"].map((q) => (
        <ExampleQuery key={q} icon={GraduationCap} text={q} color="text-amber-400" />
      ))}

      <SectionTitle>Jornada do artista</SectionTitle>
      {["Como montar um contrato de licença de beat?", "Quais distribuidoras digitais recomendam para artistas indie?", "Como precificar serviços de mixagem?", "Me explique o processo de registro no ECAD"].map((q) => (
        <ExampleQuery key={q} icon={GraduationCap} text={q} color="text-[hsl(var(--success))]" />
      ))}

      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 mt-3">
        <Wand2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Ao final de cada resposta, a IA pode sugerir <strong className="text-foreground">tarefas acionáveis</strong>. Clique no <strong className="text-foreground">botão "+"</strong> para adicioná-la ao seu Checklist do Dia.
        </p>
      </div>

      <SectionTitle>Histórico de conversas</SectionTitle>
      <Step n={1}>Cada sessão é salva automaticamente como uma <strong>conversa</strong>.</Step>
      <Step n={2}>Use o dropdown <strong>"Histórico"</strong> no topo do chat para retomar conversas anteriores.</Step>
      <Step n={3}>Clique em <strong>"+ Nova"</strong> para iniciar um contexto limpo.</Step>
      <Tip>Quanto mais dados você cadastrar (projetos, parceiros, transações), mais precisa será a resposta da IA.</Tip>
    </div>
  ),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Tutorial
        </h1>
        <p className="text-muted-foreground mt-1">
          Guia completo de todas as funcionalidades do StudioFlow Pro.
        </p>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id
                ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </button>
        ))}
      </div>

      <Card className="glass-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardContent className="p-4 md:p-6">
          {tabContent[activeTab]}
        </CardContent>
      </Card>
    </div>
  );
}
