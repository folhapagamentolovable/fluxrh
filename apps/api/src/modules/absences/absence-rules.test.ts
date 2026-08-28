import { describe, expect, it } from "vitest";
import { inclusiveDays, validateVacation } from "./absence-rules.js";
describe("absence rules", () => {
  it("counts vacation dates inclusively", () =>
    expect(inclusiveDays("2026-09-01", "2026-09-20")).toBe(20));
  it("rejects a request above the available balance", () =>
    expect(validateVacation(20, "2026-09-01", "2026-09-20", 10)).toEqual({
      ok: false,
      error: "insufficient_balance",
      days: 20,
    }));
  it("accepts a request within the balance", () =>
    expect(validateVacation(30, "2026-09-01", "2026-09-20", 10)).toEqual({
      ok: true,
      days: 20,
    }));
});
