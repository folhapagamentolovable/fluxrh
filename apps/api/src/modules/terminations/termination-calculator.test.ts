import { describe, expect, it } from "vitest";
import { calculateTermination } from "./termination-calculator.js";
const base = {
  baseSalary: 3000,
  averageVariables: 0,
  balanceDays: 15,
  vacationDuePeriods: 0,
  proportionalVacationTwelfths: 6,
  thirteenthTwelfths: 6,
  noticeType: "indemnified" as const,
  noticeDays: 30,
  fgtsBalance: 10000,
};
describe("termination calculator", () => {
  it("applies 40% FGTS penalty to dismissal without cause", () =>
    expect(
      calculateTermination({ ...base, type: "dismissal_without_cause" })
        .fgtsPenalty,
    ).toBe(4000));
  it("does not apply penalty on resignation", () =>
    expect(
      calculateTermination({ ...base, type: "resignation" }).fgtsPenalty,
    ).toBe(0));
  it("applies 20% on mutual agreement", () =>
    expect(
      calculateTermination({ ...base, type: "mutual_agreement" }).fgtsPenalty,
    ).toBe(2000));
  it("produces coherent totals", () => {
    const c = calculateTermination({
      ...base,
      type: "dismissal_without_cause",
    });
    expect(c.net).toBe(c.gross - c.deductions);
    expect(c.gross).toBeGreaterThan(0);
  });
});
