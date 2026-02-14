import { describe, expect, it } from "vitest";
import { scoreSignals, combineWithDevinPlan } from "../src/policy/confidence";

describe("scoreSignals", () => {
  it("returns 0 when no signals", () => {
    expect(scoreSignals([])).toBe(0);
  });

  it("weights tier 0 and tier 1 strongly", () => {
    const score = scoreSignals([
      { kind: "docs_check_failed", tier: 0, confidence: 0.9, evidence: [] },
      { kind: "openapi_diff", tier: 1, confidence: 0.95, evidence: [] },
    ]);

    expect(score).toBeGreaterThan(0.9);
  });

  it("combines detector and Devin confidence", () => {
    expect(combineWithDevinPlan(0.8, 0.6)).toBeCloseTo(0.73, 2);
  });
});
