import { describe, expect, it } from "vitest";
import {
  calculateInss,
  calculateIrrf,
  calculatePayroll,
  competenceCalendar,
} from "./payroll-calculator.js";
describe("payroll calculator", () => {
  it("counts August 2026 Sundays without duplicating holidays", () =>
    expect(competenceCalendar("2026-08", ["2026-08-09"])).toEqual({ workingDays: 26, restDays: 5 }));
  it("applies progressive social security brackets", () => {
    expect(calculateInss(1621)).toBe(121.58);
    expect(calculateInss(6000)).toBe(641.52);
    expect(calculateInss(9000)).toBeLessThanOrEqual(988.09);
  });
  it("keeps income tax exempt below the first bracket", () =>
    expect(calculateIrrf(2400)).toBe(0));
  it("calculates earnings, deductions and employer FGTS", () => {
    const result = calculatePayroll({
      salary: 3000,
      overtime50Hours: 10,
      overtime100Hours: 0,
      nightHours: 0,
      absenceDays: 1,
    });
    expect(result.overtime50).toBeGreaterThan(0);
    expect(result.absence).toBe(100);
    expect(result.fgts).toBeGreaterThan(0);
    expect(result.net).toBeLessThan(result.gross);
  });
  it("applies the 2026 monthly IRRF reduction", () => {
    expect(calculateIrrf(4392.8, 5000)).toBe(0);
    expect(calculateIrrf(5350.4, 6000)).toBe(382.88);
  });
  it("uses the legal tables and FGTS rate supplied by the resolved version", () => {
    const result = calculatePayroll({
      salary: 1000,
      overtime50Hours: 0,
      overtime100Hours: 0,
      nightHours: 0,
      absenceDays: 0,
      inssTable: { brackets: [{ from: 0, to: null, rate: 10, deduction: 0 }], ceiling: 1000 },
      irrfTable: { brackets: [{ from: 0, to: null, rate: 0, deduction: 0 }], simplifiedDeduction: 0 },
      fgtsRate: 0.1,
    });
    expect(result.inss).toBe(100);
    expect(result.irrf).toBe(0);
    expect(result.fgts).toBe(100);
  });
  it("reproduces AUD-0001 August payroll with DSR and no overtime", () => {
    const result = calculatePayroll({
      salary: 2091.57,
      overtime50Hours: 0,
      overtime100Hours: 0,
      nightHours: 125.714288,
      absenceDays: 0,
      workingDays: 26,
      restDays: 5,
    });
    expect(result).toMatchObject({
      overtime50: 0,
      overtime100: 0,
      night: 239.04,
      dsr: 45.97,
      gross: 2376.58,
      inss: 189.58,
      irrf: 0,
      fgts: 190.13,
      net: 2187,
    });
  });
});
