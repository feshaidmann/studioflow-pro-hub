import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Palette, Loader2 } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Stepper, { StepKey } from "@/components/visual-direction/Stepper";
import ArtisticProfileStep from "@/components/visual-direction/ArtisticProfileStep";
import GenerationStep from "@/components/visual-direction/GenerationStep";
import ReviewStep from "@/components/visual-direction/ReviewStep";
import BriefingStep from "@/components/visual-direction/BriefingStep";
import { ArtisticProfile, GeneratedImage, VisualBriefing } from "@/components/visual-direction/types";

export default function VisualDirection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === id);

  const [step, setStep] = useState<StepKey>("profile");
  const [briefing, setBriefing] = useState<VisualBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load latest briefing for this project
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("visual_briefings")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
      } else if (data) {
        const b = data as unknown as VisualBriefing;
        setBriefing(b);
        if (b.approved_copy) setStep("briefing");
        else if ((b.generated_images ?? []).some((i) => i.selected)) setStep("review");
        else if ((b.generated_images ?? []).length > 0) setStep("generation");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleGenerate = async (profile: ArtisticProfile, regen = false) => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-visual-direction", {
        body: { project_id: id, briefing_id: regen ? briefing?.id : undefined, artistic_profile: profile },
      });
      if (error) throw error;
      const next = (data as { briefing: VisualBriefing })?.briefing;
      if (!next) throw new Error("Resposta inválida");
      setBriefing(next);
      setStep("generation");
      toast.success(regen ? "Novas referências geradas" : "Referências de estilo geradas");
    } catch (e: any) {
      toast.error("Falha ao gerar", { description: e?.message });
    } finally {
      setGenerating(false);
    }
  };

  const updateBriefing = async (patch: Partial<VisualBriefing>) => {
    if (!briefing) return;
    const { data, error } = await supabase
      .from("visual_briefings")
      .update(patch as never)
      .eq("id", briefing.id)
      .select()
      .single();
    if (error) throw error;
    setBriefing(data as unknown as VisualBriefing);
  };

  const toggleImage = (imgId: string) => {
    if (!briefing) return;
    const next = (briefing.generated_images ?? []).map((i) =>
      i.id === imgId ? { ...i, selected: !i.selected } : i
    );
    setBriefing({ ...briefing, generated_images: next });
    void updateBriefing({ generated_images: next as unknown as GeneratedImage[] }).catch(() => {});
  };

  const removeFromReview = (imgId: string) => toggleImage(imgId);

  const handleSaveReview = async (data: { approved_copy: string; designer_notes: string }) => {
    if (!briefing) return;
    setSaving(true);
    try {
      const approvedImages = (briefing.generated_images ?? []).filter((i) => i.selected);
      await updateBriefing({
        approved_copy: data.approved_copy,
        designer_notes: data.designer_notes,
        approved_images: approvedImages,
      });
      setStep("briefing");
    } catch (e: any) {
      toast.error("Não foi possível salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <Palette className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Voltar para projetos
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0 h-8 w-8" onClick={() => navigate(`/projects/${id}`)} aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
            Direção Visual
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {project.artist} · {project.name}
          </p>
        </div>
      </div>

      <Stepper current={step} />

      <div className="rounded-xl border border-border bg-card/40 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : step === "profile" ? (
          <ArtisticProfileStep
            initial={briefing?.artistic_profile}
            loading={generating}
            onSubmit={(p) => handleGenerate(p, !!briefing)}
          />
        ) : step === "generation" && briefing ? (
          <GenerationStep
            briefing={briefing}
            onToggleImage={toggleImage}
            onRegenerate={() => handleGenerate(briefing.artistic_profile, true)}
            onNext={() => setStep("review")}
            regenerating={generating}
          />
        ) : step === "review" && briefing ? (
          <ReviewStep
            briefing={briefing}
            onRemoveImage={removeFromReview}
            onSave={handleSaveReview}
            onBack={() => setStep("generation")}
            saving={saving}
          />
        ) : step === "briefing" && briefing ? (
          <BriefingStep briefing={briefing} onBack={() => setStep("review")} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Estado inválido.</p>
        )}
      </div>

      {step === "profile" && (
        <p className="text-xs text-muted-foreground text-center">
          As referências geradas são <strong>rascunhos de estilo</strong> — não são arte final. Use-as para alinhar a direção com seu designer.
        </p>
      )}
    </div>
  );
}
