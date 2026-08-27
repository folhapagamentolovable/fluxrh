export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePersonalData<T extends { cpf?: string; phone?: string; document?: string }>(input: T): T {
  return {
    ...input,
    ...(input.cpf !== undefined ? { cpf: normalizeDigits(input.cpf) } : {}),
    ...(input.phone !== undefined ? { phone: normalizeDigits(input.phone) } : {}),
    ...(input.document !== undefined ? { document: normalizeDigits(input.document) } : {}),
  };
}
