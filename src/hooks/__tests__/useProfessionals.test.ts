import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfessionals } from "../useProfessionals";

// Mock Supabase client — order() resolve com o payload da query
const mockOrder = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: mockOrder,
        })),
      })),
    })),
  },
}));

const mockProfessionals = [
  { id: "p1", name: "Ana Lima", specialty: "Mix Engineer", email: "ana@example.com", phone: null, bio: null, allow_global_listing: true },
  { id: "p2", name: "Carlos Souza", specialty: "Mastering", email: "carlos@example.com", phone: null, bio: null, allow_global_listing: false },
];

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe("useProfessionals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with loading=true and empty professionals", () => {
    mockOrder.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProfessionals(), { wrapper: createWrapper() });
    expect(result.current.loading).toBe(true);
    expect(result.current.professionals).toEqual([]);
  });

  it("sets professionals and loading=false on successful fetch", async () => {
    mockOrder.mockResolvedValue({ data: mockProfessionals, error: null });

    const { result } = renderHook(() => useProfessionals(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.professionals).toEqual(mockProfessionals);
  });

  it("sets loading=false and keeps empty list on fetch error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockOrder.mockResolvedValue({ data: null, error: new Error("Network error") });

    const { result } = renderHook(() => useProfessionals(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.professionals).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("returns professionals with correct shape", async () => {
    mockOrder.mockResolvedValue({ data: mockProfessionals, error: null });

    const { result } = renderHook(() => useProfessionals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [first] = result.current.professionals;
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("specialty");
  });
});
