import { describe, expect, it } from "vitest";
import { assistedPilotPlan, validateAssistedPilotReadiness } from "./assisted-pilot-plan.js";

describe("Phase 24 assisted pilot preparation", () => {
  it("covers the three recommended customer profiles and two parallel cycles", () => {
    expect(validateAssistedPilotReadiness()).toEqual({ ready: true, profileCount: 3, cycleCount: 2 });
    expect(assistedPilotPlan.profiles.map((profile) => profile.id)).toEqual(["small_company", "multi_site_company", "hr_advisory"]);
  });

  it("never replaces the official payroll during assisted validation", () => {
    expect(assistedPilotPlan.cycles.every((cycle) => cycle.officialPayrollReplacement === false)).toBe(true);
    expect(assistedPilotPlan.productionGate).toMatchObject({ minimumParallelCycles: 2, maximumCriticalDivergences: 0, requiresFormalApproval: true });
  });

  it("defines ownership, evidence and incident response", () => {
    expect(Object.keys(assistedPilotPlan.roles)).toHaveLength(5);
    expect(assistedPilotPlan.requiredArtifacts).toContain("registro de decisões");
    expect(assistedPilotPlan.severitySlaHours.critical).toBeLessThan(assistedPilotPlan.severitySlaHours.high);
  });
});
