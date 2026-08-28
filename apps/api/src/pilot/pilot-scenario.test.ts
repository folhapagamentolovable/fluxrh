import { describe, expect, it } from "vitest";
import { createPilotEmployees, createPilotScenario, pilotScenario } from "./pilot-scenario.js";

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

  it("is the canonical deterministic source for every pilot module", () => {
    const first = createPilotScenario();
    expect(createPilotScenario()).toEqual(first);
    expect(first.syntheticEmployees.length + first.existingEmployeeIds.length).toBe(first.company.employeeTarget);
    expect(first.establishments.reduce((total, establishment) => total + establishment.employeeTarget, 0)).toBe(first.company.employeeTarget);
    expect(new Set(first.posts.map((post) => post.id)).size).toBe(3);
    expect(first.posts.every((post) => first.establishments.some((establishment) => establishment.id === post.establishmentId))).toBe(true);
    expect(first.schedules).toHaveLength(3);
  });

  it("assigns every employee to one valid establishment, post, schedule and planned journey set", () => {
    const scenario = createPilotScenario();
    expect(scenario.employeeAssignments).toHaveLength(120);
    expect(new Set(scenario.employeeAssignments.map((assignment) => assignment.employeeId)).size).toBe(120);
    for (const assignment of scenario.employeeAssignments) {
      expect(scenario.establishments.some((value) => value.id === assignment.establishmentId)).toBe(true);
      expect(scenario.posts.some((value) => value.id === assignment.postId && value.establishmentId === assignment.establishmentId)).toBe(true);
      expect(scenario.schedules.some((value) => value.id === assignment.scheduleId)).toBe(true);
    }
    expect(scenario.employeeAssignments.filter((value) => value.journeys.includes("admission"))).toHaveLength(scenario.journeys.admissions);
    expect(scenario.employeeAssignments.filter((value) => value.journeys.includes("vacation"))).toHaveLength(scenario.journeys.vacations);
    expect(scenario.employeeAssignments.filter((value) => value.journeys.includes("medical_certificate"))).toHaveLength(scenario.journeys.medicalCertificates);
    expect(scenario.employeeAssignments.filter((value) => value.journeys.includes("termination"))).toHaveLength(scenario.journeys.terminations);
    expect(scenario.employeeAssignments.filter((value) => value.journeys.includes("intentional_exception"))).toHaveLength(scenario.journeys.intentionalExceptions);
  });
});
