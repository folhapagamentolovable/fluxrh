import { describe, expect, it } from "vitest";
import { formatCnpj, isValidCnpj } from "./cnpj";

describe("CNPJ", () => {
  it("applies the official mask while typing", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatCnpj("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
  });

  it("accepts valid formatted and unformatted values", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejects invalid check digits, incomplete values and repeated digits", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("11.222.333/0001")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
  });
});
