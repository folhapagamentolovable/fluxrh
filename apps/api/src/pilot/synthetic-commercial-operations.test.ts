import { describe, expect, it } from "vitest";
import { syntheticCommercialOperations, validateSyntheticCommercialOperations } from "./synthetic-commercial-operations.js";

describe("Phase 26 synthetic commercial operations", () => {
  it("standardizes onboarding, observability and periodic reviews", () => {
    expect(validateSyntheticCommercialOperations()).toEqual({ ready: true, onboardingStages: 8, monitoredMetrics: 6, periodicReviews: 4 });
    expect(syntheticCommercialOperations.onboardingStages.at(-1)).toBe("hypercare");
    expect(syntheticCommercialOperations.periodicReviews).toContain("lgpd");
  });

  it("keeps real commercial release disabled", () => {
    expect(syntheticCommercialOperations.mode).toBe("synthetic_only");
    expect(syntheticCommercialOperations.realCommercialRelease).toBe(false);
    expect(syntheticCommercialOperations.supportSlaHours.critical).toBeLessThan(syntheticCommercialOperations.supportSlaHours.high);
  });
});
