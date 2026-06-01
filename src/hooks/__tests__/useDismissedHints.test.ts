import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDismissedHints } from "../useDismissedHints";

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockSupabaseData: { data: unknown[] | null; error: null } = { data: [], error: null };
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockEq = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: mockEq.mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseData),
        }),
      })),
      upsert: mockUpsert,
    })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("useDismissedHints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseData.data = [];
  });

  it("starts with loading=true", () => {
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    expect(result.current.loading).toBe(true);
  });

  it("sets loading=false after data loads", async () => {
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("dismissed set is empty when no data returned", async () => {
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dismissed.size).toBe(0);
  });

  it("dismissed set is empty when projectId is not provided", async () => {
    const { result } = renderHook(() => useDismissedHints());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dismissed.size).toBe(0);
  });

  it("populates dismissed from permanent rows (snooze_until=null)", async () => {
    mockSupabaseData.data = [{ specialty: "Mix Engineer", snooze_until: null }];
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dismissed.has("Mix Engineer")).toBe(true);
  });

  it("populates dismissed from active snooze rows (future date)", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    mockSupabaseData.data = [{ specialty: "Mastering", snooze_until: future }];
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dismissed.has("Mastering")).toBe(true);
  });

  it("does not include expired snooze rows", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    mockSupabaseData.data = [{ specialty: "Vocal Coach", snooze_until: past }];
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dismissed.has("Vocal Coach")).toBe(false);
  });

  it("dismiss adds specialty to dismissed set optimistically", async () => {
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.dismiss("Producer", "permanent");
    });

    expect(result.current.dismissed.has("Producer")).toBe(true);
  });

  it("dismiss with mode=snooze passes a future snooze_until date to upsert", async () => {
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.dismiss("Arranger", "snooze");
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ snooze_until: expect.any(String) }),
      expect.anything()
    );
    const [upsertArg] = mockUpsert.mock.calls[0];
    expect(new Date(upsertArg.snooze_until).getTime()).toBeGreaterThan(Date.now());
  });

  it("dismiss with mode=permanent passes snooze_until=null to upsert", async () => {
    const { result } = renderHook(() => useDismissedHints("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.dismiss("Producer", "permanent");
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ snooze_until: null }),
      expect.anything()
    );
  });
});
