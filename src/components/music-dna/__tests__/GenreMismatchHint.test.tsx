import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GenreMismatchHint } from "@/components/music-dna/GenreMismatchHint";

const mockGetThresholds = vi.fn(() => ({ scoreThreshold: 0.92, gapThreshold: 0.05 }));

vi.mock("@/hooks/useGenreMismatchCalibration", () => ({
  useGenreMismatchCalibration: () => ({
    getThresholds: mockGetThresholds,
    submitFeedback: vi.fn().mockResolvedValue(undefined),
    submitting: false,
    feedbacks: [],
  }),
}));

interface Case {
  name: string;
  declared: string;
  detected: string;
  top1: number;
  top2: number;
  runnerUp?: string;
  shouldAlert: boolean;
}

// Cenários inspirados em sessões reais de produtores no MVP.
const CASES: Case[] = [
  // Mesma família → silenciar
  { name: "Pop ↔ Pop Brasileiro", declared: "Pop", detected: "Pop Brasileiro", top1: 0.95, top2: 0.85, shouldAlert: false },
  { name: "Rock ↔ Grunge", declared: "Rock", detected: "Grunge", top1: 0.94, top2: 0.86, shouldAlert: false },
  { name: "Sertanejo Raiz ↔ Universitário", declared: "Sertanejo Raiz", detected: "Sertanejo Universitário", top1: 0.96, top2: 0.84, shouldAlert: false },
  { name: "Hip-Hop ↔ Trap BR", declared: "Hip-Hop", detected: "Trap BR", top1: 0.93, top2: 0.86, shouldAlert: false },
  { name: "Samba ↔ Pagode", declared: "Samba", detected: "Pagode", top1: 0.97, top2: 0.82, shouldAlert: false },
  { name: "Pop ↔ Synth-Pop (cross-família via pop)", declared: "Pop", detected: "Synth-Pop", top1: 0.94, top2: 0.85, shouldAlert: false },

  // Score abaixo do limiar → silenciar
  { name: "Score baixo (Rock declared, Pop detected 0.89)", declared: "Rock", detected: "Pop", top1: 0.89, top2: 0.81, shouldAlert: false },
  // Gap insuficiente → silenciar
  { name: "Gap insuficiente (Rock vs Pop, gap 0.03)", declared: "Rock", detected: "Pop", top1: 0.95, top2: 0.92, shouldAlert: false },
  // Runner-up resgata o declarado
  { name: "Runner-up Pop BR resgata Pop declarado", declared: "Pop", detected: "Trap BR", top1: 0.93, top2: 0.86, runnerUp: "Pop Brasileiro", shouldAlert: false },

  // Divergências reais → alertar
  { name: "Pop ↔ Heavy Metal", declared: "Pop", detected: "Heavy Metal", top1: 0.94, top2: 0.84, shouldAlert: true },
  { name: "Bossa Nova ↔ Trap BR", declared: "Bossa Nova", detected: "Trap BR", top1: 0.93, top2: 0.84, shouldAlert: true },
  { name: "Funk Carioca ↔ Country", declared: "Funk Carioca", detected: "Country", top1: 0.95, top2: 0.83, shouldAlert: true },
  { name: "Sertanejo Univ ↔ Hip-Hop (runner-up Eletrônica)", declared: "Sertanejo Universitário", detected: "Hip-Hop", top1: 0.94, top2: 0.86, runnerUp: "Eletrônica / House", shouldAlert: true },
  { name: "Forró ↔ Heavy Metal", declared: "Forró / Piseiro", detected: "Heavy Metal", top1: 0.96, top2: 0.76, shouldAlert: true },
];

function buildHint(c: Case) {
  return {
    detected: c.detected,
    score: c.top1,
    runnerUp: { genre: c.runnerUp ?? "outro", score: c.top2 },
    top3: [],
  };
}

describe("GenreMismatchHint — datasets de produtores", () => {
  beforeEach(() => {
    cleanup();
    mockGetThresholds.mockImplementation(() => ({ scoreThreshold: 0.92, gapThreshold: 0.05 }));
  });

  it.each(CASES)("$name → alerta=$shouldAlert", (c) => {
    render(<GenreMismatchHint hint={buildHint(c)} declared={c.declared} />);
    const alert = screen.queryByText(/Sugestão do classificador/i);
    if (c.shouldAlert) {
      expect(alert).toBeInTheDocument();
    } else {
      expect(alert).not.toBeInTheDocument();
    }
  });
});

describe("GenreMismatchHint — calibração via thresholds", () => {
  beforeEach(() => cleanup());

  it("alerta legítimo deixa de aparecer quando thresholds sobem (efeito 'Falso alerta')", () => {
    const c: Case = { name: "_", declared: "Pop", detected: "Heavy Metal", top1: 0.94, top2: 0.84, shouldAlert: true };

    // Thresholds default: alerta aparece
    mockGetThresholds.mockImplementation(() => ({ scoreThreshold: 0.92, gapThreshold: 0.05 }));
    const { unmount } = render(<GenreMismatchHint hint={buildHint(c)} declared={c.declared} />);
    expect(screen.queryByText(/Sugestão do classificador/i)).toBeInTheDocument();
    unmount();

    // Thresholds elevados após feedback de "Falso alerta": alerta some
    mockGetThresholds.mockImplementation(() => ({ scoreThreshold: 0.97, gapThreshold: 0.10 }));
    render(<GenreMismatchHint hint={buildHint(c)} declared={c.declared} />);
    expect(screen.queryByText(/Sugestão do classificador/i)).not.toBeInTheDocument();
  });
});
