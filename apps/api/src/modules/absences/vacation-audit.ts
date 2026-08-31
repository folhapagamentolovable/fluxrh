import { inclusiveDays } from "./absence-rules.js";

const round = (value: number) => Math.round(value * 100) / 100;
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

export type VacationAuditInput = {
  hireDate: string;
  acquisitionStart: string;
  acquisitionEnd: string;
  concessionDeadline: string;
  vacationStart: string;
  vacationEnd: string;
  monthlySalary: number;
  averageVariables?: number;
  earnedDays: number;
  soldDays?: number;
};

/** Reproduz a memória legal mínima; incidências tributárias são auditadas separadamente. */
export function auditVacation(input: VacationAuditInput) {
  const vacationDays = inclusiveDays(input.vacationStart, input.vacationEnd);
  const soldDays = input.soldDays ?? 0;
  const remunerationBase = round(input.monthlySalary + (input.averageVariables ?? 0));
  const vacationRemuneration = round((remunerationBase / 30) * vacationDays);
  const constitutionalThird = round(vacationRemuneration / 3);
  const paymentDeadlineDate = new Date(`${input.vacationStart}T12:00:00Z`);
  paymentDeadlineDate.setUTCDate(paymentDeadlineDate.getUTCDate() - 2);
  const returnDate = new Date(`${input.vacationEnd}T12:00:00Z`);
  returnDate.setUTCDate(returnDate.getUTCDate() + 1);

  const findings: string[] = [];
  if (input.acquisitionStart !== input.hireDate)
    findings.push("acquisition_start_differs_from_hire_date");
  if (input.vacationStart <= input.acquisitionEnd)
    findings.push("vacation_before_acquisition_completed");
  if (input.vacationEnd > input.concessionDeadline)
    findings.push("vacation_after_concession_deadline");
  if (vacationDays + soldDays > input.earnedDays)
    findings.push("vacation_days_exceed_entitlement");
  if (vacationDays <= 0 || vacationDays > 30)
    findings.push("invalid_vacation_duration");
  if (soldDays > Math.floor(input.earnedDays / 3))
    findings.push("sold_days_exceed_one_third");

  return {
    vacationDays,
    returnDate: isoDate(returnDate),
    paymentDeadline: isoDate(paymentDeadlineDate),
    remunerationBase,
    vacationRemuneration,
    constitutionalThird,
    grossVacation: round(vacationRemuneration + constitutionalThird),
    acquisitionCompliant: input.vacationStart > input.acquisitionEnd,
    concessionCompliant: input.vacationEnd <= input.concessionDeadline,
    entitlementCompliant: vacationDays + soldDays <= input.earnedDays,
    findings,
  };
}
