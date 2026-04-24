import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Loader2, Sparkles, Wand2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { generateTrackIntelligence } from "@/hooks/useTrackIntelligence";
import { useRateLimitDialog } from "@/hooks/useRateLimitDialog";
import { supabase } from "@/integrations/supabase/client";
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
  "Verificando análises técnicas anteriores...",
  "Avaliando alinhamento de mercado...",
  "Gerando diagnóstico...",
];

function PrefilledBadge() {
  return (
    <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-primary/5 text-primary border-primary/20 ml-1.5">
      auto
    </Badge>
  );
}

export default function TrackIntelligenceNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects } = useProjects();
  const { user } = useAuth();
  const { open: openRateLimit } = useRateLimitDialog();

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
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);
  const [linkedDna, setLinkedDna] = useState<{ lufs: number | null; bpm: number | null; key: string | null; mode: string | null; genre: string | null } | null>(null);

  // Pré-preenche a partir do projeto
  useEffect(() => {
    if (!projectId || !user) {
      setPrefilled({});
      setPrefillBanner(null);
      setLinkedDna(null);
      return;
    }
    const p = projects.find(x => x.id === projectId);
    if (!p) return;

    const filled: Record<string, boolean> = {};

    if (!trackTitle) { setTrackTitle(p.name); filled.trackTitle = true; }
    if (!date && p.uploadDate) { setDate(p.uploadDate); filled.date = true; }

    (async () => {
      // 1. Busca DNA vinculada diretamente ao projeto (preferencial)
      const { data: linked } = await supabase
        .from("music_dna_analyses")
        .select("id, track_name, genre, lufs_integrated, tempo_bpm, key_name, mode_name")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let hasDna = !!linked;

      if (linked) {
        setLinkedDna({
          lufs: linked.lufs_integrated as any,
          bpm: linked.tempo_bpm as any,
          key: linked.key_name,
          mode: linked.mode_name,
          genre: linked.genre,
        });
        // Sugere gênero detectado se artista ainda não escolheu
        if (!genre && linked.genre) { setGenre(linked.genre); filled.genre = true; }
      } else {
        setLinkedDna(null);
        // 2. Fallback legado: busca por nome
        const { data: dnaMatches } = await supabase
          .from("music_dna_analyses")
          .select("id, track_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        hasDna = (dnaMatches || []).some(
          (d: any) => (d.track_name || "").trim().toLowerCase() === p.name.trim().toLowerCase(),
        );
      }

      if (!masterStatus) {
        if (p.masterDone && hasDna) { setMasterStatus("sim"); filled.masterStatus = true; }
        else if (p.masterDone) { setMasterStatus("em_andamento"); filled.masterStatus = true; }
        else { setMasterStatus("nao"); filled.masterStatus = true; }
      }

      // 3. Lê release_checklist do projeto
      const { data: checklist } = await supabase
        .from("release_checklists")
        .select("items")
        .eq("project_id", projectId)
        .maybeSingle();
      const items = (checklist?.items || {}) as Record<string, { checked?: boolean; value?: string }>;

      if (!artworkStatus) {
        const capa = items.capa?.checked;
        setArtworkStatus(capa ? "sim" : "nao");
        filled.artworkStatus = true;
      }
      if (!distStatus) {
        const dist = items.distribuidora?.value || items.pronto_distribuir?.checked;
        setDistStatus(dist ? "sim" : "nao");
        filled.distStatus = true;
      }

      setPrefilled(filled);
      const count = Object.keys(filled).length;
      if (count > 0) {
        setPrefillBanner(`${count} ${count === 1 ? "campo carregado" : "campos carregados"} de "${p.name}" — revise antes de gerar.`);
      }
    })();
    // eslint-disable-next-line
  }, [projectId, user]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setMsgIdx(i => (i + 1) % ROTATING_MSGS.length), 2200);
    return () => clearInterval(t);
  }, [loading]);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const clearPrefilled = (key: string) => {
    setPrefilled(prev => { const n = { ...prev }; delete n[key]; return n; });
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
    }, openRateLimit);
    setLoading(false);
    if (res) navigate(`/track-intelligence/${res.id}`);
  };

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="animate-pulse">{ROTATING_MSGS[msgIdx]}</span>
        </div>

        {/* Skeleton do resultado */}
        <Card className="p-6 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-44 h-44 rounded-full bg-muted/40 mx-auto sm:mx-0 shrink-0" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 bg-muted/40 rounded w-1/3" />
                  <div className="h-1.5 bg-muted/30 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5 space-y-3 animate-pulse">
          <div className="h-3 bg-muted/40 rounded w-32" />
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted/20 rounded-lg" />)}
        </Card>
        <p className="text-[11px] text-muted-foreground/60 text-center">Pode levar 8–15 segundos</p>
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

      {prefillBanner && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs">
          <Wand2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <p className="text-foreground/80 leading-relaxed">{prefillBanner}</p>
        </div>
      )}

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
          <Label className="text-xs flex items-center">Título da faixa *{prefilled.trackTitle && <PrefilledBadge />}</Label>
          <Input
            value={trackTitle}
            onChange={e => { setTrackTitle(e.target.value); clearPrefilled("trackTitle"); }}
            maxLength={100}
            placeholder="Nome da música ou EP"
          />
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
          <Label className="text-xs flex items-center">Data-alvo de lançamento *{prefilled.date && <PrefilledBadge />}</Label>
          <Input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); clearPrefilled("date"); }}
            min={new Date().toISOString().slice(0, 10)}
          />
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
            { key: "masterStatus", label: "Master validado?", val: masterStatus, set: setMasterStatus },
            { key: "artworkStatus", label: "Artwork pronto?", val: artworkStatus, set: setArtworkStatus },
            { key: "distStatus", label: "Distribuidora?", val: distStatus, set: setDistStatus },
          ].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs flex items-center">{f.label} *{prefilled[f.key] && <PrefilledBadge />}</Label>
              <Select value={f.val} onValueChange={(v) => { f.set(v); clearPrefilled(f.key); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {projectId && (
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            A IA também vai considerar tarefas abertas, equipe e progresso do checklist deste projeto.
          </p>
        )}

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
          <Sparkles className="h-4 w-4" /> Gerar diagnóstico
        </Button>
      </Card>
    </div>
  );
}
