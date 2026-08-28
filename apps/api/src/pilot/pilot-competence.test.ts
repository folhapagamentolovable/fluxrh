import { describe, expect, it } from "vitest";
import { runPilotCompetence } from "./pilot-competence.js";

describe("Phase 23 complete competence cycle", () => {
  it("executes every critical journey and reconciles the competence", () => {
    const report = runPilotCompetence();
    expect(report.completed).toBe(true);
    expect(report.journeys.map((journey) => journey.name)).toEqual(expect.arrayContaining(["admissions", "vacations", "medical_certificates", "terminations", "intentional_exceptions", "time_closing", "payroll_preview", "payroll_closing", "artifacts"]));
    expect(report.journeys.every((journey) => journey.processed === journey.expected)).toBe(true);
    expect(report.reconciliation.netPayroll).toBe(report.reconciliation.grossPayroll - report.reconciliation.deductions);
    expect(report.reconciliation.openCriticalOrHighDefects).toBe(0);
    expect(report.reconciliation.unresolvedDivergences).toBe(0);
  });

  it("keeps an auditable decision for every intentional divergence", () => {
    const report = runPilotCompetence();
    expect(report.divergences.length).toBeGreaterThan(0);
    expect(report.divergences.every((divergence) => divergence.status === "resolved" && divergence.decision.length > 10)).toBe(true);
    expect(report.journeys.find((journey) => journey.name === "intentional_exceptions")?.status).toBe("completed_with_exception");
  });
});
