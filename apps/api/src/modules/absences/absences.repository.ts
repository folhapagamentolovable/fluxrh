import type {
  AbsenceOverview,
  CreateMedicalCertificateInput,
  CreateVacationRequestInput,
  MedicalCertificate,
  VacationRequest,
} from "@fluxrh/contracts";
import {
  absenceOccurrenceSchema,
  leaveRecordSchema,
  medicalCertificateSchema,
  vacationPeriodSchema,
  vacationRequestSchema,
} from "@fluxrh/contracts";
import { validateVacation, inclusiveDays } from "./absence-rules.js";
const periods: AbsenceOverview["vacationPeriods"] = [
  {
    id: "vp_beatriz",
    employeeId: "emp_beatriz",
    employeeName: "Beatriz Lima",
    acquisitionStart: "2024-09-02",
    acquisitionEnd: "2025-09-01",
    concessionDeadline: "2026-09-01",
    earnedDays: 30,
    usedDays: 0,
    scheduledDays: 0,
    balanceDays: 30,
    status: "open",
    risk: "critical",
  },
  {
    id: "vp_carlos",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    acquisitionStart: "2025-01-08",
    acquisitionEnd: "2026-01-07",
    concessionDeadline: "2027-01-07",
    earnedDays: 30,
    usedDays: 0,
    scheduledDays: 15,
    balanceDays: 15,
    status: "scheduled",
    risk: "normal",
  },
  {
    id: "vp_marina",
    employeeId: "emp_marina",
    employeeName: "Marina Souza",
    acquisitionStart: "2025-04-15",
    acquisitionEnd: "2026-04-14",
    concessionDeadline: "2027-04-14",
    earnedDays: 30,
    usedDays: 10,
    scheduledDays: 0,
    balanceDays: 20,
    status: "open",
    risk: "normal",
  },
];
const requests: VacationRequest[] = [
  {
    id: "vr_1",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    companyName: "Flux Serviços",
    departmentName: "Operações",
    periodId: "vp_carlos",
    startDate: "2026-09-14",
    endDate: "2026-09-28",
    days: 15,
    soldDays: 0,
    advanceThirteenth: false,
    status: "approved",
    requestedAt: "2026-08-05T13:00:00Z",
    approvedAt: "2026-08-06T15:30:00Z",
    coverageStatus: "confirmed",
    payrollEventStatus: "scheduled",
  },
  {
    id: "vr_2",
    employeeId: "emp_beatriz",
    employeeName: "Beatriz Lima",
    companyName: "Flux Serviços",
    departmentName: "Administrativo",
    periodId: "vp_beatriz",
    startDate: "2026-09-01",
    endDate: "2026-09-20",
    days: 20,
    soldDays: 10,
    advanceThirteenth: true,
    status: "pending_hr",
    requestedAt: "2026-08-24T14:20:00Z",
    coverageStatus: "confirmed",
    payrollEventStatus: "pending",
  },
];
const certificates: MedicalCertificate[] = [
  {
    id: "mc_1",
    employeeId: "emp_marina",
    employeeName: "Marina Souza",
    startDate: "2026-08-24",
    endDate: "2026-08-25",
    days: 2,
    issuer: "Clínica Vida",
    professionalRegistration: "CRM-SP 123456",
    receivedAt: "2026-08-24T18:10:00Z",
    status: "under_review",
    documentName: "atestado-marina-24-08.pdf",
  },
  {
    id: "mc_2",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    startDate: "2026-08-10",
    endDate: "2026-08-10",
    days: 1,
    issuer: "Hospital Central",
    professionalRegistration: "CRM-SP 654321",
    receivedAt: "2026-08-10T15:00:00Z",
    status: "validated",
    documentName: "atestado-carlos.pdf",
    validationNote: "Documento legível e período compatível.",
  },
];
const occurrences: AbsenceOverview["occurrences"] = [
  {
    id: "ab_1",
    employeeId: "emp_beatriz",
    employeeName: "Beatriz Lima",
    type: "unjustified_absence",
    startDate: "2026-08-18",
    endDate: "2026-08-18",
    days: 1,
    status: "pending",
    reason: "Sem marcação ou justificativa",
    impactsTime: true,
    impactsPayroll: true,
  },
  {
    id: "ab_2",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    type: "day_off",
    startDate: "2026-08-26",
    endDate: "2026-08-26",
    days: 1,
    status: "approved",
    reason: "Folga compensatória",
    impactsTime: true,
    impactsPayroll: false,
  },
  {
    id: "ab_3",
    employeeId: "emp_marina",
    employeeName: "Marina Souza",
    type: "medical_certificate",
    startDate: "2026-08-24",
    endDate: "2026-08-25",
    days: 2,
    status: "pending",
    reason: "Aguardando validação do atestado",
    impactsTime: true,
    impactsPayroll: false,
    documentId: "mc_1",
  },
];
const leaves: AbsenceOverview["leaves"] = [
  {
    id: "lv_1",
    employeeId: "emp_ana",
    employeeName: "Ana Paula Rocha",
    type: "maternity",
    startDate: "2026-07-12",
    endDate: "2026-11-08",
    days: 120,
    status: "active",
    responsible: "Marina Souza",
    returnForecast: "2026-11-09",
    impactsTime: true,
    impactsPayroll: true,
  },
  {
    id: "lv_2",
    employeeId: "emp_joao",
    employeeName: "João Ribeiro",
    type: "sickness",
    startDate: "2026-08-20",
    endDate: "2026-09-08",
    days: 20,
    status: "active",
    responsible: "Marina Souza",
    returnForecast: "2026-09-09",
    impactsTime: true,
    impactsPayroll: true,
  },
];
export class InMemoryAbsencesRepository {
  hydrate(state: Record<string, unknown>) {
    const parsedPeriods = vacationPeriodSchema
      .array()
      .safeParse(state.vacationPeriods);
    const parsedRequests = vacationRequestSchema
      .array()
      .safeParse(state.vacationRequests ?? state.vacations);
    const parsedCertificates = medicalCertificateSchema
      .array()
      .safeParse(state.certificates ?? state.medicalCertificates);
    const parsedOccurrences = absenceOccurrenceSchema
      .array()
      .safeParse(state.occurrences);
    const parsedLeaves = leaveRecordSchema.array().safeParse(state.leaves);

    periods.splice(
      0,
      periods.length,
      ...structuredClone(parsedPeriods.success ? parsedPeriods.data : []),
    );
    requests.splice(
      0,
      requests.length,
      ...structuredClone(parsedRequests.success ? parsedRequests.data : []),
    );
    certificates.splice(
      0,
      certificates.length,
      ...structuredClone(
        parsedCertificates.success ? parsedCertificates.data : [],
      ),
    );
    occurrences.splice(
      0,
      occurrences.length,
      ...structuredClone(
        parsedOccurrences.success ? parsedOccurrences.data : [],
      ),
    );
    leaves.splice(
      0,
      leaves.length,
      ...structuredClone(parsedLeaves.success ? parsedLeaves.data : []),
    );
  }

  async overview(): Promise<AbsenceOverview> {
    return structuredClone({
      summary: {
        vacationBalance: periods.reduce((s, p) => s + p.balanceDays, 0),
        requestsPending: requests.filter((r) => r.status.startsWith("pending"))
          .length,
        periodsAtRisk: periods.filter((p) => p.risk !== "normal").length,
        certificatesUnderReview: certificates.filter(
          (c) => c.status === "under_review",
        ).length,
        employeesOnLeave: leaves.filter((l) => l.status === "active").length,
        absencesThisMonth: occurrences.reduce((s, o) => s + o.days, 0),
      },
      vacationPeriods: periods,
      vacationRequests: requests,
      occurrences,
      certificates,
      leaves,
      calendar: [
        ...requests
          .filter((r) => r.status === "approved")
          .map((r) => ({
            id: r.id,
            title: "Férias",
            employeeName: r.employeeName,
            startDate: r.startDate,
            endDate: r.endDate,
            type: "vacation" as const,
            status: r.status,
          })),
        ...occurrences.map((o) => ({
          id: o.id,
          title: o.reason,
          employeeName: o.employeeName,
          startDate: o.startDate,
          endDate: o.endDate,
          type:
            o.type === "medical_certificate"
              ? ("certificate" as const)
              : ("absence" as const),
          status: o.status,
        })),
        ...leaves.map((l) => ({
          id: l.id,
          title: "Afastamento",
          employeeName: l.employeeName,
          startDate: l.startDate,
          endDate: l.endDate ?? l.returnForecast,
          type: "leave" as const,
          status: l.status,
        })),
      ],
    });
  }
  async createVacation(input: CreateVacationRequestInput) {
    const period = periods.find(
      (p) => p.id === input.periodId && p.employeeId === input.employeeId,
    );
    if (!period) return { error: "period_not_found" as const };
    const check = validateVacation(
      period.balanceDays,
      input.startDate,
      input.endDate,
      input.soldDays,
    );
    if (!check.ok) return { error: check.error };
    const value: VacationRequest = {
      id: `vr_${crypto.randomUUID()}`,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      companyName: "Flux Serviços",
      departmentName: "A definir",
      periodId: period.id,
      startDate: input.startDate,
      endDate: input.endDate,
      days: check.days,
      soldDays: input.soldDays,
      advanceThirteenth: input.advanceThirteenth,
      status: "pending_manager",
      requestedAt: new Date().toISOString(),
      coverageStatus: "pending",
      payrollEventStatus: "pending",
      note: input.note,
    };
    requests.unshift(value);
    period.scheduledDays += check.days + input.soldDays;
    period.balanceDays -= check.days + input.soldDays;
    period.status = "scheduled";
    return { data: structuredClone(value) };
  }
  async decideVacation(
    id: string,
    decision: "approve" | "reject",
    note: string,
  ) {
    const value = requests.find((r) => r.id === id);
    if (!value) return undefined;
    value.status = decision === "approve" ? "approved" : "rejected";
    value.note = note;
    if (decision === "approve") {
      value.approvedAt = new Date().toISOString();
      value.payrollEventStatus = "scheduled";
    }
    return structuredClone(value);
  }
  async createCertificate(input: CreateMedicalCertificateInput) {
    const value: MedicalCertificate = {
      id: `mc_${crypto.randomUUID()}`,
      ...input,
      days: inclusiveDays(input.startDate, input.endDate),
      receivedAt: new Date().toISOString(),
      status: "under_review",
    };
    certificates.unshift(value);
    occurrences.unshift({
      id: `ab_${crypto.randomUUID()}`,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      type: "medical_certificate",
      startDate: input.startDate,
      endDate: input.endDate,
      days: value.days,
      status: "pending",
      reason: "Aguardando validação do atestado",
      impactsTime: true,
      impactsPayroll: false,
      documentId: value.id,
    });
    return structuredClone(value);
  }
  async reviewCertificate(
    id: string,
    decision: "approve" | "reject",
    note: string,
  ) {
    const value = certificates.find((c) => c.id === id);
    if (!value) return undefined;
    value.status = decision === "approve" ? "validated" : "rejected";
    value.validationNote = note;
    const occurrence = occurrences.find((o) => o.documentId === id);
    if (occurrence)
      occurrence.status = decision === "approve" ? "approved" : "rejected";
    return structuredClone(value);
  }
}
