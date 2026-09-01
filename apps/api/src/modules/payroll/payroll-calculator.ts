export type PayrollInput = {
  salary: number;
  overtime50Hours: number;
  overtime100Hours: number;
  nightHours: number;
  absenceDays: number;
  hazardRate?: number;
  workingDays?: number;
  restDays?: number;
};
const round = (n: number) => Math.round(n * 100 + 1e-9) / 100;
export function competenceCalendar(competence: string, holidayDates: string[] = []) {
  const [year, month] = competence.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  const rests = new Set(holidayDates.filter((date) => date.startsWith(`${competence}-`)));
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year!, month! - 1, day));
    if (date.getUTCDay() === 0) rests.add(date.toISOString().slice(0, 10));
  }
  return { workingDays: daysInMonth - rests.size, restDays: rests.size };
}
export function calculateInss(base: number) {
  const brackets = [
    [1621, 0.075],
    [2902.84, 0.09],
    [4354.27, 0.12],
    [8475.55, 0.14],
  ] as const;
  let total = 0,
    previous = 0;
  for (const [limit, rate] of brackets) {
    const taxable = Math.max(0, Math.min(base, limit) - previous);
    total += round(taxable * rate);
    previous = limit;
    if (base <= limit) break;
  }
  return round(Math.min(total, 988.09));
}
export function calculateIrrf(base: number, taxableIncome = base) {
  let tax = 0;
  if (base > 4664.68) tax = base * 0.275 - 908.73;
  else if (base > 3751.05) tax = base * 0.225 - 675.49;
  else if (base > 2826.65) tax = base * 0.15 - 394.16;
  else if (base > 2428.8) tax = base * 0.075 - 182.16;
  const reduction = taxableIncome <= 5000
    ? Math.min(Math.max(0, tax), 312.89)
    : taxableIncome <= 7350
      ? Math.max(0, 978.62 - 0.133145 * taxableIncome)
      : 0;
  return round(Math.max(0, tax - reduction));
}
export function calculatePayroll(input: PayrollInput) {
  const hourly = input.salary / 220;
  const overtime50 = round(hourly * 1.5 * input.overtime50Hours),
    overtime100 = round(hourly * 2 * input.overtime100Hours),
    night = round(hourly * 0.2 * input.nightHours),
    absence = round((input.salary / 30) * input.absenceDays),
    hazard = round(input.salary * (input.hazardRate ?? 0));
  const variableEarnings = round(overtime50 + overtime100 + night);
  const dsr = input.workingDays && input.restDays
    ? round((variableEarnings / input.workingDays) * input.restDays)
    : 0;
  const gross = round(input.salary + variableEarnings + dsr + hazard);
  const inss = calculateInss(gross),
    irrfDeduction = Math.max(inss, 607.2),
    irrf = calculateIrrf(Math.max(0, gross - irrfDeduction), gross);
  const fgts = round(gross * 0.08);
  return {
    hourly,
    overtime50,
    overtime100,
    night,
    dsr,
    absence,
    hazard,
    gross,
    inss,
    irrf,
    fgts,
    net: round(gross - inss - irrf - absence),
  };
}
