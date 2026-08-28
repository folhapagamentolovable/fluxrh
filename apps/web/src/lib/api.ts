import {
  absenceOverviewSchema,
  admissionListSchema,
  admissionSchema,
  announcementSchema,
  benefitEnrollmentSchema,
  benefitsOverviewSchema,
  communicationsOverviewSchema,
  dashboardSnapshotSchema,
  documentOverviewSchema,
  documentRecordSchema,
  employeeListSchema,
  employeeMovementSchema,
  employeePortalOverviewSchema,
  employeeSchema,
  employeeTimeSummarySchema,
  medicalCertificateSchema,
  notificationSchema,
  organizationSnapshotSchema,
  payrollEmployeeSchema,
  payrollOverviewSchema,
  payrollRunSchema,
  serviceRequestSchema,
  specialCalculationSchema,
  specialCalculationsOverviewSchema,
  terminationProcessSchema,
  terminationsOverviewSchema,
  timeExceptionSchema,
  timeOverviewSchema,
  timePunchSchema,
  vacationRequestSchema,
  workflowOverviewSchema,
  type AbsenceOverview,
  type Admission,
  type Announcement,
  type ApiResponse,
  type BenefitEnrollment,
  type BenefitsOverview,
  type CommunicationsOverview,
  type CreateAdmissionInput,
  type CreateAnnouncementInput,
  type CreateBenefitEnrollmentInput,
  type CreateCompanyInput,
  type CreateDocumentRequestInput,
  type CreateEmployeeInput,
  type CreateEmployeeMovementInput,
  type CreateMedicalCertificateInput,
  type CreateServiceRequestInput,
  type CreateSpecialCalculationInput,
  type CreateTerminationInput,
  type CreateVacationRequestInput,
  type DashboardSnapshot,
  type DocumentOverview,
  type DocumentRecord,
  type Employee,
  type EmployeeListItem,
  type EmployeeMovement,
  type EmployeePortalOverview,
  type EmployeeTimeSummary,
  type MedicalCertificate,
  type Notification,
  type OrganizationSnapshot,
  type PayrollEmployee,
  type PayrollOverview,
  type PayrollRun,
  type ServiceRequest,
  type SpecialCalculation,
  type SpecialCalculationsOverview,
  type TerminationProcess,
  type TerminationsOverview,
  type TimeException,
  type TimeOverview,
  type TimePunch,
  type VacationRequest,
  type WorkflowOverview,
} from "@fluxrh/contracts";
import {
  employeeDependentSchema,
  timeCompetenceClosureSchema,
  type CreateEmployeeDependentInput,
  type EmployeeDependent,
  type TimeCompetenceClosure,
} from "@fluxrh/contracts";
import { type UpdateEmployeeInput } from "@fluxrh/contracts";
import { localDataRequest } from "./local-data";
import {
  analyticsOverviewSchema,
  reportRunSchema,
  type AnalyticsFilter,
  type AnalyticsOverview,
  type GenerateReportInput,
  type ReportRun,
} from "@fluxrh/contracts";
import {
  occupationalExamSchema,
  occupationalHealthOverviewSchema,
  occupationalExceptionSchema,
  type CompleteOccupationalExamInput,
  type CreateOccupationalExamInput,
  type OccupationalExam,
  type OccupationalHealthOverview,
} from "@fluxrh/contracts";
import {
  patrolOccurrenceSchema,
  patrolOverviewSchema,
  patrolSchema,
  patrolVisitSchema,
  type CreatePatrolOccurrenceInput,
  type Patrol,
  type PatrolOccurrence,
  type PatrolOverview,
  type PatrolVisit,
  type RegisterPatrolVisitInput,
  type StartPatrolInput,
} from "@fluxrh/contracts";
import {
  governanceOverviewSchema,
  governanceSessionSchema,
  governanceUserSchema,
  permissionMatrixEntrySchema,
  type GovernanceOverview,
  type GovernanceUser,
  type InviteGovernanceUserInput,
  type UpdateRolePermissionsInput,
} from "@fluxrh/contracts";
import {
  operationalExceptionSchema,
  workflowAuditEventSchema,
  type OperationalException,
  type WorkflowAuditEvent,
} from "@fluxrh/contracts";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { normalizeDigits } from "./cnpj";

const apiBaseUrl =
  (import.meta.env.VITE_FLUXRH_API_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "";
const localDataMode =
  (import.meta.env.VITE_FLUXRH_DATA_MODE as string | undefined) !== "remote";

async function request<T>(
  url: string,
  schema: { parse: (value: unknown) => T },
  options?: RequestInit,
): Promise<T> {
  if (localDataMode) return schema.parse(await localDataRequest(url, options));
  const session = isSupabaseConfigured
    ? (await supabase.auth.getSession()).data.session
    : null;
  if (!apiBaseUrl)
    throw new Error("A URL da API persistente não está configurada.");
  const response = await fetch(`${apiBaseUrl}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) throw new Error(`A operação falhou (${response.status}).`);
  const payload = (await response.json()) as ApiResponse<unknown>;
  return schema.parse(payload.data);
}

export async function getDashboard(): Promise<DashboardSnapshot> {
  return request("/api/v1/operations/dashboard", dashboardSnapshotSchema);
}

export const getOrganizations = (): Promise<OrganizationSnapshot> =>
  request("/api/v1/organizations", organizationSnapshotSchema);
export const createCompany = (input: CreateCompanyInput) =>
  request(
    "/api/v1/organizations/companies",
    organizationSnapshotSchema.shape.companies.element,
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        document: normalizeDigits(input.document),
      }),
    },
  );
export const getEmployees = (): Promise<EmployeeListItem[]> =>
  request("/api/v1/employees?limit=200", employeeListSchema);
export const getEmployee = (id: string): Promise<Employee> =>
  request(`/api/v1/employees/${id}`, employeeSchema);
export const createEmployee = (input: CreateEmployeeInput): Promise<Employee> =>
  request("/api/v1/employees", employeeSchema, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      cpf: normalizeDigits(input.cpf),
      phone: normalizeDigits(input.phone),
    }),
  });
export const getWorkflowOverview = (): Promise<WorkflowOverview> =>
  request("/api/v1/workflows/overview", workflowOverviewSchema);
export const getAdmissions = (): Promise<Admission[]> =>
  request("/api/v1/workflows/admissions", admissionListSchema);
export const getAdmission = (id: string): Promise<Admission> =>
  request(`/api/v1/workflows/admissions/${id}`, admissionSchema);
export const createAdmission = (
  input: CreateAdmissionInput,
): Promise<Admission> =>
  request("/api/v1/workflows/admissions", admissionSchema, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      cpf: normalizeDigits(input.cpf),
      phone: normalizeDigits(input.phone),
    }),
  });
export const advanceAdmission = (
  id: string,
  note?: string,
): Promise<Admission> =>
  request(`/api/v1/workflows/admissions/${id}/advance`, admissionSchema, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const getWorkflowExceptions = (): Promise<OperationalException[]> =>
  request("/api/v1/workflows/exceptions", operationalExceptionSchema.array());
export const resolveWorkflowException = (
  id: string,
  note: string,
): Promise<OperationalException> =>
  request(
    `/api/v1/workflows/exceptions/${id}/resolve`,
    operationalExceptionSchema,
    { method: "POST", body: JSON.stringify({ note }) },
  );
export const createWorkflowException = (
  id: string,
  input: {
    title: string;
    description: string;
    priority: "critical" | "high" | "medium" | "low";
  },
): Promise<OperationalException> =>
  request(
    `/api/v1/workflows/admissions/${id}/exceptions`,
    operationalExceptionSchema,
    { method: "POST", body: JSON.stringify(input) },
  );
export const getWorkflowAudit = (
  workflowId?: string,
): Promise<WorkflowAuditEvent[]> =>
  request(
    `/api/v1/workflows/audit${workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : ""}`,
    workflowAuditEventSchema.array(),
  );
export const getDocumentOverview = (): Promise<DocumentOverview> =>
  request("/api/v1/documents/overview", documentOverviewSchema);
export const getDocument = (id: string): Promise<DocumentRecord> =>
  request(`/api/v1/documents/${id}`, documentRecordSchema);
export const createDocumentRequest = (
  input: CreateDocumentRequestInput,
): Promise<DocumentRecord> =>
  request("/api/v1/documents/requests", documentRecordSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const validateDocument = (
  id: string,
  decision: "approve" | "reject",
  note: string,
): Promise<DocumentRecord> =>
  request(`/api/v1/documents/${id}/validate`, documentRecordSchema, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
export const acceptDocument = (
  id: string,
  signerName: string,
  signerDocument: string,
): Promise<DocumentRecord> =>
  request(`/api/v1/documents/${id}/accept`, documentRecordSchema, {
    method: "POST",
    body: JSON.stringify({
      signerName,
      signerDocument,
      statementAccepted: true,
    }),
  });
export const getTimeOverview = (): Promise<TimeOverview> =>
  request("/api/v1/time/overview", timeOverviewSchema);
export const registerTimePunch = (input: {
  employeeId: string;
  employeeName: string;
  type: "clock_in" | "break_start" | "break_end" | "clock_out";
  token: string;
  deviceId: string;
  locationName: string;
}): Promise<TimePunch> =>
  request("/api/v1/time/punches", timePunchSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const resolveTimeException = (
  id: string,
  note: string,
): Promise<TimeException> =>
  request(`/api/v1/time/exceptions/${id}/resolve`, timeExceptionSchema, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const approveEmployeeTimesheet = (
  id: string,
): Promise<EmployeeTimeSummary> =>
  request(`/api/v1/time/employees/${id}/approve`, employeeTimeSummarySchema, {
    method: "POST",
    body: "{}",
  });
export const getAbsenceOverview = (): Promise<AbsenceOverview> =>
  request("/api/v1/absences/overview", absenceOverviewSchema);
export const createVacationRequest = (
  input: CreateVacationRequestInput,
): Promise<VacationRequest> =>
  request("/api/v1/absences/vacations", vacationRequestSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const decideVacationRequest = (
  id: string,
  decision: "approve" | "reject",
  note: string,
): Promise<VacationRequest> =>
  request(`/api/v1/absences/vacations/${id}/decision`, vacationRequestSchema, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
export const createMedicalCertificate = (
  input: CreateMedicalCertificateInput,
): Promise<MedicalCertificate> =>
  request("/api/v1/absences/certificates", medicalCertificateSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const reviewMedicalCertificate = (
  id: string,
  decision: "approve" | "reject",
  note: string,
): Promise<MedicalCertificate> =>
  request(
    `/api/v1/absences/certificates/${id}/review`,
    medicalCertificateSchema,
    { method: "POST", body: JSON.stringify({ decision, note }) },
  );
export const getPayrollOverview = (): Promise<PayrollOverview> =>
  request("/api/v1/payroll/overview", payrollOverviewSchema);
export const resolvePayrollException = (
  employeeId: string,
  exceptionId: string,
  note: string,
): Promise<PayrollEmployee> =>
  request(
    `/api/v1/payroll/employees/${employeeId}/exceptions/${exceptionId}/resolve`,
    payrollEmployeeSchema,
    { method: "POST", body: JSON.stringify({ note }) },
  );
export const approvePayrollEmployee = (
  employeeId: string,
): Promise<PayrollEmployee> =>
  request(
    `/api/v1/payroll/employees/${employeeId}/approve`,
    payrollEmployeeSchema,
    { method: "POST", body: "{}" },
  );
export const closePayroll = (): Promise<PayrollRun> =>
  request("/api/v1/payroll/close", payrollRunSchema, {
    method: "POST",
    body: "{}",
  });
export const getBenefitsOverview = (): Promise<BenefitsOverview> =>
  request("/api/v1/benefits/overview", benefitsOverviewSchema);
export const createBenefitEnrollment = (
  input: CreateBenefitEnrollmentInput,
): Promise<BenefitEnrollment> =>
  request("/api/v1/benefits/enrollments", benefitEnrollmentSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const createEmployeeMovement = (
  input: CreateEmployeeMovementInput,
): Promise<EmployeeMovement> =>
  request("/api/v1/benefits/movements", employeeMovementSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const decideEmployeeMovement = (
  id: string,
  decision: "approve" | "reject",
  note: string,
): Promise<EmployeeMovement> =>
  request(`/api/v1/benefits/movements/${id}/decision`, employeeMovementSchema, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
export const getSpecialCalculations =
  (): Promise<SpecialCalculationsOverview> =>
    request(
      "/api/v1/special-calculations/overview",
      specialCalculationsOverviewSchema,
    );
export const createSpecialCalculation = (
  input: CreateSpecialCalculationInput,
): Promise<SpecialCalculation> =>
  request(
    "/api/v1/special-calculations/calculations",
    specialCalculationSchema,
    { method: "POST", body: JSON.stringify(input) },
  );
export const resolveSpecialException = (
  id: string,
  exceptionId: string,
  note: string,
): Promise<SpecialCalculation> =>
  request(
    `/api/v1/special-calculations/calculations/${id}/exceptions/${exceptionId}/resolve`,
    specialCalculationSchema,
    { method: "POST", body: JSON.stringify({ note }) },
  );
export const approveSpecialCalculation = (
  id: string,
): Promise<SpecialCalculation> =>
  request(
    `/api/v1/special-calculations/calculations/${id}/approve`,
    specialCalculationSchema,
    { method: "POST", body: "{}" },
  );
export const getTerminations = (): Promise<TerminationsOverview> =>
  request("/api/v1/terminations/overview", terminationsOverviewSchema);
export const createTermination = (
  input: CreateTerminationInput,
): Promise<TerminationProcess> =>
  request("/api/v1/terminations/processes", terminationProcessSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const resolveTerminationException = (
  id: string,
  exceptionId: string,
  note: string,
): Promise<TerminationProcess> =>
  request(
    `/api/v1/terminations/processes/${id}/exceptions/${exceptionId}/resolve`,
    terminationProcessSchema,
    { method: "POST", body: JSON.stringify({ note }) },
  );
export const toggleTerminationTask = (
  id: string,
  taskId: string,
): Promise<TerminationProcess> =>
  request(
    `/api/v1/terminations/processes/${id}/tasks/${taskId}/toggle`,
    terminationProcessSchema,
    { method: "POST", body: "{}" },
  );
export const approveTermination = (id: string): Promise<TerminationProcess> =>
  request(
    `/api/v1/terminations/processes/${id}/approve`,
    terminationProcessSchema,
    { method: "POST", body: "{}" },
  );
export const getEmployeePortal = (): Promise<EmployeePortalOverview> =>
  request("/api/v1/portal/overview", employeePortalOverviewSchema);
export const createServiceRequest = (
  input: CreateServiceRequestInput,
): Promise<ServiceRequest> =>
  request("/api/v1/portal/requests", serviceRequestSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const decidePortalApproval = (
  id: string,
  decision: "approve" | "reject",
  note: string,
) =>
  request(
    `/api/v1/portal/approvals/${id}/decision`,
    employeePortalOverviewSchema.shape.approvals.element,
    { method: "POST", body: JSON.stringify({ decision, note }) },
  );
export const getCommunications = (): Promise<CommunicationsOverview> =>
  request("/api/v1/communications/overview", communicationsOverviewSchema);
export const markNotificationRead = (id: string): Promise<Notification> =>
  request(
    `/api/v1/communications/notifications/${id}/read`,
    notificationSchema,
    { method: "POST", body: "{}" },
  );
export const acknowledgeNotification = (id: string): Promise<Notification> =>
  request(
    `/api/v1/communications/notifications/${id}/acknowledge`,
    notificationSchema,
    { method: "POST", body: "{}" },
  );
export const createAnnouncement = (
  input: CreateAnnouncementInput,
): Promise<Announcement> =>
  request("/api/v1/communications/announcements", announcementSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const runCommunicationEscalations = () =>
  request("/api/v1/communications/escalations/run", notificationSchema, {
    method: "POST",
    body: "{}",
  });
export const getAnalytics = (
  filter: AnalyticsFilter = {},
): Promise<AnalyticsOverview> => {
  const query = new URLSearchParams(
    Object.entries(filter).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();
  return request(
    `/api/v1/analytics/overview${query ? `?${query}` : ""}`,
    analyticsOverviewSchema,
  );
};
export const generateReport = (
  input: GenerateReportInput,
): Promise<ReportRun> =>
  request("/api/v1/analytics/reports/generate", reportRunSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const getOccupationalHealth = (): Promise<OccupationalHealthOverview> =>
  request(
    "/api/v1/occupational-health/overview",
    occupationalHealthOverviewSchema,
  );
export const createOccupationalExam = (
  input: CreateOccupationalExamInput,
): Promise<OccupationalExam> =>
  request("/api/v1/occupational-health/exams", occupationalExamSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const completeOccupationalExam = (
  id: string,
  input: CompleteOccupationalExamInput,
): Promise<OccupationalExam> =>
  request(
    `/api/v1/occupational-health/exams/${id}/complete`,
    occupationalExamSchema,
    { method: "POST", body: JSON.stringify(input) },
  );
export const resolveOccupationalException = (id: string, note: string) =>
  request(
    `/api/v1/occupational-health/exceptions/${id}/resolve`,
    occupationalExceptionSchema,
    { method: "POST", body: JSON.stringify({ note }) },
  );
export const getPatrols = (): Promise<PatrolOverview> =>
  request("/api/v1/patrols/overview", patrolOverviewSchema);
export const startPatrol = (
  routeId: string,
  input: StartPatrolInput,
): Promise<Patrol> =>
  request(`/api/v1/patrols/routes/${routeId}/start`, patrolSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const registerPatrolVisit = (
  id: string,
  input: RegisterPatrolVisitInput,
): Promise<PatrolVisit> =>
  request(`/api/v1/patrols/patrols/${id}/visits`, patrolVisitSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const createPatrolOccurrence = (
  id: string,
  input: CreatePatrolOccurrenceInput,
): Promise<PatrolOccurrence> =>
  request(`/api/v1/patrols/patrols/${id}/occurrences`, patrolOccurrenceSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const resolvePatrolOccurrence = (
  id: string,
  note: string,
): Promise<PatrolOccurrence> =>
  request(`/api/v1/patrols/occurrences/${id}/resolve`, patrolOccurrenceSchema, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const getGovernance = (): Promise<GovernanceOverview> =>
  request("/api/v1/governance/overview", governanceOverviewSchema);
export const inviteGovernanceUser = (
  input: InviteGovernanceUserInput,
): Promise<GovernanceUser> =>
  request("/api/v1/governance/users/invite", governanceUserSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateRolePermission = (
  role: string,
  input: UpdateRolePermissionsInput,
) =>
  request(
    `/api/v1/governance/roles/${role}/permissions`,
    permissionMatrixEntrySchema,
    { method: "PUT", body: JSON.stringify(input) },
  );
export const revokeGovernanceSession = (id: string) =>
  request(`/api/v1/governance/sessions/${id}/revoke`, governanceSessionSchema, {
    method: "POST",
    body: JSON.stringify({
      justification: "Sessão encerrada pelo administrador por segurança.",
    }),
  });
export const getCurrentTimeCompetence =
  (): Promise<TimeCompetenceClosure | null> =>
    request(
      "/api/v1/people/competences/current",
      timeCompetenceClosureSchema.nullable(),
    );
export const closeTimeCompetence = (
  id: string,
  notes?: string,
): Promise<TimeCompetenceClosure> =>
  request("/api/v1/people/competences/close", timeCompetenceClosureSchema, {
    method: "POST",
    body: JSON.stringify({ id, notes }),
  });
export const getEmployeeDependents = (
  employeeId: string,
): Promise<EmployeeDependent[]> =>
  request(
    `/api/v1/people/${employeeId}/dependents`,
    employeeDependentSchema.array(),
  );
export const createEmployeeDependent = (
  employeeId: string,
  input: CreateEmployeeDependentInput,
): Promise<EmployeeDependent> =>
  request(`/api/v1/people/${employeeId}/dependents`, employeeDependentSchema, {
    method: "POST",
    body: JSON.stringify({ ...input, employeeId }),
  });
export const updateEmployee = (
  id: string,
  input: UpdateEmployeeInput,
): Promise<Employee> =>
  request(`/api/v1/employees/${id}`, employeeSchema, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const sendExternalEmail = (input: { to: string[]; subject: string; text: string; idempotencyKey?: string }): Promise<string> =>
  request("/api/v1/integrations/email/send", notificationSchema.shape.id, { method: "POST", body: JSON.stringify(input) });
