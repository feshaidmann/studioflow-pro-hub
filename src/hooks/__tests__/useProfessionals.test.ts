import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfessionals } from "../useProfessionals";

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockThen = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockReturnValue({
            then: mockThen,
          }),
        }),
      }),
    })),
  },
}));

const mockProfessionals = [
  { id: "p1", name: "Ana Lima", specialty: "Mix Engineer", email: "ana@example.com", phone: null, bio: null, allow_global_listing: true },
  { id: "p2", name: "Carlos Souza", specialty: "Mastering", email: "carlos@example.com", phone: null, bio: null, allow_global_listing: false },
];

describe("useProfessionals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with loading=true and empty professionals", () => {
    // Promise that never resolves — keeps hook in loading state
    mockThen.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProfessionals());
    expect(result.current.loading).toBe(true);
    expect(result.current.professionals).toEqual([]);
  });

  it("sets professionals and loading=false on successful fetch", async () => {
    mockThen.mockImplementation((cb: (res: unknown) => void) => {
      cb({ data: mockProfessionals, error: null });
    });

    const { result } = renderHook(() => useProfessionals());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.professionals).toEqual(mockProfessionals);
  });

  it("sets loading=false and keeps empty list on fetch error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockThen.mockImplementation((cb: (res: unknown) => void) => {
      cb({ data: null, error: new Error("Network error") });
    });

    const { result } = renderHook(() => useProfessionals());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.professionals).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("returns professionals with correct shape", async () => {
    mockThen.mockImplementation((cb: (res: unknown) => void) => {
      cb({ data: mockProfessionals, error: null });
    });

    const { result } = renderHook(() => useProfessionals());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [first] = result.current.professionals;
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("specialty");
  });
});
