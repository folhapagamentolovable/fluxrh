import { describe, expect, it } from "vitest";
import { brazilianToIsoDate, formatBrazilianCompetence, isoToBrazilianDate, maskBrazilianDate } from "./date";

describe("Brazilian dates", () => {
  it("masks and converts valid dates without changing the persisted ISO value", () => {
    expect(maskBrazilianDate("29022024")).toBe("29/02/2024");
    expect(brazilianToIsoDate("29/02/2024")).toBe("2024-02-29");
    expect(isoToBrazilianDate("2026-09-01")).toBe("01/09/2026");
    expect(formatBrazilianCompetence("2026-09")).toBe("09/2026");
  });

  it("rejects impossible dates", () => {
    expect(brazilianToIsoDate("31/02/2026")).toBeNull();
    expect(brazilianToIsoDate("29/02/2025")).toBeNull();
  });
});
