import { describe, expect, it } from "vitest";
import { InMemoryAbsencesRepository } from "../modules/absences/absences.repository.js";
import { InMemoryAnalyticsRepository } from "../modules/analytics/analytics.repository.js";
import { InMemoryBenefitsRepository } from "../modules/benefits/benefits.repository.js";
import { InMemoryCommunicationsRepository } from "../modules/communications/communications.repository.js";
import { InMemoryGovernanceRepository } from "../modules/governance/governance.repository.js";
import { InMemoryOccupationalRepository } from "../modules/occupational-health/occupational.repository.js";
import { InMemoryPatrolsRepository } from "../modules/patrols/patrols.repository.js";
import { InMemoryPortalRepository } from "../modules/portal/portal.repository.js";
import { InMemorySpecialRepository } from "../modules/special-calculations/special.repository.js";
import { InMemoryTerminationsRepository } from "../modules/terminations/termination.repository.js";

describe("empty persistent module states", () => {
  it("never exposes demo records when a tenant has no snapshot", async () => {
    const cases = [
      [new InMemoryAbsencesRepository(), { vacationPeriods: [], vacationRequests: [], certificates: [], occurrences: [], leaves: [] }],
      [new InMemoryAnalyticsRepository(), { trend: [], departments: [], reports: [], runs: [] }],
      [new InMemoryBenefitsRepository(), { plans: [], enrollments: [], movements: [] }],
      [new InMemoryCommunicationsRepository(), { notifications: [], announcements: [], templates: [], rules: [] }],
      [new InMemoryGovernanceRepository(), { users: [], permissions: [], audit: [], sessions: [] }],
      [new InMemoryOccupationalRepository(), { exams: [], risks: [], programs: [], exceptions: [] }],
      [new InMemoryPatrolsRepository(), { routes: [], patrols: [], occurrences: [] }],
      [new InMemoryPortalRepository(), { requests: [], approvals: [] }],
      [new InMemorySpecialRepository(), { calculations: [], averageHistory: [] }],
      [new InMemoryTerminationsRepository(), { processes: [] }],
    ] as const;

    for (const [repository, state] of cases) {
      repository.hydrate(state);
      const overview = await repository.overview();
      expect(JSON.stringify(overview)).not.toMatch(/Carlos|Marina|Beatriz|Grupo Flux/);
      for (const value of Object.values(overview.summary)) {
        if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});
