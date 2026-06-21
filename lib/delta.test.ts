import { describe, expect, it } from "vitest";
import { deltaInfo } from "./delta";

describe("deltaInfo", () => {
  it("income up vs last month is favorable", () => {
    const d = deltaInfo(1200, 1000, true);
    expect(d.delta).toBe(200);
    expect(d.pct).toBe(20);
    expect(d.up).toBe(true);
    expect(d.good).toBe(true);
  });

  it("expenses up vs last month is unfavorable (goodUp=false)", () => {
    const d = deltaInfo(1100, 1000, false);
    expect(d.delta).toBe(100);
    expect(d.up).toBe(true);
    expect(d.good).toBe(false);
  });

  it("expenses down is favorable", () => {
    const d = deltaInfo(900, 1000, false);
    expect(d.delta).toBe(-100);
    expect(d.up).toBe(false);
    expect(d.good).toBe(true);
  });

  it("a sub-euro change counts as flat and neutral-good", () => {
    const d = deltaInfo(1000.4, 1000, true);
    expect(d.flat).toBe(true);
    expect(d.good).toBe(true);
  });

  it("no previous value → null percentage, no divide-by-zero", () => {
    const d = deltaInfo(500, 0, true);
    expect(d.pct).toBeNull();
    expect(d.delta).toBe(500);
  });

  it("percentage uses the magnitude of prev (handles negative net)", () => {
    const d = deltaInfo(-50, -100, true); // net improved from -100 to -50
    expect(d.delta).toBe(50);
    expect(d.pct).toBe(50);
    expect(d.good).toBe(true);
  });
});
