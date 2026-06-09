import { describe, it, expect } from "vitest";
import {
  evaluateTruePeak,
  TRUE_PEAK_TARGET_DBTP,
  TRUE_PEAK_MAX_DBTP,
} from "../audioAnalysis";

describe("evaluateTruePeak", () => {
  it("returns 'ok' when true peak is below the target (-1 dBTP)", () => {
    expect(evaluateTruePeak(-2)).toBe("ok");
    expect(evaluateTruePeak(-3)).toBe("ok");
    expect(evaluateTruePeak(-10)).toBe("ok");
    expect(evaluateTruePeak(TRUE_PEAK_TARGET_DBTP)).toBe("ok");
  });

  it("returns 'tolerance' when true peak is between -1 and 0 dBTP", () => {
    expect(evaluateTruePeak(-0.5)).toBe("tolerance");
    expect(evaluateTruePeak(-0.1)).toBe("tolerance");
    // Exactly at max (0 dBTP) is still tolerance
    expect(evaluateTruePeak(TRUE_PEAK_MAX_DBTP)).toBe("tolerance");
  });

  it("returns 'critical' when true peak exceeds 0 dBTP", () => {
    expect(evaluateTruePeak(0.1)).toBe("critical");
    expect(evaluateTruePeak(1)).toBe("critical");
    expect(evaluateTruePeak(3)).toBe("critical");
  });

  it("boundary: exactly -1 dBTP is 'ok'", () => {
    expect(evaluateTruePeak(-1)).toBe("ok");
  });

  it("boundary: exactly 0 dBTP is 'tolerance' not 'critical'", () => {
    expect(evaluateTruePeak(0)).toBe("tolerance");
  });

  it("constants have correct relationship: target < max", () => {
    expect(TRUE_PEAK_TARGET_DBTP).toBeLessThan(TRUE_PEAK_MAX_DBTP);
  });
});
