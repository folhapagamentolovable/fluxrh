import type {
  BenefitEnrollment,
  BenefitsOverview,
  CreateBenefitEnrollmentInput,
  CreateEmployeeMovementInput,
  EmployeeMovement,
} from "@fluxrh/contracts";
const plans: BenefitsOverview["plans"] = [
  {
    id: "bp_meal",
    name: "Vale-refeição",
    type: "meal",
    provider: "Cartão Flex",
    companyName: "Grupo Flux",
    eligibility: "Todos os colaboradores ativos",
    companyAmount: 660,
    employeeAmount: 33,
    payrollCode: "3101",
    active: true,
    enrolledCount: 148,
  },
  {
    id: "bp_transport",
    name: "Vale-transporte",
    type: "transport",
    provider: "Mobilidade SP",
    companyName: "Grupo Flux",
    eligibility: "Mediante solicitação",
    companyAmount: 286,
    employeeAmount: 168,
    payrollCode: "3102",
    active: true,
    enrolledCount: 89,
  },
  {
    id: "bp_health",
    name: "Plano de saúde",
    type: "health",
    provider: "Saúde Integral",
    companyName: "Grupo Flux",
    eligibility: "Após 30 dias da admissão",
    companyAmount: 438,
    employeeAmount: 82,
    payrollCode: "3103",
    active: true,
    enrolledCount: 121,
  },
  {
    id: "bp_dental",
    name: "Plano odontológico",
    type: "dental",
    provider: "Odonto Mais",
    companyName: "Grupo Flux",
    eligibility: "Opcional",
    companyAmount: 28,
    employeeAmount: 12,
    payrollCode: "3104",
    active: true,
    enrolledCount: 74,
  },
];
const enrollments: BenefitEnrollment[] = [
  {
    id: "be_1",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    planId: "bp_meal",
    planName: "Vale-refeição",
    startDate: "2025-01-08",
    status: "active",
    companyAmount: 660,
    employeeAmount: 33,
    payrollStatus: "scheduled",
    dependents: 0,
  },
  {
    id: "be_2",
    employeeId: "emp_marina",
    employeeName: "Marina Souza",
    planId: "bp_health",
    planName: "Plano de saúde",
    startDate: "2025-05-15",
    status: "active",
    companyAmount: 438,
    employeeAmount: 164,
    payrollStatus: "scheduled",
    dependents: 1,
  },
  {
    id: "be_3",
    employeeId: "emp_beatriz",
    employeeName: "Beatriz Lima",
    planId: "bp_transport",
    planName: "Vale-transporte",
    startDate: "2026-09-01",
    status: "pending",
    companyAmount: 286,
    employeeAmount: 168,
    payrollStatus: "pending",
    dependents: 0,
  },
];
const movements: EmployeeMovement[] = [
  {
    id: "mv_1",
    employeeId: "emp_marina",
    employeeName: "Marina Souza",
    type: "promotion",
    requestedAt: "2026-08-22T14:00:00Z",
    effectiveDate: "2026-09-01",
    status: "pending_hr",
    currentValue: "Analista de RH",
    newValue: "Analista Sênior de RH",
    currentSalary: 4800,
    newSalary: 5600,
    reason: "Promoção por evolução de escopo e desempenho",
    requestedBy: "Paulo Nunes",
    approvals: [
      {
        role: "Gestor",
        status: "approved",
        actor: "Paulo Nunes",
        decidedAt: "2026-08-22T16:00:00Z",
      },
      { role: "RH", status: "pending" },
    ],
    payrollImpact: "future",
    documentStatus: "pending",
  },
  {
    id: "mv_2",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    type: "salary_change",
    requestedAt: "2026-08-18T10:00:00Z",
    effectiveDate: "2026-08-01",
    status: "pending_hr",
    currentValue: "R$ 5.200,00",
    newValue: "R$ 5.550,00",
    currentSalary: 5200,
    newSalary: 5550,
    reason: "Ajuste salarial retroativo",
    requestedBy: "Fernanda Costa",
    approvals: [
      {
        role: "Gestor",
        status: "approved",
        actor: "Fernanda Costa",
        decidedAt: "2026-08-18T11:20:00Z",
      },
      { role: "RH", status: "pending" },
    ],
    payrollImpact: "recalculation",
    documentStatus: "pending",
  },
  {
    id: "mv_3",
    employeeId: "emp_beatriz",
    employeeName: "Beatriz Lima",
    type: "department_transfer",
    requestedAt: "2026-08-10T09:00:00Z",
    effectiveDate: "2026-09-01",
    status: "approved",
    currentValue: "Administrativo",
    newValue: "Pessoas",
    reason: "Reorganização interna",
    requestedBy: "Marina Souza",
    approvals: [
      {
        role: "Gestor",
        status: "approved",
        actor: "Marina Souza",
        decidedAt: "2026-08-10T10:00:00Z",
      },
      {
        role: "RH",
        status: "approved",
        actor: "Marina Alves",
        decidedAt: "2026-08-11T13:00:00Z",
      },
    ],
    payrollImpact: "none",
    documentStatus: "generated",
  },
];
export class InMemoryBenefitsRepository {
  hydrate(state: Record<string, unknown>) {
    const value = state as unknown as BenefitsOverview;
    plans.splice(0, plans.length, ...structuredClone(value.plans));
    enrollments.splice(0, enrollments.length, ...structuredClone(value.enrollments));
    movements.splice(0, movements.length, ...structuredClone(value.movements));
  }

  async overview(): Promise<BenefitsOverview> {
    return structuredClone({
      summary: {
        activePlans: plans.filter((p) => p.active).length,
        activeEnrollments: enrollments.filter((e) => e.status === "active")
          .length,
        monthlyCompanyCost: enrollments
          .filter((e) => e.status === "active")
          .reduce((s, e) => s + e.companyAmount, 0),
        monthlyEmployeeDiscount: enrollments
          .filter((e) => e.status === "active")
          .reduce((s, e) => s + e.employeeAmount, 0),
        pendingEnrollments: enrollments.filter((e) => e.status === "pending")
          .length,
        pendingMovements: movements.filter((m) =>
          m.status.startsWith("pending"),
        ).length,
      },
      plans,
      enrollments,
      movements,
      payrollPreview: enrollments
        .filter((e) => e.status === "active")
        .map((e) => ({
          employeeName: e.employeeName,
          competence: "2026-08",
          events: [
            {
              code: plans.find((p) => p.id === e.planId)!.payrollCode,
              name: e.planName,
              kind: "deduction" as const,
              amount: e.employeeAmount,
            },
          ],
          total: e.employeeAmount,
        })),
    });
  }
  async enroll(input: CreateBenefitEnrollmentInput) {
    const plan = plans.find((p) => p.id === input.planId);
    if (!plan) return undefined;
    const value: BenefitEnrollment = {
      id: `be_${crypto.randomUUID()}`,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      planId: plan.id,
      planName: plan.name,
      startDate: input.startDate,
      status: "pending",
      companyAmount: plan.companyAmount,
      employeeAmount: plan.employeeAmount,
      payrollStatus: "pending",
      dependents: input.dependents,
      note: input.note,
    };
    enrollments.unshift(value);
    return structuredClone(value);
  }
  async createMovement(input: CreateEmployeeMovementInput) {
    const retroactive = input.effectiveDate < "2026-08-01";
    const value: EmployeeMovement = {
      id: `mv_${crypto.randomUUID()}`,
      ...input,
      requestedAt: new Date().toISOString(),
      status: "pending_manager",
      approvals: [
        { role: "Gestor", status: "pending" },
        { role: "RH", status: "pending" },
      ],
      payrollImpact: retroactive ? "recalculation" : "future",
      documentStatus: "pending",
    };
    movements.unshift(value);
    return structuredClone(value);
  }
  async decideMovement(id: string, decision: "approve" | "reject") {
    const value = movements.find((m) => m.id === id);
    if (!value) return undefined;
    const current = value.approvals.find((a) => a.status === "pending");
    if (current) {
      current.status = decision === "approve" ? "approved" : "rejected";
      current.actor = "Marina Alves";
      current.decidedAt = new Date().toISOString();
    }
    value.status =
      decision === "reject"
        ? "rejected"
        : value.approvals.some((a) => a.status === "pending")
          ? "pending_hr"
          : "approved";
    if (value.status === "approved") value.documentStatus = "generated";
    return structuredClone(value);
  }
}
