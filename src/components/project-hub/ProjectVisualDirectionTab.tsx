import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Palette, Sparkles, ArrowRight, Image as ImageIcon, Type, Quote } from "lucide-react";
import { toast } from "sonner";
import { useVisualBriefing } from "@/components/visual-direction/useVisualBriefing";
import type { ArtisticProfile } from "@/components/visual-direction/types";
import type { StepKey } from "@/components/visual-direction/Stepper";

const STEP_META: Record<StepKey, { idx: number; label: string }> = {
  profile: { idx: 1, label: "Perfil artístico" },
  generation: { idx: 2, label: "Geração de referências" },
  review: { idx: 3, label: "Revisão e curadoria" },
  briefing: { idx: 4, label: "Briefing pronto" },
};

interface Props {
  projectId: string;
}

function profileIsEmpty(p?: ArtisticProfile | null) {
  if (!p) return true;
  return (
    !(p.genres?.length) &&
    !(p.moods?.length) &&
    !p.artist_refs?.trim() &&
    !(p.palette?.length) &&
    !p.identity_phrase?.trim()
  );
}

export default function ProjectVisualDirectionTab({ projectId }: Props) {
  const navigate = useNavigate();
  const { briefing, step, loading, updateProfile } = useVisualBriefing(projectId);
  const [suggesting, setSuggesting] = useState(false);

  const meta = briefing ? STEP_META[step] : null;
  const progressValue = meta ? (meta.idx / 4) * 100 : 0;

  const statusBadge = useMemo(() => {
    if (!briefing) return { label: "Não iniciado", cls: "bg-muted text-muted-foreground border-border" };
    switch (step) {
      case "profile":   return { label: "Rascunho",  cls: "bg-secondary text-secondary-foreground border-border" };
      case "generation":return { label: "Em geração", cls: "bg-primary/15 text-primary border-primary/30" };
      case "review":    return { label: "Em revisão", cls: "bg-primary/15 text-primary border-primary/30" };
      case "briefing":  return { label: "Pronto",     cls: "bg-success/20 text-success border-success/30" };
    }
  }, [briefing, step]);

  const approvedCount = (briefing?.approved_images ?? briefing?.generated_images?.filter((i) => i.selected) ?? []).length;
  const palette = briefing?.generated_palette?.colors ?? briefing?.artistic_profile?.palette ?? [];
  const copy = briefing?.approved_copy ?? "";

  const showSuggestCard = !briefing || profileIsEmpty(briefing.artistic_profile);

  async function handleSuggest() {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-visual-direction", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      const suggestion = (data as { suggestion?: ArtisticProfile })?.suggestion;
      if (!suggestion) throw new Error("Resposta inválida");
      // Merge com o que já existir (não sobrescrever campos preenchidos manualmente)
      const current = briefing?.artistic_profile;
      const merged: ArtisticProfile = {
        genres: current?.genres?.length ? current.genres : suggestion.genres,
        moods:  current?.moods?.length  ? current.moods  : suggestion.moods,
        artist_refs: current?.artist_refs?.trim() ? current.artist_refs : suggestion.artist_refs,
        external_refs: current?.external_refs?.trim() ? current.external_refs : (suggestion.external_refs || ""),
        palette: current?.palette?.length ? current.palette : suggestion.palette,
        identity_phrase: current?.identity_phrase?.trim() ? current.identity_phrase : (suggestion.identity_phrase || ""),
      };
      updateProfile(merged);
      toast.success("Sugestão aplicada", { description: "Abra o módulo para revisar e gerar as referências." });
    } catch (e: any) {
      const msg: string = e?.message || "";
      if (msg.toLowerCase().includes("limite") || e?.status === 429) {
        toast.error("Limite de uso da IA atingido", { description: "Tente novamente em alguns minutos." });
      } else if (msg.toLowerCase().includes("crédito") || e?.status === 402) {
        toast.error("Créditos de IA esgotados", { description: "Adicione créditos no workspace." });
      } else {
        toast.error("Não foi possível sugerir agora", { description: msg || "Tente novamente." });
      }
    } finally {
      setSuggesting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando direção visual…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status + progresso */}
      <div className="rounded-xl border border-border bg-card/40 p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">Direção Visual</h2>
            <Badge variant="outline" className={`text-[11px] ${statusBadge.cls}`}>{statusBadge.label}</Badge>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/projects/${projectId}/direcao-visual`)}>
            <span className="hidden sm:inline">Abrir módulo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {briefing && meta ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Etapa {meta.idx} de 4 — <span className="text-foreground font-medium">{meta.label}</span></span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Você ainda não criou um briefing visual para este projeto. Use a sugestão abaixo para começar com um rascunho.
          </p>
        )}

        {/* Resumo */}
        {briefing && (
          <div className="grid sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <ImageIcon className="h-3 w-3" /> Imagens aprovadas
              </div>
              <div className="text-lg font-semibold">{approvedCount}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Type className="h-3 w-3" /> Paleta
              </div>
              {palette.length ? (
                <div className="flex items-center gap-1">
                  {palette.slice(0, 6).map((c, i) => (
                    <span
                      key={i}
                      className="h-5 w-5 rounded border border-border/60"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">—</div>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Quote className="h-3 w-3" /> Copy aprovada
              </div>
              <div className="text-xs line-clamp-2 text-foreground/80">
                {copy ? `"${copy}"` : <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card de sugestão IA */}
      {showSuggestCard && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Sugerir com IA</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Cria um rascunho de perfil artístico (gêneros, moods, referências de artistas, paleta e frase identitária)
            usando o contexto deste projeto e do seu perfil. Você revisa antes de gerar as imagens.
          </p>
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={handleSuggest} disabled={suggesting}>
              {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {suggesting ? "Sugerindo…" : "Sugerir com IA"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
