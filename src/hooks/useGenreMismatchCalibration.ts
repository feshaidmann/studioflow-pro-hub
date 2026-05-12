import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeGenreName } from "@/lib/genreFamilies";

export type Verdict = "falso_alerta" | "correto";

interface FeedbackRow {
  declared_genre: string;
  detected_genre: string;
  score: number;
  gap: number;
  verdict: Verdict;
  created_at: string;
}

const DEFAULT_SCORE = 0.92;
const DEFAULT_GAP = 0.05;
const FLOOR_SCORE = 0.88;
const FLOOR_GAP = 0.04;
const CEIL_SCORE = 0.985;
const CEIL_GAP = 0.10;
const PER_GENRE_WINDOW = 30;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface Thresholds {
  scoreThreshold: number;
  gapThreshold: number;
}

function computeFromRows(rows: FeedbackRow[]): Thresholds {
  if (!rows.length) return { scoreThreshold: DEFAULT_SCORE, gapThreshold: DEFAULT_GAP };
  const falsos = rows.filter((r) => r.verdict === "falso_alerta");
  const corretos = rows.filter((r) => r.verdict === "correto");

  let score = DEFAULT_SCORE;
  let gap = DEFAULT_GAP;

  if (falsos.length > 0) {
    const maxFalseScore = Math.max(...falsos.map((r) => Number(r.score) || 0));
    const maxFalseGap = Math.max(...falsos.map((r) => Number(r.gap) || 0));
    score = Math.max(DEFAULT_SCORE, maxFalseScore + 0.005);
    gap = Math.max(DEFAULT_GAP, maxFalseGap + 0.005);
  } else if (corretos.length >= 3) {
    const minCorrectScore = Math.min(...corretos.map((r) => Number(r.score) || 1));
    const minCorrectGap = Math.min(...corretos.map((r) => Number(r.gap) || 1));
    score = Math.min(DEFAULT_SCORE, minCorrectScore - 0.005);
    gap = Math.min(DEFAULT_GAP, minCorrectGap - 0.005);
  }

  return {
    scoreThreshold: clamp(score, FLOOR_SCORE, CEIL_SCORE),
    gapThreshold: clamp(gap, FLOOR_GAP, CEIL_GAP),
  };
}

export function useGenreMismatchCalibration() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery<FeedbackRow[]>({
    queryKey: ["genre-mismatch-feedback", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_mismatch_feedback")
        .select("declared_genre,detected_genre,score,gap,verdict,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.warn("[genre-mismatch-feedback] fetch failed", error);
        return [];
      }
      return (data ?? []) as FeedbackRow[];
    },
  });

  const getThresholds = useCallback(
    (declared: string | null | undefined): Thresholds => {
      if (!declared) return { scoreThreshold: DEFAULT_SCORE, gapThreshold: DEFAULT_GAP };
      const norm = normalizeGenreName(declared);
      const perGenre = rows
        .filter((r) => normalizeGenreName(r.declared_genre) === norm)
        .slice(0, PER_GENRE_WINDOW);
      if (perGenre.length > 0) return computeFromRows(perGenre);
      // Fallback global do mesmo usuário
      return computeFromRows(rows.slice(0, PER_GENRE_WINDOW));
    },
    [rows],
  );

  const submit = useMutation({
    mutationFn: async (params: {
      declared: string;
      detected: string;
      score: number;
      gap: number;
      verdict: Verdict;
      analysisId?: string | null;
    }) => {
      if (!user) throw new Error("not-authenticated");
      const { error } = await supabase.from("genre_mismatch_feedback").insert({
        user_id: user.id,
        declared_genre: params.declared,
        detected_genre: params.detected,
        score: params.score,
        gap: params.gap,
        verdict: params.verdict,
        analysis_id: params.analysisId ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["genre-mismatch-feedback", user?.id] });
    },
  });

  return useMemo(
    () => ({ getThresholds, submitFeedback: submit.mutateAsync, submitting: submit.isPending }),
    [getThresholds, submit.mutateAsync, submit.isPending],
  );
}
