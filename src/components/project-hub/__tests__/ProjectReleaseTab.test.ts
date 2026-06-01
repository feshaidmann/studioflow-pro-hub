import { describe, it, expect } from "vitest";
import {
  computeHasCriticalPending,
  computePendingContentCount,
  CONTENT_KEYS,
} from "../ProjectReleaseTab";
import { defaultState } from "@/hooks/useReleaseChecklist";
import type { ChecklistState } from "@/hooks/useReleaseChecklist";

// ── computeHasCriticalPending ─────────────────────────────────────────────────

describe("computeHasCriticalPending", () => {
  it("returns true when all three critical flags are unchecked (default state)", () => {
    expect(computeHasCriticalPending(defaultState())).toBe(true);
  });

  it("returns false when all three critical items are checked", () => {
    const state = defaultState();
    state.pronto_distribuir.checked = true;
    state.pronto_publicar.checked = true;
    state.pendencias_criticas.checked = true;
    expect(computeHasCriticalPending(state)).toBe(false);
  });

  it("returns true when only pronto_distribuir is unchecked", () => {
    const state = defaultState();
    state.pronto_publicar.checked = true;
    state.pendencias_criticas.checked = true;
    expect(computeHasCriticalPending(state)).toBe(true);
  });

  it("returns true when only pronto_publicar is unchecked", () => {
    const state = defaultState();
    state.pronto_distribuir.checked = true;
    state.pendencias_criticas.checked = true;
    expect(computeHasCriticalPending(state)).toBe(true);
  });

  it("returns true when only pendencias_criticas is unchecked", () => {
    const state = defaultState();
    state.pronto_distribuir.checked = true;
    state.pronto_publicar.checked = true;
    expect(computeHasCriticalPending(state)).toBe(true);
  });

  it("handles empty state gracefully (no keys)", () => {
    const state: ChecklistState = {};
    expect(computeHasCriticalPending(state)).toBe(true);
  });
});

// ── computePendingContentCount ────────────────────────────────────────────────

describe("computePendingContentCount", () => {
  it("returns full CONTENT_KEYS length when nothing is checked", () => {
    expect(computePendingContentCount(defaultState())).toBe(CONTENT_KEYS.length);
  });

  it("returns 0 when all content keys are checked", () => {
    const state = defaultState();
    for (const k of CONTENT_KEYS) {
      state[k].checked = true;
    }
    expect(computePendingContentCount(state)).toBe(0);
  });

  it("decrements correctly as items are checked off", () => {
    const state = defaultState();
    state.capa.checked = true;
    expect(computePendingContentCount(state)).toBe(CONTENT_KEYS.length - 1);
  });

  it("non-content items being checked do not affect the count", () => {
    const state = defaultState();
    state.spotify.checked = true;
    state.splits.checked = true;
    expect(computePendingContentCount(state)).toBe(CONTENT_KEYS.length);
  });

  it("returns CONTENT_KEYS.length for an empty state object (no keys)", () => {
    expect(computePendingContentCount({})).toBe(CONTENT_KEYS.length);
  });
});
