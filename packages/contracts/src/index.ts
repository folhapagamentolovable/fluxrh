import { z } from "zod";

export const exceptionPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const exceptionStatusSchema = z.enum(["open", "in_review", "resolved"]);

export const operationalExceptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  employeeName: z.string().optional(),
  area: z.string(),
  priority: exceptionPrioritySchema,
  status: exceptionStatusSchema,
  dueAt: z.string(),
  createdAt: z.string(),
});

export const dashboardSnapshotSchema = z.object({
  organization: z.object({ id: z.string(), name: z.string(), document: z.string() }),
  metrics: z.object({
    activeEmployees: z.number(),
    openExceptions: z.number(),
    workflowsRunning: z.number(),
    automationRate: z.number(),
  }),
  exceptions: z.array(operationalExceptionSchema),
  workflows: z.array(z.object({
    id: z.string(),
    name: z.string(),
    subject: z.string(),
    progress: z.number().min(0).max(100),
    currentStep: z.string(),
  })),
});

export type OperationalException = z.infer<typeof operationalExceptionSchema>;
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;

export type ApiResponse<T> = {
  data: T;
  meta?: { requestId: string; timestamp: string };
};

export const entityStatusSchema = z.enum(["active", "inactive"]);
export const organizationUnitTypeSchema = z.enum(["establishment", "department", "cost_center"]);

export const companySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  document: z.string(),
  status: entityStatusSchema,
  city: z.string(),
  state: z.string(),
  employeesCount: z.number().int().nonnegative(),
  establishmentsCount: z.number().int().nonnegative(),
});

export const organizationUnitSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  parentId: z.string().nullable(),
  type: organizationUnitTypeSchema,
  code: z.string(),
  name: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  managerName: z.string().optional(),
  employeesCount: z.number().int().nonnegative(),
  status: entityStatusSchema,
});

export const organizationSnapshotSchema = z.object({
  summary: z.object({ companies: z.number(), establishments: z.number(), departments: z.number(), costCenters: z.number() }),
  companies: z.array(companySchema),
  units: z.array(organizationUnitSchema),
});

export const createCompanySchema = z.object({
  legalName: z.string().min(3),
  tradeName: z.string().min(2),
  document: z.string().min(14),
  city: z.string().min(2),
  state: z.string().length(2),
});

export const employeeStatusSchema = z.enum(["active", "vacation", "leave", "onboarding", "terminated"]);
export const employeeSchema = z.object({
  id: z.string(),
  registration: z.string(),
  fullName: z.string(),
  socialName: z.string().optional(),
  cpf: z.string(),
  email: z.string().email(),
  phone: z.string(),
  birthDate: z.string(),
  hireDate: z.string(),
  status: employeeStatusSchema,
  companyId: z.string(),
  companyName: z.string(),
  establishmentId: z.string(),
  establishmentName: z.string(),
  departmentId: z.string(),
  departmentName: z.string(),
  costCenterId: z.string(),
  costCenterName: z.string(),
  position: z.string(),
  contractType: z.string(),
  salary: z.number().nonnegative(),
  workSchedule: z.string(),
  managerName: z.string(),
  avatarColor: z.string(),
  documents: z.array(z.object({ id: z.string(), name: z.string(), status: z.enum(["valid", "pending", "expired"]), expiresAt: z.string().optional() })),
  dependents: z.array(z.object({ id: z.string(), name: z.string(), relationship: z.string(), birthDate: z.string() })),
  timeline: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), occurredAt: z.string(), category: z.string() })),
});

export const employeeListItemSchema = employeeSchema.omit({ documents: true, dependents: true, timeline: true });
export const employeeListSchema = z.array(employeeListItemSchema);

export const createEmployeeSchema = z.object({
  fullName: z.string().min(3),
  cpf: z.string().min(11),
  email: z.string().email(),
  phone: z.string().min(8),
  birthDate: z.string(),
  hireDate: z.string(),
  companyId: z.string(),
  establishmentId: z.string(),
  departmentId: z.string(),
  costCenterId: z.string(),
  position: z.string().min(2),
  salary: z.number().positive(),
  workSchedule: z.string().min(2),
  managerName: z.string().min(2),
});

export type Company = z.infer<typeof companySchema>;
export type OrganizationUnit = z.infer<typeof organizationUnitSchema>;
export type OrganizationSnapshot = z.infer<typeof organizationSnapshotSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type EmployeeListItem = z.infer<typeof employeeListItemSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const workflowStepKeySchema = z.enum(["digital_admission", "documents", "validation", "contract", "onboarding"]);
export const workflowStatusSchema = z.enum(["running", "waiting", "exception", "completed", "cancelled"]);
export const taskStatusSchema = z.enum(["pending", "in_progress", "completed", "blocked"]);
export const taskKindSchema = z.enum(["automatic", "human", "approval"]);

export const workflowTaskSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), stepKey: workflowStepKeySchema,
  kind: taskKindSchema, status: taskStatusSchema, assignee: z.string(), dueAt: z.string(), completedAt: z.string().optional()
});

export const workflowHistorySchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), actor: z.string(), occurredAt: z.string(), type: z.enum(["system", "user", "exception"])
});

export const admissionSchema = z.object({
  id: z.string(), candidateName: z.string(), email: z.string().email(), phone: z.string(), cpf: z.string(),
  companyId: z.string(), companyName: z.string(), establishmentName: z.string(), departmentName: z.string(),
  position: z.string(), managerName: z.string(), expectedStartDate: z.string(), salary: z.number(),
  status: workflowStatusSchema, currentStep: workflowStepKeySchema, progress: z.number().min(0).max(100),
  startedAt: z.string(), dueAt: z.string(), definitionVersion: z.number().int().positive(),
  tasks: z.array(workflowTaskSchema), history: z.array(workflowHistorySchema),
  documents: z.array(z.object({ id: z.string(), name: z.string(), required: z.boolean(), status: z.enum(["requested", "received", "valid", "rejected"]), note: z.string().optional() })),
  validations: z.array(z.object({ id: z.string(), label: z.string(), status: z.enum(["pending", "approved", "attention"]), detail: z.string() })),
  contract: z.object({ status: z.enum(["not_generated", "generated", "sent", "accepted"]), generatedAt: z.string().optional(), acceptedAt: z.string().optional() }),
  onboarding: z.object({ checklistTotal: z.number(), checklistCompleted: z.number(), buddy: z.string().optional() })
});

export const admissionListSchema = z.array(admissionSchema);
export const workflowOverviewSchema = z.object({
  summary: z.object({ running: z.number(), pendingTasks: z.number(), automatedToday: z.number(), exceptions: z.number() }),
  definition: z.object({ id: z.string(), name: z.string(), version: z.number(), active: z.boolean(), steps: z.array(z.object({ key: workflowStepKeySchema, name: z.string(), description: z.string(), automationCount: z.number() })) }),
  tasks: z.array(workflowTaskSchema.extend({ workflowId: z.string(), subject: z.string() })),
  instances: z.array(admissionSchema)
});

export const createAdmissionSchema = z.object({
  candidateName: z.string().min(3), email: z.string().email(), phone: z.string().min(8), cpf: z.string().min(11),
  companyId: z.string(), companyName: z.string(), establishmentName: z.string(), departmentName: z.string(),
  position: z.string().min(2), managerName: z.string().min(2), expectedStartDate: z.string(), salary: z.number().positive()
});

export const advanceWorkflowSchema = z.object({ note: z.string().max(500).optional() });
export type WorkflowStepKey = z.infer<typeof workflowStepKeySchema>;
export type WorkflowTask = z.infer<typeof workflowTaskSchema>;
export type Admission = z.infer<typeof admissionSchema>;
export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
export type WorkflowOverview = z.infer<typeof workflowOverviewSchema>;

export const documentCategorySchema = z.enum(["personal", "contract", "occupational", "payroll", "benefit", "policy"]);
export const documentStatusSchema = z.enum(["requested", "received", "under_review", "validated", "rejected", "generated", "sent", "accepted", "expired"]);
export const acceptanceEvidenceSchema = z.object({
  id: z.string(), signerName: z.string(), signerDocument: z.string(), acceptedAt: z.string(), ipAddress: z.string(),
  userAgent: z.string(), documentHash: z.string(), documentVersion: z.number(), method: z.enum(["authenticated_acceptance", "confirmation_code"]), statement: z.string()
});
export const documentAuditEventSchema = z.object({ id: z.string(), action: z.string(), detail: z.string(), actor: z.string(), occurredAt: z.string(), type: z.enum(["system", "user", "signer"])});
export const documentRecordSchema = z.object({
  id: z.string(), workflowId: z.string().optional(), employeeId: z.string().optional(), subjectName: z.string(), subjectDocument: z.string(),
  companyName: z.string(), title: z.string(), category: documentCategorySchema, status: documentStatusSchema,
  templateId: z.string().optional(), templateName: z.string().optional(), version: z.number().int().positive(), required: z.boolean(),
  createdAt: z.string(), updatedAt: z.string(), expiresAt: z.string().optional(), validationNote: z.string().optional(),
  preview: z.object({ heading: z.string(), subheading: z.string(), paragraphs: z.array(z.string()), clauses: z.array(z.object({ title: z.string(), body: z.string() })) }),
  acceptance: acceptanceEvidenceSchema.optional(), auditTrail: z.array(documentAuditEventSchema)
});
export const documentTemplateSchema = z.object({ id: z.string(), name: z.string(), category: documentCategorySchema, version: z.number(), active: z.boolean(), variables: z.array(z.string()), updatedAt: z.string() });
export const documentOverviewSchema = z.object({
  summary: z.object({ total: z.number(), pendingValidation: z.number(), awaitingAcceptance: z.number(), accepted: z.number(), expiringSoon: z.number() }),
  documents: z.array(documentRecordSchema), templates: z.array(documentTemplateSchema)
});
export const createDocumentRequestSchema = z.object({ subjectName: z.string().min(3), subjectDocument: z.string().min(5), companyName: z.string().min(2), title: z.string().min(3), category: documentCategorySchema, required: z.boolean(), workflowId: z.string().optional() });
export const validateDocumentSchema = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().min(3).max(500) });
export const acceptDocumentSchema = z.object({ signerName: z.string().min(3), signerDocument: z.string().min(5), statementAccepted: z.literal(true), confirmationCode: z.string().length(6).optional() });
export type DocumentRecord = z.infer<typeof documentRecordSchema>;
export type DocumentOverview = z.infer<typeof documentOverviewSchema>;
export type CreateDocumentRequestInput = z.infer<typeof createDocumentRequestSchema>;

export const schedulePatternSchema = z.enum(["5x2", "6x1", "12x36", "custom"]);
export const scheduleTemplateSchema = z.object({ id:z.string(),name:z.string(),pattern:schedulePatternSchema,startTime:z.string(),endTime:z.string(),breakMinutes:z.number(),weeklyHours:z.number(),nightShift:z.boolean(),employeesCount:z.number(),color:z.string() });
export const punchTypeSchema = z.enum(["clock_in","break_start","break_end","clock_out"]);
export const timePunchSchema = z.object({ id:z.string(),employeeId:z.string(),employeeName:z.string(),type:punchTypeSchema,recordedAt:z.string(),source:z.enum(["qr_code","manual","offline_sync"]),locationName:z.string(),deviceId:z.string(),latitude:z.number().optional(),longitude:z.number().optional() });
export const timeExceptionSchema = z.object({ id:z.string(),employeeId:z.string(),employeeName:z.string(),date:z.string(),type:z.enum(["missing_punch","late_arrival","early_leave","excess_hours","short_break","location_mismatch"]),title:z.string(),description:z.string(),severity:z.enum(["critical","high","medium","low"]),status:z.enum(["open","in_review","resolved"]),minutes:z.number().optional(),createdAt:z.string(),resolutionNote:z.string().optional() });
export const timesheetDaySchema = z.object({ date:z.string(),scheduledStart:z.string(),scheduledEnd:z.string(),punches:z.array(timePunchSchema),workedMinutes:z.number(),expectedMinutes:z.number(),balanceMinutes:z.number(),overtime50Minutes:z.number(),overtime100Minutes:z.number(),nightMinutes:z.number(),status:z.enum(["regular","exception","absence","day_off"]) });
export const employeeTimeSummarySchema = z.object({ employeeId:z.string(),employeeName:z.string(),position:z.string(),scheduleName:z.string(),workedMinutes:z.number(),expectedMinutes:z.number(),balanceMinutes:z.number(),overtimeMinutes:z.number(),absenceDays:z.number(),exceptionCount:z.number(),status:z.enum(["open","review","approved"]),days:z.array(timesheetDaySchema) });
export const timeOverviewSchema = z.object({
  summary:z.object({presentToday:z.number(),expectedToday:z.number(),openExceptions:z.number(),overtimeHours:z.number(),positiveBankMinutes:z.number(),closingProgress:z.number()}),
  qrStation:z.object({id:z.string(),name:z.string(),token:z.string(),rotatesAt:z.string(),active:z.boolean()}),
  schedules:z.array(scheduleTemplateSchema),punches:z.array(timePunchSchema),exceptions:z.array(timeExceptionSchema),employees:z.array(employeeTimeSummarySchema)
});
export const registerPunchSchema = z.object({ employeeId:z.string(),employeeName:z.string(),type:punchTypeSchema,token:z.string(),deviceId:z.string().min(3),locationName:z.string().min(2) });
export const resolveTimeExceptionSchema = z.object({ note:z.string().min(3).max(500) });
export type TimeOverview = z.infer<typeof timeOverviewSchema>;
export type TimeException = z.infer<typeof timeExceptionSchema>;
export type EmployeeTimeSummary = z.infer<typeof employeeTimeSummarySchema>;
export type TimePunch = z.infer<typeof timePunchSchema>;
export type ScheduleTemplate = z.infer<typeof scheduleTemplateSchema>;

export const vacationPeriodSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),acquisitionStart:z.string(),acquisitionEnd:z.string(),concessionDeadline:z.string(),earnedDays:z.number(),usedDays:z.number(),scheduledDays:z.number(),balanceDays:z.number(),status:z.enum(["open","scheduled","completed","expired"]),risk:z.enum(["normal","attention","critical"])});
export const vacationRequestSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),companyName:z.string(),departmentName:z.string(),periodId:z.string(),startDate:z.string(),endDate:z.string(),days:z.number().positive(),soldDays:z.number().nonnegative(),advanceThirteenth:z.boolean(),status:z.enum(["pending_manager","pending_hr","approved","rejected","cancelled","completed"]),requestedAt:z.string(),approvedAt:z.string().optional(),coverageStatus:z.enum(["pending","confirmed","not_required"]),payrollEventStatus:z.enum(["pending","scheduled","processed"]),note:z.string().optional()});
export const absenceOccurrenceSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),type:z.enum(["unjustified_absence","justified_absence","day_off","medical_certificate","leave"]),startDate:z.string(),endDate:z.string(),days:z.number().positive(),status:z.enum(["pending","approved","rejected","active","closed"]),reason:z.string(),impactsTime:z.boolean(),impactsPayroll:z.boolean(),documentId:z.string().optional()});
export const medicalCertificateSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),startDate:z.string(),endDate:z.string(),days:z.number().positive(),issuer:z.string(),professionalRegistration:z.string(),cid:z.string().optional(),receivedAt:z.string(),status:z.enum(["under_review","validated","rejected"]),documentName:z.string(),validationNote:z.string().optional()});
export const leaveRecordSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),type:z.enum(["sickness","maternity","paternity","occupational_accident","unpaid","other"]),startDate:z.string(),endDate:z.string().optional(),days:z.number().positive(),status:z.enum(["scheduled","active","ended"]),responsible:z.string(),returnForecast:z.string(),impactsTime:z.boolean(),impactsPayroll:z.boolean()});
export const absenceCalendarEventSchema=z.object({id:z.string(),title:z.string(),employeeName:z.string(),startDate:z.string(),endDate:z.string(),type:z.enum(["vacation","absence","certificate","leave"]),status:z.string()});
export const absenceOverviewSchema=z.object({summary:z.object({vacationBalance:z.number(),requestsPending:z.number(),periodsAtRisk:z.number(),certificatesUnderReview:z.number(),employeesOnLeave:z.number(),absencesThisMonth:z.number()}),vacationPeriods:z.array(vacationPeriodSchema),vacationRequests:z.array(vacationRequestSchema),occurrences:z.array(absenceOccurrenceSchema),certificates:z.array(medicalCertificateSchema),leaves:z.array(leaveRecordSchema),calendar:z.array(absenceCalendarEventSchema)});
export const createVacationRequestSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),periodId:z.string(),startDate:z.string(),endDate:z.string(),soldDays:z.number().int().min(0).max(10),advanceThirteenth:z.boolean(),note:z.string().max(500).optional()});
export const decideVacationRequestSchema=z.object({decision:z.enum(["approve","reject"]),note:z.string().min(3).max(500)});
export const createMedicalCertificateSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),startDate:z.string(),endDate:z.string(),issuer:z.string().min(3),professionalRegistration:z.string().min(3),cid:z.string().optional(),documentName:z.string().min(3)});
export const reviewMedicalCertificateSchema=z.object({decision:z.enum(["approve","reject"]),note:z.string().min(3).max(500)});
export type AbsenceOverview=z.infer<typeof absenceOverviewSchema>;
export type VacationRequest=z.infer<typeof vacationRequestSchema>;
export type MedicalCertificate=z.infer<typeof medicalCertificateSchema>;
export type CreateVacationRequestInput=z.infer<typeof createVacationRequestSchema>;
export type CreateMedicalCertificateInput=z.infer<typeof createMedicalCertificateSchema>;

export const payrollStatusSchema=z.enum(["draft","calculating","review","approved","closed"]);
export const payrollEventSchema=z.object({id:z.string(),code:z.string(),name:z.string(),kind:z.enum(["earning","deduction","informational"]),category:z.enum(["salary","overtime","additional","absence","tax","benefit","vacation","other"]),quantity:z.number(),reference:z.string(),amount:z.number(),automatic:z.boolean()});
export const payrollEmployeeSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),registration:z.string(),position:z.string(),departmentName:z.string(),baseSalary:z.number(),grossPay:z.number(),deductions:z.number(),netPay:z.number(),employerCharges:z.number(),status:z.enum(["pending","exception","approved"]),events:z.array(payrollEventSchema),exceptions:z.array(z.object({id:z.string(),title:z.string(),description:z.string(),severity:z.enum(["critical","high","medium","low"]),status:z.enum(["open","resolved"])}))});
export const payrollLegalTableSchema=z.object({id:z.string(),name:z.string(),effectiveFrom:z.string(),version:z.number(),status:z.enum(["active","scheduled","expired"]),updatedAt:z.string(),brackets:z.array(z.object({from:z.number(),to:z.number().nullable(),rate:z.number(),deduction:z.number()}))});
export const payrollCatalogEventSchema=z.object({code:z.string(),name:z.string(),kind:z.enum(["earning","deduction","informational"]),calculation:z.string(),incidences:z.array(z.enum(["INSS","FGTS","IRRF"])),active:z.boolean()});
export const payrollRunSchema=z.object({id:z.string(),companyName:z.string(),competence:z.string(),status:payrollStatusSchema,employeesCount:z.number(),processedCount:z.number(),exceptionsCount:z.number(),grossTotal:z.number(),deductionsTotal:z.number(),netTotal:z.number(),employerChargesTotal:z.number(),updatedAt:z.string(),employees:z.array(payrollEmployeeSchema)});
export const payrollOverviewSchema=z.object({summary:z.object({activeRun:z.boolean(),employees:z.number(),grossTotal:z.number(),netTotal:z.number(),openExceptions:z.number(),closingProgress:z.number()}),run:payrollRunSchema,legalTables:z.array(payrollLegalTableSchema),catalog:z.array(payrollCatalogEventSchema),history:z.array(payrollRunSchema.omit({employees:true}))});
export const resolvePayrollExceptionSchema=z.object({note:z.string().min(3).max(500)});export const addPayrollEventSchema=z.object({code:z.string(),name:z.string().min(2),kind:z.enum(["earning","deduction"]),amount:z.number().positive(),reference:z.string().min(1)});
export type PayrollOverview=z.infer<typeof payrollOverviewSchema>;export type PayrollRun=z.infer<typeof payrollRunSchema>;export type PayrollEmployee=z.infer<typeof payrollEmployeeSchema>;

export const benefitPlanSchema=z.object({id:z.string(),name:z.string(),type:z.enum(["meal","food","transport","health","dental","childcare","fuel","other"]),provider:z.string(),companyName:z.string(),eligibility:z.string(),companyAmount:z.number(),employeeAmount:z.number(),payrollCode:z.string(),active:z.boolean(),enrolledCount:z.number()});
export const benefitEnrollmentSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),planId:z.string(),planName:z.string(),startDate:z.string(),endDate:z.string().optional(),status:z.enum(["pending","active","suspended","cancelled"]),companyAmount:z.number(),employeeAmount:z.number(),payrollStatus:z.enum(["pending","scheduled","processed"]),dependents:z.number(),note:z.string().optional()});
export const employeeMovementSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),type:z.enum(["salary_change","promotion","position_change","department_transfer","cost_center_transfer","schedule_change"]),requestedAt:z.string(),effectiveDate:z.string(),status:z.enum(["pending_manager","pending_hr","approved","rejected","applied"]),currentValue:z.string(),newValue:z.string(),currentSalary:z.number().optional(),newSalary:z.number().optional(),reason:z.string(),requestedBy:z.string(),approvals:z.array(z.object({role:z.string(),status:z.enum(["pending","approved","rejected"]),actor:z.string().optional(),decidedAt:z.string().optional()})),payrollImpact:z.enum(["none","future","recalculation"]),documentStatus:z.enum(["not_required","pending","generated","accepted"])});
export const benefitsOverviewSchema=z.object({summary:z.object({activePlans:z.number(),activeEnrollments:z.number(),monthlyCompanyCost:z.number(),monthlyEmployeeDiscount:z.number(),pendingEnrollments:z.number(),pendingMovements:z.number()}),plans:z.array(benefitPlanSchema),enrollments:z.array(benefitEnrollmentSchema),movements:z.array(employeeMovementSchema),payrollPreview:z.array(z.object({employeeName:z.string(),competence:z.string(),events:z.array(z.object({code:z.string(),name:z.string(),kind:z.enum(["earning","deduction"]),amount:z.number()})),total:z.number()}))});
export const createBenefitEnrollmentSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),planId:z.string(),startDate:z.string(),dependents:z.number().int().min(0).max(20),note:z.string().max(500).optional()});
export const createEmployeeMovementSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),type:z.enum(["salary_change","promotion","position_change","department_transfer","cost_center_transfer","schedule_change"]),effectiveDate:z.string(),currentValue:z.string().min(1),newValue:z.string().min(1),currentSalary:z.number().positive().optional(),newSalary:z.number().positive().optional(),reason:z.string().min(3),requestedBy:z.string().min(2)}).refine(x=>x.type!=="salary_change"||(x.currentSalary&&x.newSalary),{message:"salary_required"});
export const decideEmployeeMovementSchema=z.object({decision:z.enum(["approve","reject"]),note:z.string().min(3).max(500)});
export type BenefitsOverview=z.infer<typeof benefitsOverviewSchema>;export type BenefitEnrollment=z.infer<typeof benefitEnrollmentSchema>;export type EmployeeMovement=z.infer<typeof employeeMovementSchema>;export type CreateBenefitEnrollmentInput=z.infer<typeof createBenefitEnrollmentSchema>;export type CreateEmployeeMovementInput=z.infer<typeof createEmployeeMovementSchema>;

export const specialCalculationItemSchema=z.object({code:z.string(),name:z.string(),kind:z.enum(["earning","deduction","informational"]),reference:z.string(),amount:z.number()});
export const specialCalculationSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),type:z.enum(["thirteenth_first","thirteenth_second","vacation"]),competence:z.string(),status:z.enum(["pending","exception","approved","closed"]),baseSalary:z.number(),averageVariables:z.number(),entitledTwelfths:z.number().min(0).max(12),vacationDays:z.number().optional(),soldDays:z.number().optional(),advanceThirteenth:z.boolean().optional(),grossAmount:z.number(),deductions:z.number(),netAmount:z.number(),payrollStatus:z.enum(["pending","scheduled","processed"]),receiptStatus:z.enum(["pending","generated","accepted"]),items:z.array(specialCalculationItemSchema),exceptions:z.array(z.object({id:z.string(),title:z.string(),description:z.string(),severity:z.enum(["critical","high","medium","low"]),status:z.enum(["open","resolved"])}))});
export const specialCalculationsOverviewSchema=z.object({summary:z.object({thirteenthEmployees:z.number(),vacationsScheduled:z.number(),grossTotal:z.number(),netTotal:z.number(),openExceptions:z.number(),approvalProgress:z.number()}),calculations:z.array(specialCalculationSchema),averageHistory:z.array(z.object({employeeId:z.string(),employeeName:z.string(),months:z.number(),overtimeAverage:z.number(),additionalAverage:z.number(),totalAverage:z.number()})),rules:z.array(z.object({id:z.string(),name:z.string(),description:z.string(),active:z.boolean()}))});
export const createSpecialCalculationSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),type:z.enum(["thirteenth_first","thirteenth_second","vacation"]),competence:z.string(),baseSalary:z.number().positive(),averageVariables:z.number().min(0),entitledTwelfths:z.number().int().min(0).max(12),vacationDays:z.number().int().min(1).max(30).optional(),soldDays:z.number().int().min(0).max(10).optional(),advanceThirteenth:z.boolean().optional()});
export const resolveSpecialCalculationSchema=z.object({note:z.string().min(3).max(500)});
export type SpecialCalculationsOverview=z.infer<typeof specialCalculationsOverviewSchema>;export type SpecialCalculation=z.infer<typeof specialCalculationSchema>;export type CreateSpecialCalculationInput=z.infer<typeof createSpecialCalculationSchema>;

export const terminationTypeSchema=z.enum(["resignation","dismissal_without_cause","dismissal_for_cause","fixed_term_end","mutual_agreement"]);
export const terminationStatusSchema=z.enum(["draft","running","exception","pending_approval","completed","cancelled"]);
export const terminationChecklistItemSchema=z.object({id:z.string(),title:z.string(),area:z.string(),status:z.enum(["pending","completed","blocked"]),assignee:z.string(),dueDate:z.string()});
export const terminationCalculationItemSchema=z.object({code:z.string(),name:z.string(),kind:z.enum(["earning","deduction","informational"]),reference:z.string(),amount:z.number()});
export const terminationProcessSchema=z.object({id:z.string(),employeeId:z.string(),employeeName:z.string(),registration:z.string(),companyName:z.string(),departmentName:z.string(),position:z.string(),hireDate:z.string(),terminationDate:z.string(),lastWorkedDate:z.string(),type:terminationTypeSchema,reason:z.string(),noticeType:z.enum(["worked","indemnified","waived","not_applicable"]),noticeDays:z.number().int().nonnegative(),status:terminationStatusSchema,currentStep:z.enum(["request","notice","calculation","checklist","documents","approval","completed"]),progress:z.number().min(0).max(100),requestedAt:z.string(),requestedBy:z.string(),baseSalary:z.number(),averageVariables:z.number(),balanceDays:z.number(),vacationDuePeriods:z.number(),proportionalVacationTwelfths:z.number(),thirteenthTwelfths:z.number(),fgtsBalance:z.number(),calculation:z.object({gross:z.number(),deductions:z.number(),net:z.number(),fgtsPenalty:z.number(),items:z.array(terminationCalculationItemSchema)}),checklist:z.array(terminationChecklistItemSchema),documents:z.array(z.object({id:z.string(),name:z.string(),status:z.enum(["pending","generated","accepted"])})),exceptions:z.array(z.object({id:z.string(),title:z.string(),description:z.string(),severity:z.enum(["critical","high","medium","low"]),status:z.enum(["open","resolved"])}))});
export const terminationsOverviewSchema=z.object({summary:z.object({active:z.number(),pendingApproval:z.number(),completedThisMonth:z.number(),openExceptions:z.number(),pendingTasks:z.number(),estimatedNet:z.number()}),processes:z.array(terminationProcessSchema)});
export const createTerminationSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),registration:z.string().min(1),companyName:z.string().min(2),departmentName:z.string().min(2),position:z.string().min(2),hireDate:z.string(),terminationDate:z.string(),lastWorkedDate:z.string(),type:terminationTypeSchema,reason:z.string().min(3),noticeType:z.enum(["worked","indemnified","waived","not_applicable"]),noticeDays:z.number().int().min(0).max(90),requestedBy:z.string().min(2),baseSalary:z.number().positive(),averageVariables:z.number().min(0),balanceDays:z.number().int().min(0).max(31),vacationDuePeriods:z.number().int().min(0).max(10),proportionalVacationTwelfths:z.number().int().min(0).max(12),thirteenthTwelfths:z.number().int().min(0).max(12),fgtsBalance:z.number().min(0)});
export const resolveTerminationExceptionSchema=z.object({note:z.string().min(3).max(500)});
export type TerminationProcess=z.infer<typeof terminationProcessSchema>;export type TerminationsOverview=z.infer<typeof terminationsOverviewSchema>;export type CreateTerminationInput=z.infer<typeof createTerminationSchema>;

export const serviceRequestTypeSchema=z.enum(["vacation","time_adjustment","document","benefit","personal_data","payroll_question","other"]);
export const serviceRequestSchema=z.object({id:z.string(),protocol:z.string(),employeeId:z.string(),employeeName:z.string(),type:serviceRequestTypeSchema,title:z.string(),description:z.string(),status:z.enum(["submitted","in_review","waiting_employee","approved","rejected","completed"]),priority:z.enum(["low","medium","high"]),createdAt:z.string(),updatedAt:z.string(),assignedTo:z.string(),dueAt:z.string(),timeline:z.array(z.object({id:z.string(),actor:z.string(),action:z.string(),detail:z.string(),occurredAt:z.string()}))});
export const employeePortalOverviewSchema=z.object({profile:z.object({employeeId:z.string(),name:z.string(),registration:z.string(),position:z.string(),department:z.string(),company:z.string(),manager:z.string(),email:z.string(),phone:z.string()}),summary:z.object({vacationBalance:z.number(),timeBankMinutes:z.number(),openRequests:z.number(),pendingDocuments:z.number()}),quickActions:z.array(z.object({id:z.string(),label:z.string(),description:z.string(),type:serviceRequestTypeSchema})),documents:z.array(z.object({id:z.string(),name:z.string(),category:z.string(),competence:z.string().optional(),status:z.enum(["available","pending","action_required"]),updatedAt:z.string()})),requests:z.array(serviceRequestSchema),team:z.array(z.object({employeeId:z.string(),name:z.string(),position:z.string(),status:z.enum(["working","vacation","leave"]),pendingItems:z.number()})),approvals:z.array(z.object({id:z.string(),employeeName:z.string(),type:z.string(),description:z.string(),requestedAt:z.string(),status:z.enum(["pending","approved","rejected"])}))});
export const createServiceRequestSchema=z.object({employeeId:z.string(),employeeName:z.string().min(3),type:serviceRequestTypeSchema,title:z.string().min(3),description:z.string().min(5).max(1000),priority:z.enum(["low","medium","high"]).default("medium")});
export const decidePortalApprovalSchema=z.object({decision:z.enum(["approve","reject"]),note:z.string().min(3).max(500)});
export type ServiceRequest=z.infer<typeof serviceRequestSchema>;export type EmployeePortalOverview=z.infer<typeof employeePortalOverviewSchema>;export type CreateServiceRequestInput=z.infer<typeof createServiceRequestSchema>;

export const notificationPrioritySchema=z.enum(["informational","important","critical"]);
export const notificationSchema=z.object({id:z.string(),recipientId:z.string(),recipientName:z.string(),title:z.string(),message:z.string(),priority:notificationPrioritySchema,source:z.enum(["workflow","document","time","absence","payroll","benefit","termination","announcement","system"]),eventKey:z.string(),actionLabel:z.string().optional(),actionPath:z.string().optional(),createdAt:z.string(),readAt:z.string().optional(),acknowledgedAt:z.string().optional(),status:z.enum(["unread","read","acknowledged"])});
export const announcementSchema=z.object({id:z.string(),title:z.string(),message:z.string(),audience:z.string(),priority:notificationPrioritySchema,status:z.enum(["draft","scheduled","published","closed"]),scheduledAt:z.string().optional(),publishedAt:z.string().optional(),requiresAcknowledgement:z.boolean(),recipients:z.number(),readCount:z.number(),acknowledgedCount:z.number(),createdBy:z.string()});
export const notificationTemplateSchema=z.object({id:z.string(),name:z.string(),event:z.string(),title:z.string(),message:z.string(),variables:z.array(z.string()),active:z.boolean()});
export const notificationRuleSchema=z.object({id:z.string(),name:z.string(),event:z.string(),audience:z.string(),priority:notificationPrioritySchema,deduplicationHours:z.number(),escalateAfterHours:z.number().optional(),escalateTo:z.string().optional(),active:z.boolean(),triggeredCount:z.number()});
export const communicationsOverviewSchema=z.object({summary:z.object({unread:z.number(),critical:z.number(),scheduled:z.number(),awaitingAcknowledgement:z.number(),readRate:z.number(),automatedToday:z.number()}),notifications:z.array(notificationSchema),announcements:z.array(announcementSchema),templates:z.array(notificationTemplateSchema),rules:z.array(notificationRuleSchema)});
export const createAnnouncementSchema=z.object({title:z.string().min(3),message:z.string().min(5).max(2000),audience:z.string().min(2),priority:notificationPrioritySchema,requiresAcknowledgement:z.boolean(),scheduledAt:z.string().optional()});
export const emitNotificationSchema=z.object({recipientId:z.string(),recipientName:z.string().min(2),title:z.string().min(3),message:z.string().min(3),priority:notificationPrioritySchema,source:z.enum(["workflow","document","time","absence","payroll","benefit","termination","announcement","system"]),eventKey:z.string().min(3),actionLabel:z.string().optional(),actionPath:z.string().optional()});
export type Notification=z.infer<typeof notificationSchema>;export type Announcement=z.infer<typeof announcementSchema>;export type CommunicationsOverview=z.infer<typeof communicationsOverviewSchema>;export type CreateAnnouncementInput=z.infer<typeof createAnnouncementSchema>;export type EmitNotificationInput=z.infer<typeof emitNotificationSchema>;
