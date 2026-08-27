export type TerminationCalculationInput = {
  baseSalary: number;
  averageVariables: number;
  balanceDays: number;
  vacationDuePeriods: number;
  proportionalVacationTwelfths: number;
  thirteenthTwelfths: number;
  noticeType: "worked" | "indemnified" | "waived" | "not_applicable";
  noticeDays: number;
  type:
    | "resignation"
    | "dismissal_without_cause"
    | "dismissal_for_cause"
    | "fixed_term_end"
    | "mutual_agreement";
  fgtsBalance: number;
};
const round = (value: number) => Math.round(value * 100) / 100;
export function calculateTermination(input: TerminationCalculationInput) {
  const base = input.baseSalary + input.averageVariables;
  const salaryBalance = round((base / 30) * input.balanceDays);
  const notice = round(
    input.noticeType === "indemnified" ? (base / 30) * input.noticeDays : 0,
  );
  const dueVacation = round((base * input.vacationDuePeriods * 4) / 3);
  const proportionalVacation = round(
    (((base * input.proportionalVacationTwelfths) / 12) * 4) / 3,
  );
  const thirteenth = round((base * input.thirteenthTwelfths) / 12);
  const gross = round(
    salaryBalance + notice + dueVacation + proportionalVacation + thirteenth,
  );
  const inss = round(Math.min((salaryBalance + thirteenth) * 0.11, 951.63));
  const irrf = round(
    Math.max(0, (salaryBalance + thirteenth - inss - 2428.8) * 0.15),
  );
  const deductions = round(inss + irrf);
  const penaltyRate =
    input.type === "dismissal_without_cause"
      ? 0.4
      : input.type === "mutual_agreement"
        ? 0.2
        : 0;
  const fgtsPenalty = round(input.fgtsBalance * penaltyRate);
  return {
    salaryBalance,
    notice,
    dueVacation,
    proportionalVacation,
    thirteenth,
    inss,
    irrf,
    gross,
    deductions,
    net: round(gross - deductions),
    fgtsPenalty,
  };
}
