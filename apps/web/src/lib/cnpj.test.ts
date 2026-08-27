import { describe, expect, it } from "vitest";
import { formatCnpj, formatCpf, formatPhone, isValidCnpj, isValidCpf, isValidPhone, normalizeDigits } from "./cnpj";

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

describe("CPF e telefone", () => {
  it("formats and validates CPF", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("formats landline and mobile phone numbers", () => {
    expect(formatPhone("1132345678")).toBe("(11) 3234-5678");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(isValidPhone("(11) 3234-5678")).toBe(true);
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("(11) 123-456")).toBe(false);
  });

  it("normalizes formatted values for persistence", () => {
    expect(normalizeDigits("(11) 98765-4321")).toBe("11987654321");
    expect(normalizeDigits("529.982.247-25")).toBe("52998224725");
  });
});

