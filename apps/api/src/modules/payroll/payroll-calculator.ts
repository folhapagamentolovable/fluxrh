export type PayrollInput = {
  salary: number;
  overtime50Hours: number;
  overtime100Hours: number;
  nightHours: number;
  absenceDays: number;
  hazardRate?: number;
  workingDays?: number;
  restDays?: number;
  inssTable?: InssTable;
  irrfTable?: IrrfTable;
  fgtsRate?: number;
};
export type LegalBracket = { from: number; to: number | null; rate: number; deduction: number };
export type InssTable = { brackets: LegalBracket[]; ceiling: number };
export type IrrfTable = {
  brackets: LegalBracket[];
  simplifiedDeduction: number;
  monthlyReduction?: { zeroUntil: number; linearUntil: number; maximum: number; intercept: number; factor: number } | null;
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
export const defaultInss2026: InssTable = {
  brackets: [
    { from: 0, to: 1621, rate: 7.5, deduction: 0 },
    { from: 1621.01, to: 2902.84, rate: 9, deduction: 24.32 },
    { from: 2902.85, to: 4354.27, rate: 12, deduction: 111.4 },
    { from: 4354.28, to: 8475.55, rate: 14, deduction: 198.49 },
  ],
  ceiling: 988.09,
};
export const defaultIrrf2026: IrrfTable = {
  brackets: [
    { from: 0, to: 2428.8, rate: 0, deduction: 0 },
    { from: 2428.81, to: 2826.65, rate: 7.5, deduction: 182.16 },
    { from: 2826.66, to: 3751.05, rate: 15, deduction: 394.16 },
    { from: 3751.06, to: 4664.68, rate: 22.5, deduction: 675.49 },
    { from: 4664.69, to: null, rate: 27.5, deduction: 908.73 },
  ],
  simplifiedDeduction: 607.2,
  monthlyReduction: { zeroUntil: 5000, linearUntil: 7350, maximum: 312.89, intercept: 978.62, factor: 0.133145 },
};
export function calculateInss(base: number, table = defaultInss2026) {
  let total = 0,
    previous = 0;
  for (const bracket of table.brackets) {
    const limit = bracket.to ?? Number.POSITIVE_INFINITY;
    const rate = bracket.rate / 100;
    const taxable = Math.max(0, Math.min(base, limit) - previous);
    total += round(taxable * rate);
    previous = limit;
    if (base <= limit) break;
  }
  return round(Math.min(total, table.ceiling));
}
export function calculateIrrf(base: number, taxableIncome = base, table = defaultIrrf2026) {
  const bracket = [...table.brackets].reverse().find((value) => base >= value.from);
  const tax = bracket ? base * (bracket.rate / 100) - bracket.deduction : 0;
  const rule = table.monthlyReduction;
  const reduction = rule && taxableIncome <= rule.zeroUntil
    ? Math.min(Math.max(0, tax), rule.maximum)
    : rule && taxableIncome <= rule.linearUntil
      ? Math.max(0, rule.intercept - rule.factor * taxableIncome)
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
  const inss = calculateInss(gross, input.inssTable),
    irrfTable = input.irrfTable ?? defaultIrrf2026,
    irrfDeduction = Math.max(inss, irrfTable.simplifiedDeduction),
    irrf = calculateIrrf(Math.max(0, gross - irrfDeduction), gross, irrfTable);
  const fgts = round(gross * (input.fgtsRate ?? 0.08));
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
