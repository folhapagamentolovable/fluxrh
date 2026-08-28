import { describe, expect, it } from "vitest";
import { syntheticRolloutPlan, validateSyntheticRolloutPlan } from "./synthetic-rollout-plan.js";

describe("Phase 25 synthetic gradual rollout", () => {
  it("preserves the roadmap order and requires every operational control", () => {
    expect(validateSyntheticRolloutPlan()).toEqual({ ready: true, increments: 8, controls: 6 });
    expect(syntheticRolloutPlan.increments.slice(0, 3)).toEqual(["registration_documents", "admission", "employee_portal"]);
    expect(syntheticRolloutPlan.increments.at(-1)).toBe("remaining_modules");
  });

  it("cannot enable official operations", () => {
    expect(syntheticRolloutPlan.mode).toBe("synthetic_only");
    expect(syntheticRolloutPlan.officialOperationsEnabled).toBe(false);
    expect(syntheticRolloutPlan.productionGate.requiresExplicitHumanApproval).toBe(true);
  });
});
