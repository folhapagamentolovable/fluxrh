import type {
  PayrollEmployee,
  PayrollOverview,
  PayrollRun,
} from "@fluxrh/contracts";
import { calculatePayroll } from "./payroll-calculator.js";
const event = (
  id: string,
  code: string,
  name: string,
  kind: "earning" | "deduction" | "informational",
  category: PayrollEmployee["events"][number]["category"],
  quantity: number,
  reference: string,
  amount: number,
) => ({
  id,
  code,
  name,
  kind,
  category,
  quantity,
  reference,
  amount,
  automatic: true,
});
function employee(
  id: string,
  name: string,
  registration: string,
  position: string,
  departmentName: string,
  salary: number,
  input: Parameters<typeof calculatePayroll>[0],
  exception?: {
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
  },
) {
  const c = calculatePayroll(input);
  const events = [
    event(
      `${id}_sal`,
      `1001`,
      `Salário mensal`,
      `earning`,
      `salary`,
      30,
      "30 dias",
      salary,
    ),
    ...(c.overtime50
      ? [
          event(
            `${id}_he50`,
            `1101`,
            `Horas extras 50%`,
            `earning`,
            `overtime`,
            input.overtime50Hours,
            `${input.overtime50Hours}h`,
            c.overtime50,
          ),
        ]
      : []),
    ...(c.overtime100
      ? [
          event(
            `${id}_he100`,
            `1102`,
            `Horas extras 100%`,
            `earning`,
            `overtime`,
            input.overtime100Hours,
            `${input.overtime100Hours}h`,
            c.overtime100,
          ),
        ]
      : []),
    ...(c.night
      ? [
          event(
            `${id}_night`,
            `1201`,
            `Adicional noturno`,
            `earning`,
            `additional`,
            input.nightHours,
            `${input.nightHours}h`,
            c.night,
          ),
        ]
      : []),
    ...(c.hazard
      ? [
          event(
            `${id}_hazard`,
            `1202`,
            `Periculosidade`,
            `earning`,
            `additional`,
            30,
            "30%",
            c.hazard,
          ),
        ]
      : []),
    ...(c.absence
      ? [
          event(
            `${id}_absence`,
            `2001`,
            `Faltas`,
            `deduction`,
            `absence`,
            input.absenceDays,
            `${input.absenceDays} dia(s)`,
            c.absence,
          ),
        ]
      : []),
    event(
      `${id}_inss`,
      `2101`,
      `INSS`,
      `deduction`,
      `tax`,
      1,
      "Tabela progressiva",
      c.inss,
    ),
    ...(c.irrf
      ? [
          event(
            `${id}_irrf`,
            `2102`,
            `IRRF`,
            `deduction`,
            `tax`,
            1,
            "Base após INSS",
            c.irrf,
          ),
        ]
      : []),
    event(
      `${id}_fgts`,
      `9001`,
      `FGTS empresa`,
      `informational`,
      `tax`,
      1,
      "8%",
      c.fgts,
    ),
  ];
  return {
    id: `pay_${id}`,
    employeeId: id,
    employeeName: name,
    registration,
    position,
    departmentName,
    baseSalary: salary,
    grossPay: c.gross,
    deductions: Math.round((c.inss + c.irrf + c.absence) * 100) / 100,
    netPay: c.net,
    employerCharges: c.fgts,
    status: exception ? ("exception" as const) : ("pending" as const),
    events,
    exceptions: exception
      ? [
          {
            id: `pex_${id}`,
            title: exception.title,
            description: exception.description,
            severity: exception.severity,
            status: "open" as const,
          },
        ]
      : [],
  };
}
const employees: PayrollEmployee[] = [
  employee(
    "emp_carlos",
    "Carlos Mendes",
    "00042",
    "Supervisor Operacional",
    "Operações",
    5200,
    {
      salary: 5200,
      overtime50Hours: 8,
      overtime100Hours: 11,
      nightHours: 18,
      absenceDays: 0,
      hazardRate: 0.3,
    },
    {
      title: "Horas extras acima do padrão",
      description: "19h no mês, 82% acima da média dos últimos três meses.",
      severity: "high",
    },
  ),
  employee(
    "emp_marina",
    "Marina Souza",
    "00018",
    "Analista de RH",
    "Pessoas",
    4800,
    {
      salary: 4800,
      overtime50Hours: 2,
      overtime100Hours: 0,
      nightHours: 0,
      absenceDays: 0,
    },
  ),
  employee(
    "emp_beatriz",
    "Beatriz Lima",
    "00061",
    "Assistente Administrativa",
    "Administrativo",
    2800,
    {
      salary: 2800,
      overtime50Hours: 0,
      overtime100Hours: 0,
      nightHours: 0,
      absenceDays: 1,
    },
    {
      title: "Falta sem justificativa",
      description: "Desconto de um dia originado pelo módulo de ausências.",
      severity: "critical",
    },
  ),
  employee(
    "emp_ana",
    "Ana Paula Rocha",
    "00035",
    "Coordenadora Financeira",
    "Financeiro",
    6800,
    {
      salary: 6800,
      overtime50Hours: 0,
      overtime100Hours: 0,
      nightHours: 0,
      absenceDays: 0,
    },
  ),
];
const sum = () => ({
  grossTotal:
    Math.round(employees.reduce((s, e) => s + e.grossPay, 0) * 100) / 100,
  deductionsTotal:
    Math.round(employees.reduce((s, e) => s + e.deductions, 0) * 100) / 100,
  netTotal: Math.round(employees.reduce((s, e) => s + e.netPay, 0) * 100) / 100,
  employerChargesTotal:
    Math.round(employees.reduce((s, e) => s + e.employerCharges, 0) * 100) /
    100,
});
const run: PayrollRun = {
  id: "run_2026_08",
  companyName: "Grupo Flux",
  competence: "2026-08",
  status: "review",
  employeesCount: employees.length,
  processedCount: employees.length,
  exceptionsCount: employees.filter((e) => e.status === "exception").length,
  ...sum(),
  updatedAt: new Date().toISOString(),
  employees,
};
export const payrollLegalTables: PayrollOverview["legalTables"] = [
  {
    id: "inss_2026",
    name: "INSS",
    effectiveFrom: "2026-01-01",
    version: 1,
    status: "active",
    updatedAt: "2026-01-13",
    brackets: [
      { from: 0, to: 1621, rate: 7.5, deduction: 0 },
      { from: 1621.01, to: 2902.84, rate: 9, deduction: 24.32 },
      { from: 2902.85, to: 4354.27, rate: 12, deduction: 111.4 },
      { from: 4354.28, to: 8475.55, rate: 14, deduction: 198.49 },
    ],
  },
  {
    id: "irrf_2026",
    name: "IRRF",
    effectiveFrom: "2026-01-01",
    version: 3,
    status: "active",
    updatedAt: "2026-04-27",
    brackets: [
      { from: 0, to: 2428.8, rate: 0, deduction: 0 },
      { from: 2428.81, to: 2826.65, rate: 7.5, deduction: 182.16 },
      { from: 2826.66, to: 3751.05, rate: 15, deduction: 394.16 },
      { from: 3751.06, to: 4664.68, rate: 22.5, deduction: 675.49 },
      { from: 4664.69, to: null, rate: 27.5, deduction: 908.73 },
    ],
  },
];
export const payrollCatalog: PayrollOverview["catalog"] = [
  {
    code: "1001",
    name: "Salário mensal",
    kind: "earning",
    calculation: "Salário ÷ 30 × dias",
    incidences: ["INSS", "FGTS", "IRRF"],
    active: true,
  },
  {
    code: "1101",
    name: "Horas extras 50%",
    kind: "earning",
    calculation: "Hora × 1,5 × quantidade",
    incidences: ["INSS", "FGTS", "IRRF"],
    active: true,
  },
  {
    code: "1102",
    name: "Horas extras 100%",
    kind: "earning",
    calculation: "Hora × 2 × quantidade",
    incidences: ["INSS", "FGTS", "IRRF"],
    active: true,
  },
  {
    code: "1201",
    name: "Adicional noturno",
    kind: "earning",
    calculation: "Hora × 20% × quantidade",
    incidences: ["INSS", "FGTS", "IRRF"],
    active: true,
  },
  {
    code: "2001",
    name: "Faltas",
    kind: "deduction",
    calculation: "Salário ÷ 30 × dias",
    incidences: ["INSS", "FGTS", "IRRF"],
    active: true,
  },
  {
    code: "2101",
    name: "INSS",
    kind: "deduction",
    calculation: "Tabela progressiva vigente",
    incidences: [],
    active: true,
  },
];
export class InMemoryPayrollRepository {
  hydrate(state: Record<string, unknown>) {
    const value = state as unknown as PayrollOverview;
    employees.splice(0, employees.length, ...structuredClone(value.run.employees));
    Object.assign(run, structuredClone(value.run), { employees });
    payrollLegalTables.splice(0, payrollLegalTables.length, ...structuredClone(value.legalTables));
    payrollCatalog.splice(0, payrollCatalog.length, ...structuredClone(value.catalog));
  }

  async overview(): Promise<PayrollOverview> {
    run.exceptionsCount = employees.filter(
      (e) => e.status === "exception",
    ).length;
    return structuredClone({
      summary: {
        activeRun: true,
        employees: employees.length,
        grossTotal: run.grossTotal,
        netTotal: run.netTotal,
        openExceptions: run.exceptionsCount,
        closingProgress: Math.round(
          (employees.filter((e) => e.status === "approved").length /
            employees.length) *
            100,
        ),
      },
      run,
      legalTables: payrollLegalTables,
      catalog: payrollCatalog,
      history: [
        {
          id: "run_2026_07",
          companyName: "Grupo Flux",
          competence: "2026-07",
          status: "closed",
          employeesCount: 4,
          processedCount: 4,
          exceptionsCount: 0,
          grossTotal: 22640,
          deductionsTotal: 3912.44,
          netTotal: 18727.56,
          employerChargesTotal: 1811.2,
          updatedAt: "2026-08-05T18:00:00Z",
        },
      ],
    });
  }
  async resolve(employeeId: string, exceptionId: string, _note?: string) {
    const e = employees.find((x) => x.employeeId === employeeId),
      ex = e?.exceptions.find((x) => x.id === exceptionId);
    if (!e || !ex) return undefined;
    ex.status = "resolved";
    e.status = "pending";
    return structuredClone(e);
  }
  async approve(employeeId: string) {
    const e = employees.find((x) => x.employeeId === employeeId);
    if (!e || e.exceptions.some((x) => x.status === "open")) return undefined;
    e.status = "approved";
    return structuredClone(e);
  }
  async close() {
    if (employees.some((e) => e.status !== "approved"))
      return { error: "employees_pending" as const };
    run.status = "closed";
    return { data: structuredClone(run) };
  }
}
