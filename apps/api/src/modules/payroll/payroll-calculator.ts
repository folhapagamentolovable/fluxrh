export type PayrollInput = {
  salary: number;
  overtime50Hours: number;
  overtime100Hours: number;
  nightHours: number;
  absenceDays: number;
  hazardRate?: number;
};
const round = (n: number) => Math.round(n * 100) / 100;
export function calculateInss(base: number) {
  const brackets = [
    [1518, 0.075],
    [2793.88, 0.09],
    [4190.83, 0.12],
    [8157.41, 0.14],
  ] as const;
  let total = 0,
    previous = 0;
  for (const [limit, rate] of brackets) {
    const taxable = Math.max(0, Math.min(base, limit) - previous);
    total += taxable * rate;
    previous = limit;
    if (base <= limit) break;
  }
  return round(Math.min(total, 951.63));
}
export function calculateIrrf(base: number) {
  if (base <= 2428.8) return 0;
  if (base <= 2826.65) return round(base * 0.075 - 182.16);
  if (base <= 3751.05) return round(base * 0.15 - 394.16);
  if (base <= 4664.68) return round(base * 0.225 - 675.49);
  return round(base * 0.275 - 908.73);
}
export function calculatePayroll(input: PayrollInput) {
  const hourly = input.salary / 220;
  const overtime50 = round(hourly * 1.5 * input.overtime50Hours),
    overtime100 = round(hourly * 2 * input.overtime100Hours),
    night = round(hourly * 0.2 * input.nightHours),
    absence = round((input.salary / 30) * input.absenceDays),
    hazard = round(input.salary * (input.hazardRate ?? 0));
  const gross = round(input.salary + overtime50 + overtime100 + night + hazard);
  const inss = calculateInss(gross),
    irrf = calculateIrrf(Math.max(0, gross - inss));
  const fgts = round(gross * 0.08);
  return {
    hourly,
    overtime50,
    overtime100,
    night,
    absence,
    hazard,
    gross,
    inss,
    irrf,
    fgts,
    net: round(gross - inss - irrf - absence),
  };
}
