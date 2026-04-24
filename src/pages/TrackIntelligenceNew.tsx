import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useProjects } from "@/contexts/ProjectContext";
import { generateTrackIntelligence } from "@/hooks/useTrackIntelligence";
import { toast } from "sonner";

const GENRES = ["Trap", "Funk", "MPB", "Indie Pop", "Rock", "Sertanejo", "Pop", "R&B", "Eletrônica", "Hip Hop", "Samba", "Pagode", "Reggae", "Outro"];
const AUDIENCES = ["13–17", "18–24", "25–34", "35+", "Geral"];
const PLATFORMS = ["Spotify", "Apple Music", "Deezer", "YouTube Music", "TikTok"];
const GOALS = [
  { value: "crescer_base", label: "Crescer base de fãs" },
  { value: "playlists", label: "Entrar em playlists editoriais" },
  { value: "receita", label: "Gerar receita" },
  { value: "validar", label: "Validar conceito artístico" },
];
const STATUS_OPTS = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "em_andamento", label: "Em andamento" },
];

const ROTATING_MSGS = [
  "Analisando estágio do projeto...",
  "Cruzando com requisitos de plataforma...",
  "Avaliando alinhamento de mercado...",
  "Gerando diagnóstico...",
];

export default function TrackIntelligenceNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects } = useProjects();

  const [projectId, setProjectId] = useState<string>(searchParams.get("project") || "");
  const [trackTitle, setTrackTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [audience, setAudience] = useState("");
  const [date, setDate] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["Spotify"]);
  const [goal, setGoal] = useState("");
  const [masterStatus, setMasterStatus] = useState("");
  const [artworkStatus, setArtworkStatus] = useState("");
  const [distStatus, setDistStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  // Pré-preenche título a partir do projeto
  useEffect(() => {
    if (projectId && !trackTitle) {
      const p = projects.find(x => x.id === projectId);
      if (p) setTrackTitle(p.name);
    }
  }, [projectId]); // eslint-disable-line

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setMsgIdx(i => (i + 1) % ROTATING_MSGS.length), 2200);
    return () => clearInterval(t);
  }, [loading]);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const canSubmit = trackTitle && genre && audience && date && platforms.length > 0 && goal && masterStatus && artworkStatus && distStatus;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    const res = await generateTrackIntelligence({
      project_id: projectId || null,
      track_title: trackTitle,
      genre, target_audience: audience, target_release_date: date,
      target_platforms: platforms, release_goal: goal,
      master_status: masterStatus as any,
      artwork_status: artworkStatus as any,
      distributor_status: distStatus as any,
    });
    setLoading(false);
    if (res) navigate(`/track-intelligence/${res.id}`);
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-20">
        <Card className="p-10 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
            <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">{ROTATING_MSGS[msgIdx]}</p>
          <p className="text-xs text-muted-foreground/60">Pode levar 8–15 segundos</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
      <button onClick={() => navigate("/track-intelligence")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Voltar ao histórico
      </button>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Nova análise de prontidão</h1>
        <p className="text-sm text-muted-foreground">Preencha o contexto do release. A IA cruza com os dados do projeto.</p>
      </header>

      <Card className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Projeto (opcional)</Label>
          <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Análise avulsa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem projeto vinculado</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Título da faixa *</Label>
          <Input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} maxLength={100} placeholder="Nome da música ou EP" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Gênero *</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Público-alvo *</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue placeholder="Faixa etária" /></SelectTrigger>
              <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Data-alvo de lançamento *</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Plataformas-alvo *</Label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(p => (
              <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Objetivo principal *</Label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Master validado?", val: masterStatus, set: setMasterStatus },
            { label: "Artwork pronto?", val: artworkStatus, set: setArtworkStatus },
            { label: "Distribuidora?", val: distStatus, set: setDistStatus },
          ].map((f, i) => (
            <div key={i} className="space-y-1.5">
              <Label className="text-xs">{f.label} *</Label>
              <Select value={f.val} onValueChange={f.set}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
          <Sparkles className="h-4 w-4" /> Gerar diagnóstico
        </Button>
      </Card>
    </div>
  );
}
