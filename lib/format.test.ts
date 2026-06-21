import { describe, expect, it } from "vitest";
import { monthLabel, shiftMonth } from "./format";

describe("shiftMonth", () => {
  it("steps forward within a year", () => {
    expect(shiftMonth("2026-03", 1)).toBe("2026-04");
  });

  it("steps back across the year boundary (the dashboard's prev-month case)", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("steps forward across the year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("handles multi-month jumps", () => {
    expect(shiftMonth("2026-06", -6)).toBe("2025-12");
  });
});

describe("monthLabel", () => {
  it("formats YYYY-MM as a human label", () => {
    expect(monthLabel("2026-06")).toBe("June 2026");
  });
});
