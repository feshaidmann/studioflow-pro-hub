import { describe, it, expect } from "vitest";
import {
  evaluateTruePeak,
  computeCrestFactorDb,
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

describe("computeCrestFactorDb", () => {
  it("returns ~3 dB for a full-cycle sine (peak − RMS = 20·log10(√2) ≈ 3.01)", () => {
    const sr = 48000;
    const freq = 440;
    const n = sr;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) buf[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sr);
    const crest = computeCrestFactorDb(buf);
    expect(crest).toBeGreaterThan(2.5);
    expect(crest).toBeLessThan(3.5);
  });

  it("clamps to 40 dB for an extreme impulse signal", () => {
    const buf = new Float32Array(10000);
    buf[0] = 1;
    const crest = computeCrestFactorDb(buf);
    expect(crest).toBe(40);
  });

  it("returns 0 for silence", () => {
    const buf = new Float32Array(1000);
    expect(computeCrestFactorDb(buf)).toBe(0);
  });

  it("uses provided RMS when given", () => {
    const buf = new Float32Array(1000);
    for (let i = 0; i < buf.length; i++) buf[i] = 0.25;
    const crest = computeCrestFactorDb(buf, -20);
    expect(crest).toBeGreaterThan(7);
    expect(crest).toBeLessThan(9);
  });
});
