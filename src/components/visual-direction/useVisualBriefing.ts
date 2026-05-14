import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArtisticProfile, GeneratedImage, VisualBriefing } from "./types";
import { StepKey } from "./Stepper";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const PROFILE_DEBOUNCE_MS = 400;
const REVIEW_DEBOUNCE_MS = 600;
const STEP_DEBOUNCE_MS = 200;

type Patch = Partial<{
  artistic_profile: ArtisticProfile;
  generated_images: GeneratedImage[];
  approved_images: GeneratedImage[];
  approved_copy: string;
  designer_notes: string;
  current_step: StepKey;
  generated_palette: import("./types").PaletteResult;
  copy_options: import("./types").CopyOption[];
}>;

export type ReviewPatch = {
  approved_copy?: string;
  designer_notes?: string;
  generated_palette?: import("./types").PaletteResult;
  copy_options?: import("./types").CopyOption[];
};

interface UseVisualBriefingResult {
  briefing: VisualBriefing | null;
  step: StepKey;
  loading: boolean;
  generating: boolean;
  status: SaveStatus;
  lastSavedAt: string | null;
  setStep: (s: StepKey) => void;
  updateProfile: (profile: ArtisticProfile) => void;
  updateReview: (data: ReviewPatch) => void;
  toggleImage: (imgId: string) => void;
  generate: (profile: ArtisticProfile, regen?: boolean) => Promise<void>;
  saveAndAdvance: (next: StepKey, extra?: Patch) => Promise<void>;
  retryFlush: () => Promise<void>;
}

function deriveStepFromBriefing(b: VisualBriefing | null): StepKey {
  if (!b) return "profile";
  const stored = (b as unknown as { current_step?: string }).current_step;
  if (stored && ["profile", "generation", "review", "briefing"].includes(stored)) {
    const s = stored as StepKey;
    // Defensive: if review but nothing selected, fall back
    if (s === "review" && !(b.generated_images ?? []).some((i) => i.selected)) {
      return (b.generated_images ?? []).length > 0 ? "generation" : "profile";
    }
    return s;
  }
  if (b.approved_copy) return "briefing";
  if ((b.generated_images ?? []).some((i) => i.selected)) return "review";
  if ((b.generated_images ?? []).length > 0) return "generation";
  return "profile";
}

export function useVisualBriefing(projectId: string | undefined): UseVisualBriefingResult {
  const [briefing, setBriefing] = useState<VisualBriefing | null>(null);
  const [step, setStepState] = useState<StepKey>("profile");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Pending patch buffer + debounce timer
  const pendingRef = useRef<Patch>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const briefingRef = useRef<VisualBriefing | null>(null);

  useEffect(() => {
    briefingRef.current = briefing;
  }, [briefing]);

  // Load latest briefing
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("visual_briefings")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
      } else if (data) {
        const b = data as unknown as VisualBriefing;
        setBriefing(b);
        setStepState(deriveStepFromBriefing(b));
        setLastSavedAt(b.updated_at ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const persist = useCallback(async (patch: Patch): Promise<void> => {
    const current = briefingRef.current;
    const seq = ++requestSeqRef.current;
    setStatus("saving");
    try {
      if (current?.id) {
        const { data, error } = await supabase
          .from("visual_briefings")
          .update(patch as never)
          .eq("id", current.id)
          .select()
          .single();
        if (error) throw error;
        if (seq === requestSeqRef.current) {
          const next = data as unknown as VisualBriefing;
          setBriefing(next);
          setLastSavedAt(next.updated_at ?? new Date().toISOString());
          setStatus("saved");
        }
      } else {
        // Need projectId + auth user to insert
        if (!projectId) return;
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) throw new Error("Não autenticado");
        const insertRow = {
          project_id: projectId,
          user_id: uid,
          artistic_profile: patch.artistic_profile ?? {},
          current_step: patch.current_step ?? "profile",
          designer_notes: patch.designer_notes ?? "",
          approved_copy: patch.approved_copy ?? "",
        } as never;
        const { data, error } = await supabase
          .from("visual_briefings")
          .insert(insertRow)
          .select()
          .single();
        if (error) throw error;
        if (seq === requestSeqRef.current) {
          const next = data as unknown as VisualBriefing;
          setBriefing(next);
          setLastSavedAt(next.updated_at ?? new Date().toISOString());
          setStatus("saved");
        }
      }
    } catch (e: any) {
      console.error("[visual-briefing] persist failed", e);
      if (seq === requestSeqRef.current) setStatus("error");
    }
  }, [projectId]);

  const flushPending = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const patch = pendingRef.current;
    if (!patch || Object.keys(patch).length === 0) return;
    pendingRef.current = {};
    await persist(patch);
  }, [persist]);

  const queueSave = useCallback((patch: Patch, delay: number) => {
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    timerRef.current = setTimeout(() => {
      void flushPending();
    }, delay);
  }, [flushPending]);

  // beforeunload + unmount safety
  useEffect(() => {
    const onBeforeUnload = () => {
      if (Object.keys(pendingRef.current).length > 0) {
        // Best-effort sync flush via fetch keepalive isn't easy here; trigger async.
        void flushPending();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushPending();
    };
  }, [flushPending]);

  const setStep = useCallback((next: StepKey) => {
    setStepState(next);
    queueSave({ current_step: next }, STEP_DEBOUNCE_MS);
  }, [queueSave]);

  const updateProfile = useCallback((profile: ArtisticProfile) => {
    // Optimistic local merge
    setBriefing((prev) =>
      prev ? { ...prev, artistic_profile: profile } : prev
    );
    queueSave({ artistic_profile: profile }, PROFILE_DEBOUNCE_MS);
  }, [queueSave]);

  const updateReview = useCallback((data: ReviewPatch) => {
    setBriefing((prev) => (prev ? { ...prev, ...data } as VisualBriefing : prev));
    queueSave(data as Patch, REVIEW_DEBOUNCE_MS);
  }, [queueSave]);

  const toggleImage = useCallback((imgId: string) => {
    const current = briefingRef.current;
    if (!current) return;
    const next = (current.generated_images ?? []).map((i) =>
      i.id === imgId ? { ...i, selected: !i.selected } : i
    );
    setBriefing({ ...current, generated_images: next });
    queueSave({ generated_images: next as unknown as GeneratedImage[] } as Patch, 150);
  }, [queueSave]);

  const generate = useCallback(async (profile: ArtisticProfile, regen = false) => {
    if (!projectId) return;
    await flushPending();
    setGenerating(true);
    try {
      const current = briefingRef.current;
      const { data, error } = await supabase.functions.invoke("generate-visual-direction", {
        body: {
          project_id: projectId,
          briefing_id: regen ? current?.id : undefined,
          artistic_profile: profile,
        },
      });
      if (error) throw error;
      const next = (data as { briefing: VisualBriefing })?.briefing;
      if (!next) throw new Error("Resposta inválida");
      setBriefing(next);
      setStepState("generation");
      setLastSavedAt(next.updated_at ?? new Date().toISOString());
      setStatus("saved");
      // persist current_step jump
      queueSave({ current_step: "generation" }, STEP_DEBOUNCE_MS);
      toast.success(regen ? "Novas referências geradas" : "Referências de estilo geradas");
    } catch (e: any) {
      toast.error("Falha ao gerar", { description: e?.message });
      setStatus("error");
    } finally {
      setGenerating(false);
    }
  }, [projectId, flushPending, queueSave]);

  const saveAndAdvance = useCallback(async (next: StepKey, extra?: Patch) => {
    if (extra) pendingRef.current = { ...pendingRef.current, ...extra };
    pendingRef.current = { ...pendingRef.current, current_step: next };
    await flushPending();
    setStepState(next);
  }, [flushPending]);

  const retryFlush = useCallback(async () => {
    // Re-queue nothing but try to persist with a no-op touch on current_step
    if (Object.keys(pendingRef.current).length === 0) {
      pendingRef.current = { current_step: step };
    }
    await flushPending();
  }, [flushPending, step]);

  return {
    briefing,
    step,
    loading,
    generating,
    status,
    lastSavedAt,
    setStep,
    updateProfile,
    updateReview,
    toggleImage,
    generate,
    saveAndAdvance,
    retryFlush,
  };
}
