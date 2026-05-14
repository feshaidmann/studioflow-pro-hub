import { useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Palette, Loader2 } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import Stepper, { StepKey } from "@/components/visual-direction/Stepper";
import ArtisticProfileStep from "@/components/visual-direction/ArtisticProfileStep";
import GenerationStep from "@/components/visual-direction/GenerationStep";
import ReviewStep from "@/components/visual-direction/ReviewStep";
import BriefingStep from "@/components/visual-direction/BriefingStep";
import SaveStatus from "@/components/visual-direction/SaveStatus";
import { useVisualBriefing } from "@/components/visual-direction/useVisualBriefing";

const VALID_STEPS: StepKey[] = ["profile", "generation", "review", "briefing"];

export default function VisualDirection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === id);

  const {
    briefing, step, loading, generating, status, lastSavedAt,
    setStep, updateProfile, updateReview, toggleImage, generate,
    saveAndAdvance, retryFlush,
  } = useVisualBriefing(id);

  // Restore step from ?step= once briefing is loaded (guards against invalid jumps)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (loading || restoredRef.current) return;
    restoredRef.current = true;
    const urlStep = searchParams.get("step") as StepKey | null;
    if (!urlStep || !VALID_STEPS.includes(urlStep) || urlStep === step) return;
    // Guard: don't jump to steps the user can't be on yet
    const hasImages = (briefing?.generated_images ?? []).length > 0;
    const hasSelection = (briefing?.generated_images ?? []).some((i) => i.selected);
    if (urlStep === "generation" && !hasImages) return;
    if (urlStep === "review" && !hasSelection) return;
    if (urlStep === "briefing" && !briefing?.approved_copy) return;
    setStep(urlStep);
  }, [loading, briefing, searchParams, step, setStep]);

  // Keep URL in sync with current step (replace, not push, to avoid history spam)
  useEffect(() => {
    if (loading) return;
    if (searchParams.get("step") === step) return;
    const next = new URLSearchParams(searchParams);
    next.set("step", step);
    setSearchParams(next, { replace: true });
  }, [step, loading, searchParams, setSearchParams]);

  const handleSaveReview = async (data: { approved_copy: string; designer_notes: string }) => {
    if (!briefing) return;
    try {
      const approvedImages = (briefing.generated_images ?? []).filter((i) => i.selected);
      await saveAndAdvance("briefing", {
        approved_copy: data.approved_copy,
        designer_notes: data.designer_notes,
        approved_images: approvedImages,
      });
    } catch (e: any) {
      toast.error("Não foi possível salvar", { description: e?.message });
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Stepper current={step} />
        <SaveStatus status={status} lastSavedAt={lastSavedAt} onRetry={() => void retryFlush()} />
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : step === "profile" ? (
          <ArtisticProfileStep
            initial={briefing?.artistic_profile}
            loading={generating}
            onChange={updateProfile}
            onSubmit={(p) => void generate(p, !!briefing?.id && (briefing.generated_images ?? []).length > 0)}
          />
        ) : step === "generation" && briefing ? (
          <GenerationStep
            briefing={briefing}
            onToggleImage={toggleImage}
            onRegenerate={() => void generate(briefing.artistic_profile, true)}
            onNext={() => setStep("review")}
            regenerating={generating}
          />
        ) : step === "review" && briefing ? (
          <ReviewStep
            briefing={briefing}
            onRemoveImage={toggleImage}
            onChange={updateReview}
            onSave={handleSaveReview}
            onBack={() => setStep("generation")}
            saving={status === "saving"}
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
