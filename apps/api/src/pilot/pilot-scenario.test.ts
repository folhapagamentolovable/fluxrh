import { describe, expect, it } from "vitest";
import { createPilotEmployees, pilotScenario } from "./pilot-scenario.js";

describe("Phase 23 internal pilot", () => {
  it("provides a representative, deterministic and entirely fictitious company", () => {
    const employees = createPilotEmployees();
    expect(employees).toHaveLength(116);
    expect(new Set(employees.map((employee) => employee.registration)).size).toBe(116);
    expect(new Set(employees.map((employee) => employee.establishmentId)).size).toBe(2);
    expect(new Set(employees.map((employee) => employee.workSchedule)).size).toBe(3);
    expect(pilotScenario.posts).toHaveLength(3);
    expect(Object.values(pilotScenario.journeys).every((total) => total > 0)).toBe(true);
    expect(employees.every((employee) => employee.email.endsWith(".invalid"))).toBe(true);
  });
});
