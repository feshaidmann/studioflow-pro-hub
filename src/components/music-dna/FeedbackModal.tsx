import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type AudioFeatures, type DiagnosisResult, type Genre,
  FEATURE_KEYS, FEATURE_LABELS, GENRE_PRESETS,
} from "@/hooks/useMusicDNA";

const GENRE_OPTIONS = Object.keys(GENRE_PRESETS) as Genre[];
const CUSTOM_GENRE_VALUE = "__custom__";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosis: DiagnosisResult;
}

function DiffIndicator({ original, corrected, label }: { original: number; corrected: number; label: string }) {
  const diff = Math.round((corrected - original) * 100);
  if (diff === 0) return null;
  const color = diff > 0 ? "text-green-600" : "text-destructive";
  return (
    <span className={`text-[10px] font-mono ${color}`}>
      {diff > 0 ? "+" : ""}{diff}%
    </span>
  );
}

export function FeedbackModal({ open, onOpenChange, diagnosis }: FeedbackModalProps) {
  const [correctedGenre, setCorrectedGenre] = useState(diagnosis.genero_classificado);
  const [customGenre, setCustomGenre] = useState("");
  const [isCustomGenre, setIsCustomGenre] = useState(false);
  const [correctedFeatures, setCorrectedFeatures] = useState<AudioFeatures>({ ...diagnosis.trackFeatures });
  const [feedbackText, setFeedbackText] = useState("");
  const [saving, setSaving] = useState(false);

  const finalGenre = isCustomGenre ? customGenre.trim() : correctedGenre;
  const genreChanged = finalGenre !== diagnosis.genero_classificado;

  const featureDiffs = useMemo(() => {
    return FEATURE_KEYS.map(key => ({
      key,
      original: diagnosis.trackFeatures[key],
      corrected: correctedFeatures[key],
      diff: Math.round((correctedFeatures[key] - diagnosis.trackFeatures[key]) * 100),
    })).filter(d => d.diff !== 0);
  }, [correctedFeatures, diagnosis.trackFeatures]);

  const hasChanges = genreChanged || featureDiffs.length > 0 || feedbackText.trim().length > 0;

  const updateFeature = (key: keyof AudioFeatures, value: number) => {
    setCorrectedFeatures(prev => ({ ...prev, [key]: value }));
  };

  const handleGenreSelect = (value: string) => {
    if (value === CUSTOM_GENRE_VALUE) {
      setIsCustomGenre(true);
      setCorrectedGenre("");
    } else {
      setIsCustomGenre(false);
      setCorrectedGenre(value);
    }
  };

  const handleSubmit = async () => {
    if (!finalGenre) {
      toast.error("Informe o gênero correto.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para enviar feedback.");
        return;
      }

      // Build differential summary
      const diffSummary = {
        genre_changed: genreChanged,
        original_genre: diagnosis.genero_classificado,
        corrected_genre: finalGenre,
        feature_diffs: featureDiffs.map(d => ({
          feature: d.key,
          original: Math.round(d.original * 100),
          corrected: Math.round(d.corrected * 100),
          delta: d.diff,
        })),
      };

      const { error } = await supabase.from("music_dna_feedback").insert({
        user_id: user.id,
        analysis_id: `${Date.now()}`,
        original_genre: diagnosis.genero_classificado,
        corrected_genre: finalGenre,
        original_features: diagnosis.trackFeatures as any,
        corrected_features: {
          ...correctedFeatures,
          _diff_summary: diffSummary,
        } as any,
        feedback_text: feedbackText.trim(),
      } as any);

      if (error) throw error;

      toast.success("Feedback enviado! Suas correções serão usadas para melhorar futuras análises.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao enviar feedback: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono uppercase tracking-wider">
            🔧 Ajustar análise
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Corrija o gênero e as features para ajudar a melhorar futuras análises.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Genre correction */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Gênero correto
            </Label>
            {!isCustomGenre ? (
              <Select value={correctedGenre} onValueChange={handleGenreSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                  {!GENRE_OPTIONS.includes(diagnosis.genero_classificado as Genre) && (
                    <SelectItem value={diagnosis.genero_classificado}>
                      {diagnosis.genero_classificado}
                    </SelectItem>
                  )}
                  <SelectItem value={CUSTOM_GENRE_VALUE}>
                    ✏️ Outro gênero…
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customGenre}
                  onChange={e => setCustomGenre(e.target.value)}
                  placeholder="Ex: Funk Carioca, Pagode, Forró Eletrônico…"
                  maxLength={60}
                  autoFocus
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => { setIsCustomGenre(false); setCorrectedGenre(diagnosis.genero_classificado); }}
                  className="text-xs shrink-0"
                >
                  Voltar
                </Button>
              </div>
            )}
            {genreChanged && (
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 line-through">
                  {diagnosis.genero_classificado}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  {finalGenre}
                </Badge>
              </div>
            )}
          </div>

          {/* Feature sliders */}
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Features acústicas
            </Label>
            {FEATURE_KEYS.map(key => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{FEATURE_LABELS[key]}</span>
                  <div className="flex items-center gap-2">
                    <DiffIndicator
                      original={diagnosis.trackFeatures[key]}
                      corrected={correctedFeatures[key]}
                      label={FEATURE_LABELS[key]}
                    />
                    <span className="text-xs font-mono text-primary">
                      {Math.round(correctedFeatures[key] * 100)}%
                    </span>
                  </div>
                </div>
                <Slider
                  min={0} max={100} step={1}
                  value={[Math.round(correctedFeatures[key] * 100)]}
                  onValueChange={([v]) => updateFeature(key, v / 100)}
                />
              </div>
            ))}
          </div>

          {/* Differential summary */}
          {(genreChanged || featureDiffs.length > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  📊 Resumo das correções
                </Label>
                <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5">
                  {genreChanged && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Gênero:</span>{" "}
                      <span className="line-through text-muted-foreground">{diagnosis.genero_classificado}</span>{" → "}
                      <span className="font-medium text-primary">{finalGenre}</span>
                    </p>
                  )}
                  {featureDiffs.map(d => (
                    <p key={d.key} className="text-xs">
                      <span className="text-muted-foreground">{FEATURE_LABELS[d.key]}:</span>{" "}
                      <span className="text-muted-foreground">{Math.round(d.original * 100)}%</span>{" → "}
                      <span className="font-medium">{Math.round(d.corrected * 100)}%</span>{" "}
                      <span className={`font-mono text-[10px] ${d.diff > 0 ? "text-green-600" : "text-destructive"}`}>
                        ({d.diff > 0 ? "+" : ""}{d.diff})
                      </span>
                    </p>
                  ))}
                  {!genreChanged && featureDiffs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhuma alteração nas métricas</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Feedback text */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Comentários (opcional)
            </Label>
            <Textarea
              placeholder="Ex: A faixa é mais próxima de MPB do que Indie Folk, tem bateria eletrônica…"
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              className="resize-none min-h-[60px]"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !hasChanges}>
            {saving ? "Enviando…" : "Enviar feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
