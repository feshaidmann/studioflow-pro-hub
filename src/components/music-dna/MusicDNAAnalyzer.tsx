import { useState, useRef, useCallback, useEffect } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMusicDNA,
  type TrackInput, type Genre,
  type DiagnosisResult,
} from "@/hooks/useMusicDNA";
import {
  useSavedAnalyses, cacheLastAnalysis, getCachedAnalysis, clearCachedAnalysis,
  type SavedAnalysis,
} from "@/hooks/useSavedAnalyses";
import { useMusicDnaBenchmarks, findBenchmarkForGenre } from "@/hooks/useMusicDnaBenchmarks";
import { useProjects } from "@/contexts/ProjectContext";
import { type AudioStage } from "@/lib/musicDnaStages";
import { FormView, type FormValues } from "./FormView";
import { LoadingView } from "./LoadingView";
import { ResultView } from "./ResultView";
import { SavedAnalysesList } from "./SavedAnalysesList";

// ── MAIN ─────────────────────────────────────────────────────────────────────

export function MusicDNAAnalyzer({ defaultProjectId, initialAnalysisId }: { defaultProjectId?: string; initialAnalysisId?: string } = {}) {
  const { progress, logs, result, isPending, error, analyze, reset } = useMusicDNA();
  const [lastInput, setLastInput] = useState<{ name: string; notes?: string; references: string[]; projectId?: string; stage?: AudioStage; genre?: Genre } | null>(null);
  const [viewingDiagnosis, setViewingDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { savedAnalyses, saveAnalysis, saveAnalysisAsync, isSaving } = useSavedAnalyses();
  const savingPromiseRef = useRef<Promise<string | undefined> | null>(null);
  const { data: benchmarks } = useMusicDnaBenchmarks();
  const { projects } = useProjects();

  // Load a saved analysis directly when opened via ?analysis=<id>
  const loadedInitialRef = useRef(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | undefined>(undefined);
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  useEffect(() => {
    if (!initialAnalysisId || loadedInitialRef.current || savedAnalyses.length === 0) return;
    const found = savedAnalyses.find((a) => a.id === initialAnalysisId);
    if (!found) return;
    const meta = found.input_metadata as { name: string; notes?: string; references: string[]; projectId?: string; stage?: AudioStage };
    const stageVal: AudioStage = (meta.stage ?? (found.stage as AudioStage | undefined) ?? "master");
    const input = { ...meta, projectId: meta.projectId ?? found.project_id ?? undefined, stage: stageVal };
    setLastInput(input);
    setViewingDiagnosis(found.diagnosis);
    setIsSaved(true);
    setSavedAnalysisId(found.id);
    setRestoredFromCache(false);
    loadedInitialRef.current = true;
  }, [initialAnalysisId, savedAnalyses]);

  // Restore cached analysis on mount (skip if opening a specific analysis by ID)
  useEffect(() => {
    if (initialAnalysisId) return;
    if (!result && !isPending) {
      const cached = getCachedAnalysis();
      if (cached) {
        setLastInput(cached.input);
        setViewingDiagnosis(cached.diagnosis);
        setRestoredFromCache(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache result when a new analysis completes
  useEffect(() => {
    if (result && lastInput) {
      cacheLastAnalysis(lastInput, result);
      setViewingDiagnosis(result);
      setIsSaved(false);
      setRestoredFromCache(false);
    }
  }, [result, lastInput]);

  const handleSubmit = (values: FormValues, file: File) => {
    const input: TrackInput = {
      name: values.name,
      file,
      references: values.references,
      stage: values.stage,
      genre: values.genre,
    };
    setLastInput({
      name: input.name,
      references: input.references,
      projectId: values.projectId || undefined,
      stage: values.stage,
      genre: values.genre,
    });
    setViewingDiagnosis(null);
    setRestoredFromCache(false);
    analyze(input);
  };

  const handleReset = () => {
    clearCachedAnalysis();
    setViewingDiagnosis(null);
    setLastInput(null);
    setIsSaved(false);
    setSavedAnalysisId(undefined);
    setRestoredFromCache(false);
    reset();
  };

  const handleSave = () => {
    if (lastInput && (viewingDiagnosis || result)) {
      saveAnalysis(
        { input: lastInput, diagnosis: (viewingDiagnosis || result)! },
        {
          onSuccess: ({ id }) => {
            setIsSaved(true);
            setSavedAnalysisId(id);
          },
        }
      );
    }
  };

  const ensureSaved = useCallback(async (): Promise<string | undefined> => {
    if (savedAnalysisId) return savedAnalysisId;
    if (savingPromiseRef.current) return savingPromiseRef.current;
    const diag = viewingDiagnosis || result;
    if (!lastInput || !diag) return undefined;
    const p = saveAnalysisAsync({ input: lastInput, diagnosis: diag, silent: true })
      .then(({ id }) => {
        setIsSaved(true);
        setSavedAnalysisId(id);
        return id;
      })
      .catch(() => undefined)
      .finally(() => { savingPromiseRef.current = null; });
    savingPromiseRef.current = p;
    return p;
  }, [savedAnalysisId, viewingDiagnosis, result, lastInput, saveAnalysisAsync]);

  const handleLoadSaved = (saved: SavedAnalysis) => {
    const meta = saved.input_metadata as { name: string; notes?: string; references: string[]; projectId?: string; stage?: AudioStage };
    const stageFromSaved: AudioStage = (meta.stage ?? (saved.stage as AudioStage | undefined) ?? "master");
    const input = { ...meta, projectId: meta.projectId ?? saved.project_id ?? undefined, stage: stageFromSaved };
    setLastInput(input);
    setViewingDiagnosis(saved.diagnosis);
    setIsSaved(true);
    setSavedAnalysisId(saved.id);
    setRestoredFromCache(false);
    cacheLastAnalysis(input, saved.diagnosis);
  };

  const activeDiagnosis = viewingDiagnosis || result;
  const activeBenchmark = findBenchmarkForGenre(benchmarks, lastInput?.genre);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="mb-4 flex gap-2 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <span className="font-bold shrink-0">⚠</span>
          <span>
            {error.message}{" "}
            <button className="underline hover:no-underline" onClick={handleReset}>
              Tentar novamente
            </button>
          </span>
        </div>
      )}

      {!activeDiagnosis && !isPending && (
        <div className="mb-5 animate-slide-up">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Faça upload da sua demo para receber um diagnóstico técnico avançado com análise espectral,
            detecção de BPM e tom, segmentação por seções e sugestões de produção.
          </p>
        </div>
      )}

      {activeDiagnosis && lastInput ? (
        <>
          {restoredFromCache && (
            <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border animate-fade-in">
              <p className="text-xs text-muted-foreground">
                <History className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                Você está vendo a última análise restaurada da sessão.
              </p>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0" onClick={handleReset}>
                ↻ Nova análise
              </Button>
            </div>
          )}
          <ResultView
            input={lastInput}
            diagnosis={activeDiagnosis}
            benchmark={activeBenchmark}
            onReset={handleReset}
            onSave={handleSave}
            isSaved={isSaved}
            isSaving={isSaving}
            savedAnalysisId={savedAnalysisId}
            onEnsureSaved={ensureSaved}
            projects={projects}
          />
        </>
      ) : isPending ? (
        <LoadingView
          trackName={lastInput?.name ?? ""}
          logs={logs}
          progress={progress}
          stage={lastInput?.stage as AudioStage | undefined}
        />
      ) : (
        <>
          <div className="mb-6">
            <SavedAnalysesList onLoad={handleLoadSaved} />
          </div>
          <FormView onSubmit={handleSubmit} isPending={isPending} projects={projects} defaultProjectId={defaultProjectId} />
        </>
      )}
    </div>
  );
}

export default MusicDNAAnalyzer;
