import { describe, expect, it } from "vitest";
import { InMemoryAbsencesRepository } from "./absences.repository.js";

describe("InMemoryAbsencesRepository hydration", () => {
  it("normalizes a legacy pilot snapshot without crashing the overview", async () => {
    const repository = new InMemoryAbsencesRepository();
    repository.hydrate({
      vacationPeriods: [
        {
          id: "period-1",
          employeeId: "employee-1",
          employeeName: "Colaborador Fictício",
          acquisitionStart: "2025-01-01",
          acquisitionEnd: "2025-12-31",
          concessionDeadline: "2026-12-31",
          earnedDays: 30,
          usedDays: 0,
          scheduledDays: 30,
          balanceDays: 0,
          status: "scheduled",
          risk: "normal",
        },
      ],
      vacations: [
        {
          id: "vacation-1",
          employeeId: "employee-1",
          employeeName: "Colaborador Fictício",
          companyName: "Empresa Fictícia",
          departmentName: "Operações",
          periodId: "period-1",
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          days: 30,
          soldDays: 0,
          advanceThirteenth: false,
          status: "approved",
          requestedAt: "2026-08-28T15:00:00.000Z",
          approvedAt: "2026-08-28T15:05:00.000Z",
          coverageStatus: "confirmed",
          payrollEventStatus: "scheduled",
        },
      ],
      medicalCertificates: [
        { employeeId: "legacy", registration: "000001", status: "validated" },
      ],
    });

    const overview = await repository.overview();

    expect(overview.vacationRequests).toHaveLength(1);
    expect(overview.vacationRequests[0]?.id).toBe("vacation-1");
    expect(overview.certificates).toEqual([]);
    expect(overview.occurrences).toEqual([]);
    expect(overview.leaves).toEqual([]);
  });

  it("persists the private Storage asset linked to a medical certificate", async () => {
    const repository = new InMemoryAbsencesRepository();
    const certificate = await repository.createCertificate({
      employeeId: "employee-storage",
      employeeName: "Colaborador Storage",
      startDate: "2026-09-05",
      endDate: "2026-09-06",
      issuer: "Clínica Segura",
      professionalRegistration: "CRM-SP 123456",
      documentName: "atestado-storage.pdf",
      documentAssetId: "33333333-3333-4333-8333-333333333333",
    });

    expect(certificate.documentAssetId).toBe(
      "33333333-3333-4333-8333-333333333333",
    );
    expect((await repository.overview()).certificates[0]?.documentAssetId).toBe(
      "33333333-3333-4333-8333-333333333333",
    );
  });
});
