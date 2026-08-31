import { describe, expect, it } from "vitest";
import { auditVacation } from "./vacation-audit.js";

describe("vacation legal audit", () => {
  it("reproduces AUD-0001 acquisition, concession and gross vacation pay", () => {
    expect(
      auditVacation({
        hireDate: "2025-01-01",
        acquisitionStart: "2025-01-01",
        acquisitionEnd: "2025-12-31",
        concessionDeadline: "2026-12-31",
        vacationStart: "2026-09-01",
        vacationEnd: "2026-09-30",
        monthlySalary: 2091.57,
        earnedDays: 30,
      }),
    ).toEqual({
      vacationDays: 30,
      returnDate: "2026-10-01",
      paymentDeadline: "2026-08-30",
      remunerationBase: 2091.57,
      vacationRemuneration: 2091.57,
      constitutionalThird: 697.19,
      grossVacation: 2788.76,
      acquisitionCompliant: true,
      concessionCompliant: true,
      entitlementCompliant: true,
      findings: [],
    });
  });

  it("flags vacation granted after the concession deadline", () => {
    const result = auditVacation({
      hireDate: "2025-01-01",
      acquisitionStart: "2025-01-01",
      acquisitionEnd: "2025-12-31",
      concessionDeadline: "2026-12-31",
      vacationStart: "2027-01-01",
      vacationEnd: "2027-01-30",
      monthlySalary: 2091.57,
      earnedDays: 30,
    });
    expect(result.concessionCompliant).toBe(false);
    expect(result.findings).toContain("vacation_after_concession_deadline");
  });
});
