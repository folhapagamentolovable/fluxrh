import type {
  AnalyticsFilter,
  AnalyticsOverview,
  GenerateReportInput,
  ReportRun,
} from "@fluxrh/contracts";
const baseTrend: AnalyticsOverview["trend"] = [
  {
    period: "Mar",
    headcount: 72,
    hires: 4,
    terminations: 1,
    absenteeismRate: 2.8,
    payrollCost: 286400,
    automationRate: 76,
  },
  {
    period: "Abr",
    headcount: 75,
    hires: 5,
    terminations: 2,
    absenteeismRate: 3.1,
    payrollCost: 298900,
    automationRate: 79,
  },
  {
    period: "Mai",
    headcount: 77,
    hires: 3,
    terminations: 1,
    absenteeismRate: 2.5,
    payrollCost: 306200,
    automationRate: 82,
  },
  {
    period: "Jun",
    headcount: 79,
    hires: 4,
    terminations: 2,
    absenteeismRate: 2.2,
    payrollCost: 314800,
    automationRate: 85,
  },
  {
    period: "Jul",
    headcount: 82,
    hires: 5,
    terminations: 2,
    absenteeismRate: 2.7,
    payrollCost: 329100,
    automationRate: 88,
  },
  {
    period: "Ago",
    headcount: 84,
    hires: 4,
    terminations: 2,
    absenteeismRate: 2.1,
    payrollCost: 338740,
    automationRate: 91,
  },
];
const departments: AnalyticsOverview["departments"] = [
  {
    id: "dept_ops",
    name: "Operações",
    headcount: 36,
    payrollCost: 132480,
    absenceHours: 54,
    overtimeHours: 186,
    openExceptions: 4,
    automationRate: 88,
  },
  {
    id: "dept_people",
    name: "Pessoas e Cultura",
    headcount: 8,
    payrollCost: 42600,
    absenceHours: 8,
    overtimeHours: 12,
    openExceptions: 1,
    automationRate: 96,
  },
  {
    id: "dept_admin",
    name: "Administrativo",
    headcount: 14,
    payrollCost: 68400,
    absenceHours: 18,
    overtimeHours: 24,
    openExceptions: 2,
    automationRate: 93,
  },
  {
    id: "dept_commercial",
    name: "Comercial",
    headcount: 18,
    payrollCost: 76960,
    absenceHours: 21,
    overtimeHours: 38,
    openExceptions: 0,
    automationRate: 92,
  },
  {
    id: "dept_it",
    name: "Tecnologia",
    headcount: 8,
    payrollCost: 72800,
    absenceHours: 6,
    overtimeHours: 16,
    openExceptions: 0,
    automationRate: 95,
  },
];
const reports: AnalyticsOverview["reports"] = [
  {
    id: "rep_headcount",
    name: "Quadro de colaboradores",
    description: "Vínculos, cargos, lotações e situação atual.",
    category: "people",
    formats: ["csv", "pdf"],
    lastGeneratedAt: "2026-08-20T14:10:00.000Z",
    scheduled: false,
  },
  {
    id: "rep_time",
    name: "Jornada e banco de horas",
    description: "Horas previstas, realizadas, extras e saldo.",
    category: "time",
    formats: ["csv", "pdf"],
    lastGeneratedAt: "2026-08-25T18:00:00.000Z",
    scheduled: true,
  },
  {
    id: "rep_absence",
    name: "Férias e absenteísmo",
    description: "Períodos, ocorrências e indicadores por área.",
    category: "absence",
    formats: ["csv", "pdf"],
    scheduled: false,
  },
  {
    id: "rep_payroll",
    name: "Resumo da folha",
    description: "Proventos, descontos, encargos e custo por centro.",
    category: "payroll",
    formats: ["csv", "pdf"],
    lastGeneratedAt: "2026-08-25T20:30:00.000Z",
    scheduled: true,
  },
  {
    id: "rep_automation",
    name: "Eficiência operacional",
    description: "Ações automáticas, exceções e tempo economizado.",
    category: "automation",
    formats: ["csv", "pdf"],
    scheduled: false,
  },
];
const runs: ReportRun[] = [
  {
    id: "run_1",
    reportId: "rep_payroll",
    reportName: "Resumo da folha",
    format: "pdf",
    status: "ready",
    requestedAt: "2026-08-25T20:29:00.000Z",
    completedAt: "2026-08-25T20:30:00.000Z",
    fileName: "resumo-folha-2026-08.pdf",
    rows: 84,
  },
];
export class InMemoryAnalyticsRepository {
  hydrate(state: Record<string, unknown>) {
    const value = state as unknown as AnalyticsOverview;
    baseTrend.splice(0, baseTrend.length, ...structuredClone(value.trend));
    departments.splice(0, departments.length, ...structuredClone(value.departments));
    reports.splice(0, reports.length, ...structuredClone(value.reports));
    runs.splice(0, runs.length, ...structuredClone(value.runs));
  }

  async overview(filter: AnalyticsFilter = {}): Promise<AnalyticsOverview> {
    const selected =
      filter.departmentId && filter.departmentId !== "all"
        ? departments.filter((x) => x.id === filter.departmentId)
        : departments;
    const ratio =
      selected.reduce((s, x) => s + x.headcount, 0) /
      departments.reduce((s, x) => s + x.headcount, 0);
    const trend = baseTrend.map((x) => ({
      ...x,
      headcount: Math.round(x.headcount * ratio),
      hires: Math.round(x.hires * ratio),
      terminations: Math.round(x.terminations * ratio),
      payrollCost: Math.round(x.payrollCost * ratio),
    }));
    const last = trend.at(-1)!;
    return structuredClone({
      filters: {
        companies: [
          { id: "all", name: "Todas as empresas" },
          { id: "company_flux", name: "Flux Serviços Ltda." },
          { id: "company_guard", name: "Guard Facilities Ltda." },
        ],
        departments: [
          { id: "all", name: "Todos os departamentos" },
          ...departments.map(({ id, name }) => ({ id, name })),
        ],
        selectedCompanyId: filter.companyId ?? "all",
        selectedDepartmentId: filter.departmentId ?? "all",
        period: filter.period ?? "6m",
      },
      summary: {
        headcount: last.headcount,
        headcountChange: 2.4,
        turnoverRate: 2.3,
        turnoverChange: -0.4,
        absenteeismRate: last.absenteeismRate,
        absenteeismChange: -0.6,
        monthlyPayrollCost: last.payrollCost,
        payrollChange: 2.9,
        automationRate: last.automationRate,
        automationChange: 3,
        openExceptions: selected.reduce((s, x) => s + x.openExceptions, 0),
      },
      trend,
      departments: selected,
      insights: [
        {
          id: "ins_1",
          title: "Absenteísmo em queda",
          description: "A taxa caiu pelo segundo mês consecutivo.",
          severity: "positive",
          metric: "−0,6 p.p.",
          change: -0.6,
          recommendation: "Manter o acompanhamento das ações preventivas.",
          source: "Férias e ausências",
        },
        {
          id: "ins_2",
          title: "Horas extras concentradas",
          description: "Operações responde por 67% das horas extras do mês.",
          severity: "attention",
          metric: "186h",
          change: 12,
          recommendation:
            "Revisar escala e cobertura dos postos com maior recorrência.",
          source: "Jornada",
        },
        {
          id: "ins_3",
          title: "Automação avançou",
          description: "91% das ações foram concluídas sem intervenção humana.",
          severity: "positive",
          metric: "+3 p.p.",
          change: 3,
          recommendation:
            "Automatizar a validação das exceções de baixa criticidade.",
          source: "Workflows",
        },
      ],
      reports,
      runs,
    });
  }
  async generate(input: GenerateReportInput) {
    const report = reports.find((x) => x.id === input.reportId);
    if (!report) return;
    const value: ReportRun = {
      id: `run_${crypto.randomUUID()}`,
      reportId: report.id,
      reportName: report.name,
      format: input.format,
      status: "ready",
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      fileName: `${report.id}-${input.period ?? "6m"}.${input.format}`,
      rows: report.id === "rep_headcount" ? 84 : departments.length,
    };
    runs.unshift(value);
    report.lastGeneratedAt = value.completedAt;
    return structuredClone(value);
  }
}
