import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfessionalMetrics } from "../useProfessionalMetrics";
import type { Professional } from "@/components/professionals/types";

// ── Hoisted Supabase result stores ────────────────────────────────────────────
const db = vi.hoisted(() => ({
  members: [] as unknown[],
  ratings: [] as unknown[],
  profile: null as unknown,
  rpcCount: 0 as unknown,
}));

vi.mock("@/integrations/supabase/client", () => {
  // Each table's chain terminates at the exact method the hook uses last,
  // returning an explicit Promise. Intermediate methods return the chain.

  function membersChain() {
    const c: any = {};
    c.select = () => c;
    c.eq     = () => c;
    c.ilike  = () => c;
    c.order  = () => Promise.resolve({ data: db.members, error: null });
    return c;
  }

  function ratingsChain() {
    const c: any = {};
    c.select = () => c;
    c.eq     = () => c;
    c.ilike  = () => Promise.resolve({ data: db.ratings, error: null });
    return c;
  }

  function profilesChain() {
    const c: any = {};
    c.select     = () => c;
    c.eq         = () => c;
    c.maybySingle = () => Promise.resolve({ data: db.profile, error: null }); // typo in name below
    c.maybeSingle = () => Promise.resolve({ data: db.profile, error: null });
    return c;
  }

  return {
    supabase: {
      from: (table: string) => {
        if (table === "project_members")      return membersChain();
        if (table === "professional_ratings") return ratingsChain();
        if (table === "profiles")             return profilesChain();
        return membersChain();
      },
      rpc: (name: string) => {
        if (name === "find_public_profile_by_email") {
          return Promise.resolve({ data: db.profile ? [db.profile] : [], error: null });
        }
        return Promise.resolve({ data: db.rpcCount, error: null });
      },
    },
  };
});

// Stable reference — a new object on every call would change the useEffect
// dependency [prof, user] on every re-render (e.g. triggered by setLoading),
// causing the cleanup to mark every fetch as cancelled.
const stableUser = vi.hoisted(() => ({ id: "user-1" }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: stableUser }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const prof: Professional = {
  id: "p1",
  name: "Carlos Produtor",
  email: "carlos@example.com",
  phone: "",
  specialty: "Mix Engineer",
  bio: "",
  active: true,
  allow_global_listing: true,
  created_at: "2024-01-01T00:00:00Z",
  favorite: false,
};

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    project_id: "proj-1",
    created_at: "2025-01-01T00:00:00Z",
    role: "Mix Engineer",
    fee: 500,
    delivery_status: "delivered",
    delivery_due_date: "2025-01-10T00:00:00Z",
    projects: { id: "proj-1", name: "Álbum de Verão", completed: true },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("useProfessionalMetrics", () => {
  beforeEach(() => {
    db.members  = [];
    db.ratings  = [];
    db.profile  = null;
    db.rpcCount = 0;
  });

  it("returns metrics=null and loading=false when prof is null", async () => {
    const { result } = renderHook(() => useProfessionalMetrics(null));
    // No loading started for null prof
    expect(result.current.loading).toBe(false);
    expect(result.current.metrics).toBeNull();
  });

  it("starts loading when prof is provided", () => {
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    expect(result.current.loading).toBe(true);
  });

  it("sets loading=false after fetch completes", async () => {
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("sets projectCount from number of member rows", async () => {
    db.members = [makeRow(), makeRow({ project_id: "proj-2", projects: { id: "proj-2", name: "EP", completed: false } })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.projectCount).toBe(2);
  });

  it("extracts projectNames from member rows, filtering nulls", async () => {
    db.members = [
      makeRow({ projects: { id: "p1", name: "Álbum", completed: false } }),
      makeRow({ projects: null }), // null projects — should be filtered
    ];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.projectNames).toEqual(["Álbum"]);
  });

  it("sets lastActivity from the first member row's created_at", async () => {
    db.members = [makeRow({ created_at: "2025-06-15T00:00:00Z" })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.lastActivity).toBe("2025-06-15T00:00:00Z");
  });

  it("sets lastActivity=null when there are no member rows", async () => {
    db.members = [];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.lastActivity).toBeNull();
  });

  // ── avgFee ──────────────────────────────────────────────────────────────
  it("calculates avgFee as average of non-zero fees", async () => {
    db.members = [makeRow({ fee: 300 }), makeRow({ fee: 700 })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgFee).toBe(500);
  });

  it("avgFee is null when all fees are zero", async () => {
    db.members = [makeRow({ fee: 0 }), makeRow({ fee: 0 })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgFee).toBeNull();
  });

  it("avgFee excludes zero-fee rows from the average", async () => {
    db.members = [makeRow({ fee: 1000 }), makeRow({ fee: 0 })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgFee).toBe(1000);
  });

  // ── avgDeliveryDays ──────────────────────────────────────────────────────
  it("calculates avgDeliveryDays correctly", async () => {
    // 10 days between joined and due date
    db.members = [
      makeRow({ created_at: "2025-01-01T00:00:00Z", delivery_due_date: "2025-01-11T00:00:00Z" }),
      makeRow({ created_at: "2025-02-01T00:00:00Z", delivery_due_date: "2025-02-21T00:00:00Z" }), // 20 days
    ];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgDeliveryDays).toBe(15); // (10+20)/2
  });

  it("avgDeliveryDays is null when no rows have delivery dates", async () => {
    db.members = [makeRow({ delivery_due_date: null })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgDeliveryDays).toBeNull();
  });

  it("avgDeliveryDays ignores negative-duration rows", async () => {
    // due date before joined_at — should be filtered out
    db.members = [
      makeRow({ created_at: "2025-01-10T00:00:00Z", delivery_due_date: "2025-01-05T00:00:00Z" }),
    ];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgDeliveryDays).toBeNull();
  });

  // ── Ratings ──────────────────────────────────────────────────────────────
  it("calculates avgRating from rating rows", async () => {
    db.ratings = [{ stars: 4 }, { stars: 5 }, { stars: 3 }];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgRating).toBeCloseTo(4);
    expect(result.current.metrics!.ratingCount).toBe(3);
  });

  it("avgRating is null when there are no ratings", async () => {
    db.ratings = [];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.avgRating).toBeNull();
    expect(result.current.metrics!.ratingCount).toBe(0);
  });

  // ── Platform project count (RPC) ─────────────────────────────────────────
  it("sets platformProjectCount from RPC result", async () => {
    db.rpcCount = 7;
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.platformProjectCount).toBe(7);
  });

  it("platformProjectCount defaults to 0 when RPC returns null", async () => {
    db.rpcCount = null;
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.platformProjectCount).toBe(0);
  });

  // ── Public profile ────────────────────────────────────────────────────────
  it("sets publicProfile when profiles query returns data with username", async () => {
    db.profile = { username: "carlosmix", display_name: "Carlos Produtor" };
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.publicProfile).toEqual({
      username: "carlosmix",
      display_name: "Carlos Produtor",
    });
  });

  it("publicProfile is null when profile query returns no data", async () => {
    db.profile = null;
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.publicProfile).toBeNull();
  });

  it("publicProfile is null when profile has no username", async () => {
    db.profile = { username: null, display_name: "Carlos" };
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.publicProfile).toBeNull();
  });

  // ── collaborationHistory ─────────────────────────────────────────────────
  it("builds collaborationHistory with correct shape", async () => {
    db.members = [makeRow()];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const [entry] = result.current.metrics!.collaborationHistory;
    expect(entry).toMatchObject({
      projectId: "proj-1",
      projectName: "Álbum de Verão",
      completed: true,
      role: "Mix Engineer",
      fee: 500,
      deliveryStatus: "delivered",
      joinedAt: "2025-01-01T00:00:00Z",
      deliveryDueDate: "2025-01-10T00:00:00Z",
    });
  });

  it("uses '—' as fallback projectName when projects is null", async () => {
    db.members = [makeRow({ projects: null })];
    const { result } = renderHook(() => useProfessionalMetrics(prof));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics!.collaborationHistory[0].projectName).toBe("—");
  });

  // ── Reset on prof change ──────────────────────────────────────────────────
  it("resets metrics to null immediately when prof changes", async () => {
    db.members = [makeRow()];
    const profRef = { current: prof };
    const { result, rerender } = renderHook(() => useProfessionalMetrics(profRef.current));

    await waitFor(() => expect(result.current.metrics).not.toBeNull());

    // Switch to null prof
    profRef.current = null as unknown as Professional;
    rerender();

    expect(result.current.metrics).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
