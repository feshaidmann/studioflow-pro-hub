import { useRef, useState } from "react";
import {
  Music, Upload, Loader2, CheckCircle2, AlertCircle,
  FlaskConical, Zap, Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeAudioFull } from "@/lib/audioAnalysis";
import type { RealAudioAnalysis } from "@/lib/audioAnalysis";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { type Genre } from "@/hooks/useMusicDNA";

const GENRES: Genre[] = [
  "Indie Folk", "Pop Brasileiro", "Sertanejo Raiz", "Sertanejo Universitário",
  "MPB Contemporânea", "Samba", "Pagode", "Funk Carioca", "Forró / Piseiro",
  "Indie BR", "Rock Alternativo BR", "Rap BR", "R&B / Soul", "Reggae BR",
  "Axé / Pop Bahia", "Eletrônica / House", "Pop Internacional", "Lo-Fi Hip Hop",
  "Trap BR", "Bossa Nova", "Rock Alternativo",
];

interface SelfMatchResult {
  similarity_score: number;
  band: string;
  filename: string;
}

// Splits "Am" → {key_name: "A", mode: "minor"}, "F#" → {key_name: "F#", mode: "major"}
function parseKey(key: string): { key_name: string | null; mode: string } {
  if (!key) return { key_name: null, mode: "major" };
  const isMinor = key.endsWith("m");
  const name = isMinor ? key.slice(0, -1) : key;
  return { key_name: name || null, mode: isMinor ? "minor" : "major" };
}

export function ReferenceTrackIngestor({ onInserted }: { onInserted?: () => void }) {
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [band, setBand] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [genre, setGenre] = useState<Genre | "">("");
  const [sourceBatch, setSourceBatch] = useState("audio-ingest");

  const [phase, setPhase] = useState<"idle" | "analyzing" | "analyzed" | "inserting" | "matching" | "done" | "error">("idle");
  const [analysis, setAnalysis] = useState<RealAudioAnalysis | null>(null);
  const [selfMatch, setSelfMatch] = useState<SelfMatchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (f: File) => {
    setAudioFile(f);
    if (!trackTitle) setTrackTitle(f.name.replace(/\.[^.]+$/, ""));
    setPhase("idle");
    setAnalysis(null);
    setSelfMatch(null);
    setErrorMsg("");
  };

  const handleAnalyze = async () => {
    if (!audioFile) return;
    setPhase("analyzing");
    setErrorMsg("");
    try {
      const { real } = await analyzeAudioFull(audioFile);
      setAnalysis(real);
      setPhase("analyzed");
    } catch (e) {
      setErrorMsg((e as Error).message ?? String(e));
      setPhase("error");
    }
  };

  const handleInsertAndMatch = async () => {
    if (!analysis || !band.trim() || !trackTitle.trim() || !genre) return;
    setPhase("inserting");
    setErrorMsg("");

    const { key_name, mode } = parseKey(analysis.key ?? "");

    const row: TablesInsert<"music_reference_tracks"> = {
      band: band.trim(),
      filename: trackTitle.trim(),
      genre: genre,
      source_batch: sourceBatch.trim() || "audio-ingest",
      // beat_times tem DEFAULT '[]'::jsonb no banco — omitido de propósito
      duration_sec: analysis.duration_sec ?? null,
      tempo_bpm: analysis.bpm ?? null,
      key_name,
      mode,
      lufs_integrated: analysis.lufs_integrated ?? null,
      dynamic_range_db: analysis.dynamic_range_lu ?? null,
      spectral_centroid: analysis.spectral_centroid_hz ?? null,
      spectral_rolloff: analysis.spectral_rolloff_hz ?? null,
      spectral_flatness: analysis.spectral_flatness ?? null,
      spectral_bandwidth: analysis.spectral_bandwidth_hz ?? null,
      zero_crossing_rate: analysis.zero_crossing_rate ?? null,
      energy: analysis.energy ?? null,
      danceability: analysis.danceability ?? null,
      valence: analysis.valence ?? null,
      acousticness: analysis.acousticness ?? null,
      instrumentalness: analysis.instrumentalness ?? null,
      liveness: analysis.liveness ?? null,
      speechiness: analysis.speechiness ?? null,
      mfcc: analysis.mfcc?.length ? analysis.mfcc : null,
      chroma_cens: analysis.chroma_cens?.length ? analysis.chroma_cens : null,
      quarantined: false,
    };

    // upsert por (band, filename): re-analisar a mesma faixa atualiza ao invés de
    // falhar na constraint UNIQUE music_reference_tracks_band_filename_unique
    const { error: insertErr } = await supabase
      .from("music_reference_tracks")
      .upsert(row, { onConflict: "band,filename" });

    if (insertErr) {
      setErrorMsg(insertErr.message);
      setPhase("error");
      return;
    }

    toast.success("Faixa inserida no catálogo de referência.");

    // Self-match precision test
    setPhase("matching");
    try {
      const { data: neighbors, error: rpcErr } = await supabase.rpc(
        "find_nearest_reference_tracks",
        {
          p_mfcc: analysis.mfcc ?? null,
          p_chroma_cens: analysis.chroma_cens ?? null,
          p_tempo_bpm: analysis.bpm ?? null,
          p_lufs_integrated: analysis.lufs_integrated ?? null,
          p_dynamic_range_db: analysis.dynamic_range_lu ?? null,
          p_spectral_centroid: analysis.spectral_centroid_hz ?? null,
          p_spectral_rolloff: analysis.spectral_rolloff_hz ?? null,
          p_spectral_flatness: analysis.spectral_flatness ?? null,
          p_spectral_bandwidth: analysis.spectral_bandwidth_hz ?? null,
          p_zero_crossing_rate: analysis.zero_crossing_rate ?? null,
          p_energy: analysis.energy ?? null,
          p_danceability: analysis.danceability ?? null,
          p_valence: analysis.valence ?? null,
          p_acousticness: analysis.acousticness ?? null,
          p_instrumentalness: analysis.instrumentalness ?? null,
          p_liveness: analysis.liveness ?? null,
          p_speechiness: analysis.speechiness ?? null,
          p_key_name: key_name ?? null,
          p_mode: mode,
          p_genre: null,       // broad search, without genre filter
          p_strict_genre: false,
          p_limit: 1,
        }
      );
      if (rpcErr) throw rpcErr;
      const top = neighbors?.[0] ?? null;
      if (top) {
        setSelfMatch({
          similarity_score: Number(top.similarity_score),
          band: top.band,
          filename: top.filename,
        });
      }
    } catch (e) {
      // Self-match is non-critical; show warning but keep "done"
      toast.warning("Não foi possível calcular self-match: " + (e as Error).message);
    }
    setPhase("done");
    onInserted?.();
  };

  const reset = () => {
    setAudioFile(null);
    setBand("");
    setTrackTitle("");
    setGenre("");
    setSourceBatch("audio-ingest");
    setPhase("idle");
    setAnalysis(null);
    setSelfMatch(null);
    setErrorMsg("");
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const precisionColor = (s: number) =>
    s >= 0.95 ? "text-green-600" : s >= 0.70 ? "text-yellow-600" : "text-red-600";
  const precisionLabel = (s: number) =>
    s >= 0.95 ? "Excelente" : s >= 0.80 ? "Boa" : s >= 0.70 ? "Aceitável" : "Abaixo do limiar";

  const currentPhase: string = phase;
  const canAnalyze = !!audioFile && currentPhase === "idle";
  const canInsert = currentPhase === "analyzed" && !!band.trim() && !!trackTitle.trim() && !!genre;

  return (
    <div className="space-y-6">
      {/* File picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> 1. Carregar áudio
          </CardTitle>
          <CardDescription>
            MP3, WAV, FLAC, AAC, M4A, OGG ou AIFF. A análise roda inteiramente no navegador — o arquivo
            não é enviado ao servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => audioInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileChange(f);
            }}
          >
            <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">{audioFile ? audioFile.name : "Clique ou arraste um arquivo de áudio"}</p>
            {audioFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {(audioFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4,audio/ogg,audio/aiff,audio/x-aiff,.mp3,.wav,.flac,.aac,.m4a,.ogg,.aiff,.aif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
          </div>

          {/* Metadata */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rt-band">Artista / Banda *</Label>
              <Input id="rt-band" value={band} onChange={(e) => setBand(e.target.value)} placeholder="Ex: A-ha" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-title">Título da faixa *</Label>
              <Input id="rt-title" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder="Ex: Hunting High And Low" />
            </div>
            <div className="space-y-1.5">
              <Label>Gênero *</Label>
              <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
                <SelectTrigger><SelectValue placeholder="Selecionar gênero" /></SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-batch">Lote / fonte</Label>
              <Input id="rt-batch" value={sourceBatch} onChange={(e) => setSourceBatch(e.target.value)} placeholder="audio-ingest" />
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={!canAnalyze || currentPhase === "analyzing"}>
            {currentPhase === "analyzing"
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analisando…</>
              : <><FlaskConical className="h-4 w-4 mr-2" />Analisar áudio</>}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis result */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> 2. Features extraídas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
              {[
                ["BPM", analysis.bpm?.toFixed(1)],
                ["Tom", analysis.key],
                ["LUFS", analysis.lufs_integrated?.toFixed(1) + " LUFS"],
                ["DR", analysis.dynamic_range_lu?.toFixed(1) + " LU"],
                ["Centroide", analysis.spectral_centroid_hz?.toFixed(0) + " Hz"],
                ["Rolloff", analysis.spectral_rolloff_hz?.toFixed(0) + " Hz"],
                ["Flatness", analysis.spectral_flatness?.toFixed(4)],
                ["Bandwidth", analysis.spectral_bandwidth_hz?.toFixed(0) + " Hz"],
                ["ZCR", analysis.zero_crossing_rate?.toFixed(4)],
                ["Energia", analysis.energy?.toFixed(2)],
                ["Dança", analysis.danceability?.toFixed(2)],
                ["Valência", analysis.valence?.toFixed(2)],
                ["Acústico", analysis.acousticness?.toFixed(2)],
                ["Instrumental", analysis.instrumentalness?.toFixed(2)],
                ["Duração", analysis.duration_sec?.toFixed(1) + " s"],
              ].map(([label, val]) => (
                <div key={label} className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-mono font-medium">{val ?? "—"}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              MFCC: {analysis.mfcc?.length ?? 0} coeficientes &nbsp;·&nbsp;
              Chroma CENS: {analysis.chroma_cens?.length ?? 0} classes
            </div>

            <Button onClick={handleInsertAndMatch} disabled={!canInsert || phase === "inserting" || phase === "matching"}>
              {phase === "inserting"
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Inserindo…</>
                : phase === "matching"
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Testando precisão…</>
                : "Inserir como referência + calibrar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Self-match precision result */}
      {phase === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> 3. Calibração — self-match test
            </CardTitle>
            <CardDescription>
              A faixa recém-inserida foi usada como query contra o próprio catálogo. Uma similaridade
              próxima de 1.0 indica que o motor de matching consegue recuperar a faixa com alta
              precisão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selfMatch ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-4xl font-bold font-mono ${precisionColor(selfMatch.similarity_score)}`}>
                    {(selfMatch.similarity_score * 100).toFixed(1)}%
                  </span>
                  <Badge
                    variant={selfMatch.similarity_score >= 0.70 ? "default" : "destructive"}
                    className={selfMatch.similarity_score >= 0.95 ? "bg-green-600" : selfMatch.similarity_score >= 0.70 ? "bg-yellow-600" : ""}
                  >
                    {precisionLabel(selfMatch.similarity_score)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Faixa recuperada: <strong>{selfMatch.band}</strong> — {selfMatch.filename}
                </p>
                {selfMatch.similarity_score < 0.70 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Abaixo do limiar mínimo (70%)</AlertTitle>
                    <AlertDescription>
                      O motor não consegue recuperar esta faixa com confiança suficiente. Verifique se
                      o áudio está íntegro e se os vetores MFCC/Chroma foram extraídos corretamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Self-match não disponível.</p>
            )}

            <Button variant="outline" onClick={reset}>Inserir outra faixa</Button>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {phase === "error" && errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
