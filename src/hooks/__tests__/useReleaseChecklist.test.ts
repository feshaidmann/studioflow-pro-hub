import { describe, it, expect } from "vitest";
import { defaultState, computeChecklistProgress, RELEASE_SECTIONS, type ChecklistState } from "../useReleaseChecklist";

// ── defaultState ──────────────────────────────────────────────────────────────

describe("defaultState", () => {
  it("contains all item keys from RELEASE_SECTIONS", () => {
    const state = defaultState();
    const allKeys = RELEASE_SECTIONS.flatMap((s) => s.items.map((i) => i.key));
    for (const key of allKeys) {
      expect(state).toHaveProperty(key);
    }
  });

  it("initialises every item as unchecked", () => {
    const state = defaultState();
    for (const item of Object.values(state)) {
      expect(item.checked).toBe(false);
    }
  });

  it("initialises every item with an empty value", () => {
    const state = defaultState();
    for (const item of Object.values(state)) {
      expect(item.value).toBe("");
    }
  });

  it("number of keys equals total item count across all sections", () => {
    const expected = RELEASE_SECTIONS.reduce((n, s) => n + s.items.length, 0);
    expect(Object.keys(defaultState())).toHaveLength(expected);
  });

  it("returns independent objects on successive calls (no shared reference)", () => {
    const a = defaultState();
    const b = defaultState();
    a.capa.checked = true;
    expect(b.capa.checked).toBe(false);
  });
});

// ── computeChecklistProgress ──────────────────────────────────────────────────

describe("computeChecklistProgress", () => {
  const TOTAL = RELEASE_SECTIONS.reduce((n, s) => n + s.items.length, 0);

  it("returns 0% when nothing is checked", () => {
    const { checkedItems, progress } = computeChecklistProgress(defaultState());
    expect(checkedItems).toBe(0);
    expect(progress).toBe(0);
  });

  it("returns 100% when everything is checked", () => {
    const state: ChecklistState = {};
    for (const sec of RELEASE_SECTIONS) {
      for (const item of sec.items) {
        state[item.key] = { checked: true, value: "" };
      }
    }
    const { checkedItems, progress } = computeChecklistProgress(state);
    expect(checkedItems).toBe(TOTAL);
    expect(progress).toBe(100);
  });

  it("counts only checked items", () => {
    const state = defaultState();
    state.capa.checked = true;
    state.spotify.checked = true;
    expect(computeChecklistProgress(state).checkedItems).toBe(2);
  });

  it("rounds progress to the nearest integer", () => {
    // 1 item checked out of TOTAL (35)
    const state = defaultState();
    state.capa.checked = true;
    const { progress } = computeChecklistProgress(state);
    const expected = Math.round((1 / TOTAL) * 100);
    expect(progress).toBe(expected);
  });

  it("totalItems matches RELEASE_SECTIONS count", () => {
    const { totalItems } = computeChecklistProgress(defaultState());
    expect(totalItems).toBe(TOTAL);
  });

  it("returns 0% for an empty state object (no keys at all)", () => {
    const { checkedItems, progress } = computeChecklistProgress({});
    expect(checkedItems).toBe(0);
    expect(progress).toBe(0);
  });
});
