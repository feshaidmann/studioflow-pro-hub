import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAcceptanceSignal } from "../useAcceptanceSignal";

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: mockInsert })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("useAcceptanceSignal — versionamento do prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persiste o rótulo versionado (A.v2) tal como recebido", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: "analysis-1",
        variant: "A.v2",
        signal: "impression",
      });
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.summary_variant).toBe("A.v2");
    expect(payload.signal_type).toBe("impression");
    expect(payload.analysis_id).toBe("analysis-1");
    expect(payload.user_id).toBe("user-1");
  });

  it("injeta metadata.prompt_version derivado do rótulo (A.v2 → v2)", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: "analysis-2",
        variant: "B.v3",
        signal: "task_created",
      });
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.summary_variant).toBe("B.v3");
    expect(payload.metadata).toMatchObject({ prompt_version: "v3" });
  });

  it("preserva metadata adicional do caller e adiciona prompt_version", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: "analysis-3",
        variant: "A.v2",
        signal: "thumbs_down",
        metadata: { reason: "muito técnico", stage: "master", genero: "MPB" },
      });
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.metadata).toMatchObject({
      prompt_version: "v2",
      reason: "muito técnico",
      stage: "master",
      genero: "MPB",
    });
  });

  it("permite o caller sobrescrever prompt_version via metadata explícito", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: "analysis-4",
        variant: "A.v2",
        signal: "saved",
        metadata: { prompt_version: "v9-experimental" },
      });
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.metadata.prompt_version).toBe("v9-experimental");
  });

  it("aceita rótulo base (A/B) sem versão e marca prompt_version='v1'", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: "analysis-5",
        variant: "B",
        signal: "copied",
      });
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.summary_variant).toBe("B");
    expect(payload.metadata.prompt_version).toBe("v1");
  });

  it("rejeita rótulo malformado e cai no fallback 'A' (v1)", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: "analysis-6",
        variant: "C.v2" as unknown as string, // base inválida
        signal: "impression",
      });
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.summary_variant).toBe("A");
    expect(payload.metadata.prompt_version).toBe("v1");
  });

  it("não chama insert se analysisId estiver ausente", async () => {
    const { result } = renderHook(() => useAcceptanceSignal());

    await act(async () => {
      await result.current.send({
        analysisId: null,
        variant: "A.v2",
        signal: "impression",
      });
    });

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
