import { absenceOverviewSchema, admissionListSchema, admissionSchema, benefitEnrollmentSchema, benefitsOverviewSchema, dashboardSnapshotSchema, documentOverviewSchema, documentRecordSchema, employeeListSchema, employeeMovementSchema, employeePortalOverviewSchema, employeeSchema, employeeTimeSummarySchema, medicalCertificateSchema, organizationSnapshotSchema, payrollEmployeeSchema, payrollOverviewSchema, payrollRunSchema, serviceRequestSchema, specialCalculationSchema, specialCalculationsOverviewSchema, terminationProcessSchema, terminationsOverviewSchema, timeExceptionSchema, timeOverviewSchema, timePunchSchema, vacationRequestSchema, workflowOverviewSchema, type AbsenceOverview, type Admission, type ApiResponse, type BenefitEnrollment, type BenefitsOverview, type CreateAdmissionInput, type CreateBenefitEnrollmentInput, type CreateCompanyInput, type CreateDocumentRequestInput, type CreateEmployeeInput, type CreateEmployeeMovementInput, type CreateMedicalCertificateInput, type CreateServiceRequestInput, type CreateSpecialCalculationInput, type CreateTerminationInput, type CreateVacationRequestInput, type DashboardSnapshot, type DocumentOverview, type DocumentRecord, type Employee, type EmployeeListItem, type EmployeeMovement, type EmployeePortalOverview, type EmployeeTimeSummary, type MedicalCertificate, type OrganizationSnapshot, type PayrollEmployee, type PayrollOverview, type PayrollRun, type ServiceRequest, type SpecialCalculation, type SpecialCalculationsOverview, type TerminationProcess, type TerminationsOverview, type TimeException, type TimeOverview, type TimePunch, type VacationRequest, type WorkflowOverview } from "@fluxrh/contracts";
import { localDataRequest } from "./local-data";

const localDataMode = typeof window !== "undefined"
  && !["localhost", "127.0.0.1"].includes(window.location.hostname);

async function request<T>(url: string, schema: { parse: (value: unknown) => T }, options?: RequestInit): Promise<T> {
  if (localDataMode) return schema.parse(await localDataRequest(url, options));
  const response = await fetch(url, { headers: { "Content-Type": "application/json", ...options?.headers }, ...options });
  if (!response.ok) throw new Error(`A operação falhou (${response.status}).`);
  const payload = await response.json() as ApiResponse<unknown>;
  return schema.parse(payload.data);
}

export async function getDashboard(): Promise<DashboardSnapshot> {
  return request("/api/v1/operations/dashboard", dashboardSnapshotSchema);
}

export const getOrganizations = (): Promise<OrganizationSnapshot> => request("/api/v1/organizations", organizationSnapshotSchema);
export const createCompany = (input: CreateCompanyInput) => request("/api/v1/organizations/companies", organizationSnapshotSchema.shape.companies.element, { method: "POST", body: JSON.stringify(input) });
export const getEmployees = (): Promise<EmployeeListItem[]> => request("/api/v1/employees", employeeListSchema);
export const getEmployee = (id: string): Promise<Employee> => request(`/api/v1/employees/${id}`, employeeSchema);
export const createEmployee = (input: CreateEmployeeInput): Promise<Employee> => request("/api/v1/employees", employeeSchema, { method: "POST", body: JSON.stringify(input) });
export const getWorkflowOverview = (): Promise<WorkflowOverview> => request("/api/v1/workflows/overview", workflowOverviewSchema);
export const getAdmissions = (): Promise<Admission[]> => request("/api/v1/workflows/admissions", admissionListSchema);
export const getAdmission = (id: string): Promise<Admission> => request(`/api/v1/workflows/admissions/${id}`, admissionSchema);
export const createAdmission = (input: CreateAdmissionInput): Promise<Admission> => request("/api/v1/workflows/admissions", admissionSchema, { method: "POST", body: JSON.stringify(input) });
export const advanceAdmission = (id: string, note?: string): Promise<Admission> => request(`/api/v1/workflows/admissions/${id}/advance`, admissionSchema, { method: "POST", body: JSON.stringify({ note }) });
export const getDocumentOverview = (): Promise<DocumentOverview> => request("/api/v1/documents/overview", documentOverviewSchema);
export const getDocument = (id: string): Promise<DocumentRecord> => request(`/api/v1/documents/${id}`, documentRecordSchema);
export const createDocumentRequest = (input: CreateDocumentRequestInput): Promise<DocumentRecord> => request("/api/v1/documents/requests", documentRecordSchema, { method: "POST", body: JSON.stringify(input) });
export const validateDocument = (id: string, decision: "approve" | "reject", note: string): Promise<DocumentRecord> => request(`/api/v1/documents/${id}/validate`, documentRecordSchema, { method: "POST", body: JSON.stringify({ decision, note }) });
export const acceptDocument = (id: string, signerName: string, signerDocument: string): Promise<DocumentRecord> => request(`/api/v1/documents/${id}/accept`, documentRecordSchema, { method: "POST", body: JSON.stringify({ signerName, signerDocument, statementAccepted: true }) });
export const getTimeOverview = (): Promise<TimeOverview> => request("/api/v1/time/overview", timeOverviewSchema);
export const registerTimePunch = (input:{employeeId:string;employeeName:string;type:"clock_in"|"break_start"|"break_end"|"clock_out";token:string;deviceId:string;locationName:string}):Promise<TimePunch>=>request("/api/v1/time/punches",timePunchSchema,{method:"POST",body:JSON.stringify(input)});
export const resolveTimeException = (id:string,note:string):Promise<TimeException>=>request(`/api/v1/time/exceptions/${id}/resolve`,timeExceptionSchema,{method:"POST",body:JSON.stringify({note})});
export const approveEmployeeTimesheet = (id:string):Promise<EmployeeTimeSummary>=>request(`/api/v1/time/employees/${id}/approve`,employeeTimeSummarySchema,{method:"POST",body:"{}"});
export const getAbsenceOverview=():Promise<AbsenceOverview>=>request("/api/v1/absences/overview",absenceOverviewSchema);
export const createVacationRequest=(input:CreateVacationRequestInput):Promise<VacationRequest>=>request("/api/v1/absences/vacations",vacationRequestSchema,{method:"POST",body:JSON.stringify(input)});
export const decideVacationRequest=(id:string,decision:"approve"|"reject",note:string):Promise<VacationRequest>=>request(`/api/v1/absences/vacations/${id}/decision`,vacationRequestSchema,{method:"POST",body:JSON.stringify({decision,note})});
export const createMedicalCertificate=(input:CreateMedicalCertificateInput):Promise<MedicalCertificate>=>request("/api/v1/absences/certificates",medicalCertificateSchema,{method:"POST",body:JSON.stringify(input)});
export const reviewMedicalCertificate=(id:string,decision:"approve"|"reject",note:string):Promise<MedicalCertificate>=>request(`/api/v1/absences/certificates/${id}/review`,medicalCertificateSchema,{method:"POST",body:JSON.stringify({decision,note})});
export const getPayrollOverview=():Promise<PayrollOverview>=>request("/api/v1/payroll/overview",payrollOverviewSchema);
export const resolvePayrollException=(employeeId:string,exceptionId:string,note:string):Promise<PayrollEmployee>=>request(`/api/v1/payroll/employees/${employeeId}/exceptions/${exceptionId}/resolve`,payrollEmployeeSchema,{method:"POST",body:JSON.stringify({note})});
export const approvePayrollEmployee=(employeeId:string):Promise<PayrollEmployee>=>request(`/api/v1/payroll/employees/${employeeId}/approve`,payrollEmployeeSchema,{method:"POST",body:"{}"});
export const closePayroll=():Promise<PayrollRun>=>request("/api/v1/payroll/close",payrollRunSchema,{method:"POST",body:"{}"});
export const getBenefitsOverview=():Promise<BenefitsOverview>=>request("/api/v1/benefits/overview",benefitsOverviewSchema);
export const createBenefitEnrollment=(input:CreateBenefitEnrollmentInput):Promise<BenefitEnrollment>=>request("/api/v1/benefits/enrollments",benefitEnrollmentSchema,{method:"POST",body:JSON.stringify(input)});
export const createEmployeeMovement=(input:CreateEmployeeMovementInput):Promise<EmployeeMovement>=>request("/api/v1/benefits/movements",employeeMovementSchema,{method:"POST",body:JSON.stringify(input)});
export const decideEmployeeMovement=(id:string,decision:"approve"|"reject",note:string):Promise<EmployeeMovement>=>request(`/api/v1/benefits/movements/${id}/decision`,employeeMovementSchema,{method:"POST",body:JSON.stringify({decision,note})});
export const getSpecialCalculations=():Promise<SpecialCalculationsOverview>=>request("/api/v1/special-calculations/overview",specialCalculationsOverviewSchema);
export const createSpecialCalculation=(input:CreateSpecialCalculationInput):Promise<SpecialCalculation>=>request("/api/v1/special-calculations/calculations",specialCalculationSchema,{method:"POST",body:JSON.stringify(input)});
export const resolveSpecialException=(id:string,exceptionId:string,note:string):Promise<SpecialCalculation>=>request(`/api/v1/special-calculations/calculations/${id}/exceptions/${exceptionId}/resolve`,specialCalculationSchema,{method:"POST",body:JSON.stringify({note})});
export const approveSpecialCalculation=(id:string):Promise<SpecialCalculation>=>request(`/api/v1/special-calculations/calculations/${id}/approve`,specialCalculationSchema,{method:"POST",body:"{}"});
export const getTerminations=():Promise<TerminationsOverview>=>request("/api/v1/terminations/overview",terminationsOverviewSchema);
export const createTermination=(input:CreateTerminationInput):Promise<TerminationProcess>=>request("/api/v1/terminations/processes",terminationProcessSchema,{method:"POST",body:JSON.stringify(input)});
export const resolveTerminationException=(id:string,exceptionId:string,note:string):Promise<TerminationProcess>=>request(`/api/v1/terminations/processes/${id}/exceptions/${exceptionId}/resolve`,terminationProcessSchema,{method:"POST",body:JSON.stringify({note})});
export const toggleTerminationTask=(id:string,taskId:string):Promise<TerminationProcess>=>request(`/api/v1/terminations/processes/${id}/tasks/${taskId}/toggle`,terminationProcessSchema,{method:"POST",body:"{}"});
export const approveTermination=(id:string):Promise<TerminationProcess>=>request(`/api/v1/terminations/processes/${id}/approve`,terminationProcessSchema,{method:"POST",body:"{}"});
export const getEmployeePortal=():Promise<EmployeePortalOverview>=>request("/api/v1/portal/overview",employeePortalOverviewSchema);
export const createServiceRequest=(input:CreateServiceRequestInput):Promise<ServiceRequest>=>request("/api/v1/portal/requests",serviceRequestSchema,{method:"POST",body:JSON.stringify(input)});
export const decidePortalApproval=(id:string,decision:"approve"|"reject",note:string)=>request(`/api/v1/portal/approvals/${id}/decision`,employeePortalOverviewSchema.shape.approvals.element,{method:"POST",body:JSON.stringify({decision,note})});
