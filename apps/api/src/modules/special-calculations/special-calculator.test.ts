import { describe, expect, it } from "vitest";
import {
  calculateThirteenth,
  calculateVacation,
} from "./special-calculator.js";
describe("special calculations", () => {
  it("calculates proportional first installment without taxes", () =>
    expect(
      calculateThirteenth({
        salary: 3600,
        average: 0,
        twelfths: 6,
        installment: 1,
      }),
    ).toMatchObject({ base: 1800, gross: 900, inss: 0, irrf: 0, net: 900 }));
  it("deducts the first installment in the second installment", () => {
    const value = calculateThirteenth({
      salary: 3600,
      average: 0,
      twelfths: 12,
      installment: 2,
      firstPaid: 1800,
    });
    expect(value.firstDeduction).toBe(1800);
    expect(value.net).toBeLessThan(1800);
  });
  it("calculates vacation third, sold days and advance", () => {
    const value = calculateVacation({
      salary: 3000,
      average: 0,
      days: 20,
      soldDays: 10,
      advanceThirteenth: true,
    });
    expect(value.vacation).toBe(2000);
    expect(value.sold).toBe(1000);
    expect(value.thirteenthAdvance).toBe(1500);
    expect(value.net).toBeGreaterThan(0);
  });
});
