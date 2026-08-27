import { describe, expect, it } from "vitest";
import {
  calculateInss,
  calculateIrrf,
  calculatePayroll,
} from "./payroll-calculator.js";
describe("payroll calculator", () => {
  it("applies progressive social security brackets", () => {
    expect(calculateInss(1518)).toBe(113.85);
    expect(calculateInss(9000)).toBeLessThanOrEqual(951.63);
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
});
