import type {
  CreateSpecialCalculationInput,
  SpecialCalculation,
  SpecialCalculationsOverview,
} from "@fluxrh/contracts";
import {
  calculateThirteenth,
  calculateVacation,
} from "./special-calculator.js";
const item = (
  code: string,
  name: string,
  kind: "earning" | "deduction" | "informational",
  reference: string,
  amount: number,
) => ({ code, name, kind, reference, amount });
function thirteenth(
  id: string,
  employeeId: string,
  employeeName: string,
  salary: number,
  average: number,
  twelfths: number,
  installment: 1 | 2,
  exception = false,
): SpecialCalculation {
  const c = calculateThirteenth({ salary, average, twelfths, installment });
  return {
    id,
    employeeId,
    employeeName,
    type: installment === 1 ? "thirteenth_first" : "thirteenth_second",
    competence: installment === 1 ? "2026-11" : "2026-12",
    status: exception ? "exception" : "pending",
    baseSalary: salary,
    averageVariables: average,
    entitledTwelfths: twelfths,
    grossAmount: c.gross,
    deductions: c.inss + c.irrf + c.firstDeduction,
    netAmount: c.net,
    payrollStatus: "scheduled",
    receiptStatus: "pending",
    items: [
      item("1301", "13º salário", "earning", `${twelfths}/12 avos`, c.gross),
      ...(c.firstDeduction
        ? [
            item(
              "2303",
              "Adiantamento do 13º",
              "deduction",
              "1ª parcela",
              c.firstDeduction,
            ),
          ]
        : []),
      ...(c.inss
        ? [
            item(
              "2301",
              "INSS sobre 13º",
              "deduction",
              "Tabela progressiva",
              c.inss,
            ),
          ]
        : []),
      ...(c.irrf
        ? [
            item(
              "2302",
              "IRRF sobre 13º",
              "deduction",
              "Base exclusiva",
              c.irrf,
            ),
          ]
        : []),
    ],
    exceptions: exception
      ? [
          {
            id: `sce_${employeeId}`,
            title: "Avos requerem conferência",
            description:
              "Afastamento superior a 15 dias pode alterar os avos desta competência.",
            severity: "high",
            status: "open",
          },
        ]
      : [],
  };
}
function vacation(
  id: string,
  employeeId: string,
  employeeName: string,
  salary: number,
  average: number,
  days: number,
  soldDays: number,
  advance: boolean,
): SpecialCalculation {
  const c = calculateVacation({
    salary,
    average,
    days,
    soldDays,
    advanceThirteenth: advance,
  });
  return {
    id,
    employeeId,
    employeeName,
    type: "vacation",
    competence: "2026-09",
    status: "pending",
    baseSalary: salary,
    averageVariables: average,
    entitledTwelfths: 12,
    vacationDays: days,
    soldDays,
    advanceThirteenth: advance,
    grossAmount: c.gross,
    deductions: c.inss + c.irrf,
    netAmount: c.net,
    payrollStatus: "scheduled",
    receiptStatus: "generated",
    items: [
      item("1401", "Férias", "earning", `${days} dias`, c.vacation),
      item("1402", "1/3 constitucional", "earning", "33,33%", c.oneThird),
      ...(c.sold
        ? [
            item(
              "1403",
              "Abono pecuniário",
              "earning",
              `${soldDays} dias`,
              c.sold,
            ),
            item("1404", "1/3 sobre abono", "earning", "33,33%", c.soldThird),
          ]
        : []),
      ...(c.thirteenthAdvance
        ? [
            item(
              "1302",
              "Adiantamento do 13º",
              "earning",
              "50%",
              c.thirteenthAdvance,
            ),
          ]
        : []),
      item(
        "2401",
        "INSS sobre férias",
        "deduction",
        "Tabela progressiva",
        c.inss,
      ),
      ...(c.irrf
        ? [
            item(
              "2402",
              "IRRF sobre férias",
              "deduction",
              "Base exclusiva",
              c.irrf,
            ),
          ]
        : []),
    ],
    exceptions: [],
  };
}
const calculations: SpecialCalculation[] = [
  thirteenth("sc_1", "emp_carlos", "Carlos Mendes", 5200, 684.3, 12, 1),
  thirteenth("sc_2", "emp_marina", "Marina Souza", 4800, 142.8, 12, 1),
  thirteenth("sc_3", "emp_ana", "Ana Paula Rocha", 6800, 0, 7, 1, true),
  vacation("sc_4", "emp_beatriz", "Beatriz Lima", 2800, 90, 20, 10, true),
  vacation("sc_5", "emp_carlos", "Carlos Mendes", 5200, 684.3, 15, 0, false),
];
const averageHistory: SpecialCalculationsOverview["averageHistory"] = [
  {
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    months: 12,
    overtimeAverage: 512.4,
    additionalAverage: 171.9,
    totalAverage: 684.3,
  },
  {
    employeeId: "emp_marina",
    employeeName: "Marina Souza",
    months: 12,
    overtimeAverage: 142.8,
    additionalAverage: 0,
    totalAverage: 142.8,
  },
  {
    employeeId: "emp_beatriz",
    employeeName: "Beatriz Lima",
    months: 12,
    overtimeAverage: 90,
    additionalAverage: 0,
    totalAverage: 90,
  },
];
export class InMemorySpecialRepository {
  hydrate(state: Record<string, unknown>) {
    const value = state as unknown as SpecialCalculationsOverview;
    calculations.splice(0, calculations.length, ...structuredClone(value.calculations));
    averageHistory.splice(0, averageHistory.length, ...structuredClone(value.averageHistory));
  }

  async overview(): Promise<SpecialCalculationsOverview> {
    const open = calculations.reduce(
      (s, c) => s + c.exceptions.filter((e) => e.status === "open").length,
      0,
    );
    return structuredClone({
      summary: {
        thirteenthEmployees: calculations.filter((c) =>
          c.type.startsWith("thirteenth"),
        ).length,
        vacationsScheduled: calculations.filter((c) => c.type === "vacation")
          .length,
        grossTotal: calculations.reduce((s, c) => s + c.grossAmount, 0),
        netTotal: calculations.reduce((s, c) => s + c.netAmount, 0),
        openExceptions: open,
        approvalProgress: Math.round(
          (calculations.filter((c) => c.status === "approved").length /
            calculations.length) *
            100,
        ),
      },
      calculations,
      averageHistory,
      rules: [
        {
          id: "r1",
          name: "Avos do 13º",
          description: "Mês com 15 dias ou mais trabalhados gera 1/12.",
          active: true,
        },
        {
          id: "r2",
          name: "Média variável",
          description:
            "Média das horas extras e adicionais no período aplicável.",
          active: true,
        },
        {
          id: "r3",
          name: "Abono pecuniário",
          description: "Limitado a 1/3 do período de férias.",
          active: true,
        },
      ],
    });
  }
  async create(input: CreateSpecialCalculationInput) {
    const value =
      input.type === "vacation"
        ? vacation(
            `sc_${crypto.randomUUID()}`,
            input.employeeId,
            input.employeeName,
            input.baseSalary,
            input.averageVariables,
            input.vacationDays ?? 30,
            input.soldDays ?? 0,
            input.advanceThirteenth ?? false,
          )
        : thirteenth(
            `sc_${crypto.randomUUID()}`,
            input.employeeId,
            input.employeeName,
            input.baseSalary,
            input.averageVariables,
            input.entitledTwelfths,
            input.type === "thirteenth_first" ? 1 : 2,
          );
    calculations.unshift(value);
    return structuredClone(value);
  }
  async resolve(id: string, exceptionId: string) {
    const value = calculations.find((c) => c.id === id),
      ex = value?.exceptions.find((e) => e.id === exceptionId);
    if (!value || !ex) return undefined;
    ex.status = "resolved";
    value.status = "pending";
    return structuredClone(value);
  }
  async approve(id: string) {
    const value = calculations.find((c) => c.id === id);
    if (!value || value.exceptions.some((e) => e.status === "open"))
      return undefined;
    value.status = "approved";
    value.receiptStatus = "generated";
    return structuredClone(value);
  }
}
