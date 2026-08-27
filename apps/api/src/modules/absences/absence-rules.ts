export function inclusiveDays(startDate: string, endDate: string) {
  return (
    Math.floor(
      (Date.parse(`${endDate}T12:00:00Z`) -
        Date.parse(`${startDate}T12:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}
export function validateVacation(
  balance: number,
  startDate: string,
  endDate: string,
  soldDays: number,
) {
  const days = inclusiveDays(startDate, endDate);
  if (days <= 0) return { ok: false, error: "invalid_period" as const, days };
  if (days + soldDays > balance)
    return { ok: false, error: "insufficient_balance" as const, days };
  return { ok: true as const, days };
}
