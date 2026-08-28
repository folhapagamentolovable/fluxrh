import { describe, expect, it } from "vitest";
import { InMemoryEmployeesRepository } from "../modules/employees/employees.repository.js";
import { InMemoryOrganizationsRepository } from "../modules/organizations/organizations.repository.js";
import { InMemoryPatrolsRepository } from "../modules/patrols/patrols.repository.js";
import { InMemoryTimeRepository } from "../modules/time-tracking/time.repository.js";
import { pilotScenario } from "./pilot-scenario.js";

describe("canonical pilot integration across modules", () => {
  it("reconciles all 120 people with establishments and schedules", async () => {
    const organizations = await new InMemoryOrganizationsRepository().getSnapshot();
    const pilotCompany = organizations.companies.find((company) => company.id === pilotScenario.company.id)!;
    const pilotEstablishments = organizations.units.filter((unit) => pilotScenario.establishments.some((value) => value.id === unit.id));
    const time = await new InMemoryTimeRepository().overview();
    expect(pilotCompany.employeesCount).toBe(120);
    expect(pilotEstablishments.reduce((total, value) => total + value.employeesCount, 0)).toBe(120);
    expect(time.schedules.reduce((total, value) => total + value.employeesCount, 0)).toBe(120);
  });

  it("exposes every canonical employee through bounded repository pages", async () => {
    const repository = new InMemoryEmployeesRepository();
    const pages = await Promise.all([0, 50, 100].map((offset) => repository.list({ offset, limit: 50 })));
    const pilotIds = new Set(pages.flat().filter((employee) => employee.companyId === pilotScenario.company.id).map((employee) => employee.id));
    expect(pilotIds.size).toBe(120);
    expect(pilotScenario.employeeAssignments.every((assignment) => pilotIds.has(assignment.employeeId))).toBe(true);
  });

  it("turns the three canonical posts into operational patrol routes", async () => {
    const patrols = await new InMemoryPatrolsRepository().overview();
    expect(patrols.routes).toHaveLength(3);
    expect(new Set(patrols.routes.map((route) => route.siteName))).toEqual(new Set(pilotScenario.posts.map((post) => post.name)));
    expect(patrols.routes.every((route) => route.assignedEmployees.length > 0 && route.points.length > 0)).toBe(true);
  });
});
