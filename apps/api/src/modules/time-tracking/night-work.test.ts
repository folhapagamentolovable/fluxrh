import { describe, expect, it } from "vitest";
import { auditNightShift, calculateNightWork, scheduledWorkMinutes } from "./night-work.js";

describe("urban night work", () => {
  const aud0001Intervals = [
    { start: "2026-08-31T18:00:00-03:00", end: "2026-08-31T22:00:00-03:00" },
    { start: "2026-08-31T23:00:00-03:00", end: "2026-09-01T06:00:00-03:00" },
  ];

  it("calculates an overnight schedule instead of returning zero", () =>
    expect(scheduledWorkMinutes("18:00", "06:00", 60)).toBe(660));

  it("converts 6 clock hours into reduced night hours and separates the 5h extension", () => {
    expect(calculateNightWork(aud0001Intervals)).toEqual({
      nightClockMinutes: 360,
      reducedNightHours: 6.857143,
      extensionMinutes: 60,
      extensionHours: 1,
      payableNightHours: 7.857143,
    });
  });

  it("reproduces AUD-0001 statutory minimum per worked shift", () => {
    expect(auditNightShift({ intervals: aud0001Intervals, monthlySalary: 2091.57 })).toMatchObject({
      divisor: 220,
      additionalRate: 0.2,
      hourlyRate: 9.507136,
      nightAdditionalPerShift: 14.94,
    });
  });
});
