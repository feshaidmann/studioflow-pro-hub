import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioWaveform } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileAudio, Lightbulb, CheckCircle2, AlertCircle, AlertTriangle, Info, Trophy, X } from "lucide-react";
import { analyzeAudio, generateSuggestions, type AnalysisResult } from "@/lib/audioAnalysis";
import type { Project } from "@/data/mockData";

function RadialGauge({ label, value, target, unit, min, max, reverse, advisory }: {
  label: string; value: number; target: number; unit: string; min: number; max: number; reverse?: boolean; advisory?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isGood = reverse ? value <= target : value >= target;
  const isWarn = reverse
    ? value > target && value <= target + 2
    : value < target && value >= target - 2;

  // advisory metrics never show as destructive — out-of-range becomes warning (orange)
  const tone: "good" | "warn" | "bad" = isGood ? "good" : isWarn ? "warn" : advisory ? "warn" : "bad";

  const color = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : "text-destructive";
  const strokeColor = tone === "good" ? "stroke-success" : tone === "warn" ? "stroke-warning" : "stroke-destructive";
  const dotColor = tone === "good" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-destructive";

  const radius = 54;
  const circumference = Math.PI * radius;
  const fillLength = (pct / 100) * circumference;
  const needleAngle = -90 + (pct / 100) * 180;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="relative w-20 h-12 sm:w-24 sm:h-14">
        <svg viewBox="0 0 120 70" className="w-full h-full">
          <path d="M 6 64 A 54 54 0 0 1 114 64" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
          <path d="M 6 64 A 54 54 0 0 1 114 64" fill="none" className={strokeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${fillLength} ${circumference}`} style={{ transition: "stroke-dasharray 0.7s ease-out" }} />
          <line x1="60" y1="64" x2="60" y2="18" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" transform={`rotate(${needleAngle}, 60, 64)`} style={{ transition: "transform 0.7s ease-out" }} />
          <circle cx="60" cy="64" r="4" fill="hsl(var(--foreground))" />
        </svg>
      </div>
      <div className="flex items-center gap-1">
        <div className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-pulse`} />
        <span className={`text-base font-bold font-mono-nums ${color}`}>{value.toFixed(1)} {unit}</span>
      </div>
      <p className="text-[10px] text-muted-foreground">Target: {target} {unit}</p>
    </div>
  );
}

interface MasterAnalyzerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onConfirmUpload: () => void;
  onCancelWithTask: () => void;
}

export default function MasterAnalyzerModal({
  open,
  onOpenChange,
  project,
  onConfirmUpload,
  onCancelWithTask,
}: MasterAnalyzerModalProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setAnalyzing(false);
    setProgress(0);
    setResult(null);
    setSuggestions([]);
    setError(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); setSuggestions([]); setError(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setSuggestions([]); setError(null); }
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(10);
    setError(null);
    try {
      setProgress(30);
      const analysisResult = await analyzeAudio(file);
      setProgress(90);
      setResult(analysisResult);
      setSuggestions(generateSuggestions(analysisResult));
      setProgress(100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível decodificar o arquivo. Verifique se é um WAV, MP3 ou FLAC válido.";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Dynamic é apenas advisory — não bloqueia o envio
  const isSpotifyReady = result
    ? result.lufs <= -14 && result.truePeak <= -1
    : null; // null = not yet analyzed
  const dynamicWarn = result ? result.dynamicRange < 7 : false;

  const handleConfirmWithoutAnalysis = () => {
    reset();
    onConfirmUpload();
  };

  const handleConfirmOk = () => {
    reset();
    onConfirmUpload();
  };

  const handleCancelAndCreateTask = () => {
    reset();
    onCancelWithTask();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            Master Analyzer — {project.name}
            {isSpotifyReady === true && !dynamicWarn && (
              <Badge className="bg-success/20 text-success border-success/40 gap-1 text-xs animate-confetti-pop ml-auto">
                <CheckCircle2 className="h-3 w-3" /> Pronto para Streaming
              </Badge>
            )}
            {isSpotifyReady === true && dynamicWarn && (
              <Badge className="bg-warning/20 text-warning border-warning/40 gap-1 text-xs ml-auto">
                <AlertTriangle className="h-3 w-3" /> Pronto com alerta
              </Badge>
            )}
            {isSpotifyReady === false && (
              <Badge className="bg-destructive/20 text-destructive border-destructive/40 gap-1 text-xs ml-auto">
                <AlertTriangle className="h-3 w-3" /> Ajustes necessários
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload Zone */}
          <div
            className={`border-dashed border-2 rounded-lg transition-all cursor-pointer ${
              file
                ? "border-primary/60 bg-primary/5 shadow-[0_0_16px_hsl(263_70%_50%/0.15)]"
                : "border-primary/30 hover:border-primary/50"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input type="file" accept=".wav,.mp3,.flac" className="hidden" id="modal-audio-upload" onChange={handleFileSelect} />
            <label htmlFor="modal-audio-upload" className="flex flex-col items-center justify-center py-8 cursor-pointer">
              {file ? (
                <>
                  <FileAudio className="h-10 w-10 text-primary mb-2" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Clique ou arraste para substituir</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Arraste WAV/MP3/FLAC aqui</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ou clique para buscar</p>
                </>
              )}
            </label>
          </div>

          {/* Progress */}
          {analyzing && (
            <div className="space-y-1.5 animate-fade-in">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">Analisando áudio…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Analyze button */}
          <Button
            onClick={analyze}
            disabled={!file || analyzing}
            className="neon-glow active:scale-95 transition-transform w-full"
          >
            {analyzing ? "Analisando…" : "Analisar Master"}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-3 animate-scale-in">
              {/* Gauges */}
              <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Resultados da Análise</p>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Medição aproximada
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <RadialGauge label="LUFS" value={result.lufs} target={-14} unit="LUFS" min={-24} max={0} reverse />
                  <RadialGauge label="True Peak" value={result.truePeak} target={-1} unit="dBTP" min={-6} max={1} reverse />
                  <RadialGauge label="Dynamic" value={result.dynamicRange} target={7} unit="LU" min={0} max={15} advisory />
                </div>
              </div>

              {/* Suggestions (if not ready or dynamic advisory) */}
              {(!isSpotifyReady || dynamicWarn) && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-warning" />
                    Sugestões de Correção
                  </p>
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 rounded bg-secondary/40 p-2">
                      <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">{i + 1}</Badge>
                      <p className="text-xs">{s}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Status banner */}
              {isSpotifyReady && !dynamicWarn && (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 p-3">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  <p className="text-sm font-medium text-success">
                    Master dentro dos padrões de streaming! Pronto para envio.
                  </p>
                </div>
              )}
              {isSpotifyReady && dynamicWarn && (
                <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  <p className="text-sm font-medium text-warning">
                    Master aprovado para envio. Atenção: dinâmica abaixo do ideal ({result.dynamicRange.toFixed(1)} LU) — considere reduzir compressão em futuras versões.
                  </p>
                </div>
              )}
              {isSpotifyReady === false && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm font-medium text-destructive">
                    Master precisa de ajustes antes do envio.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          {/* Not yet analyzed */}
          {isSpotifyReady === null && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button variant="secondary" className="flex-1" onClick={handleConfirmWithoutAnalysis}>
                <Trophy className="h-4 w-4 mr-1" />
                Continuar sem analisar
              </Button>
            </div>
          )}

          {/* Analysis done — metrics OK */}
          {isSpotifyReady === true && (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                  Voltar
                </Button>
                <Button className="flex-1 neon-glow active:scale-95 transition-transform gap-2" onClick={handleConfirmOk}>
                  <Trophy className="h-4 w-4" />
                  Confirmar Upload
                </Button>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                    navigate(`/music-dna`);
                  }}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Ver no DNA Musical
                </Button>
              </div>
            </>
          )}

          {/* Analysis done — metrics FAIL */}
          {isSpotifyReady === false && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleCancelAndCreateTask}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar envio e criar tarefa
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleConfirmOk}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Continuar mesmo assim
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
