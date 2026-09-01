import { createHash } from "node:crypto";
import type { PayrollEmployee, PayrollOverview, PayrollRun } from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";
import { calculatePayroll, competenceCalendar, type InssTable, type IrrfTable } from "./payroll-calculator.js";
import { payrollCatalog, payrollLegalTables } from "./payroll.repository.js";
import { calculateNightWork, scheduledWorkMinutes } from "../time-tracking/night-work.js";

type Json = Record<string, unknown>;
type SourceEvent = PayrollEmployee["events"][number] & { sourceType: string; sourceId?: string; sourceSnapshot: Json };
type ProcessedEmployee = PayrollEmployee & { inputSnapshot: Json; events: SourceEvent[]; exceptions: Array<PayrollEmployee["exceptions"][number] & { code: string }> };
type LegalParameterRow = {
  id: string;
  kind: "inss" | "irrf" | "fgts" | "dsr" | "collective_agreement";
  code: string;
  name: string;
  version: number;
  effective_from: string;
  effective_to: string | null;
  source_name: string;
  source_url: string | null;
  source_hash: string;
  parameters: Json;
  change_summary: unknown;
  created_at: string;
};

const round = (value: number) => Math.round(value * 100) / 100;
const monthBounds = (competence: string) => {
  const start = `${competence}-01`;
  const end = new Date(Date.UTC(Number(competence.slice(0, 4)), Number(competence.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return { start, end };
};
const overlapDays = (from: string, to: string, start: string, end: string) => {
  const first = new Date(`${from < start ? start : from}T12:00:00Z`);
  const last = new Date(`${to > end ? end : to}T12:00:00Z`);
  return Math.max(0, Math.floor((last.getTime() - first.getTime()) / 86_400_000) + 1);
};
const resolveLegalParameters = (rows: LegalParameterRow[], competenceStart: string) => {
  const resolved = new Map<LegalParameterRow["kind"], LegalParameterRow>();
  for (const row of rows) {
    if (row.effective_from <= competenceStart && (!row.effective_to || row.effective_to >= competenceStart) && !resolved.has(row.kind)) resolved.set(row.kind, row);
  }
  return resolved;
};
const legalSnapshot = (row: LegalParameterRow) => ({ id: row.id, code: row.code, version: row.version, effectiveFrom: row.effective_from, effectiveTo: row.effective_to, sourceHash: row.source_hash });

export class SupabasePayrollRepository {
  constructor(private readonly client: SupabaseClient) {}

  async process(competence = new Date().toISOString().slice(0, 7)): Promise<PayrollOverview> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { start, end } = monthBounds(competence);
    const calendar = competenceCalendar(competence);
    const punchStart = new Date(`${start}T00:00:00Z`);
    punchStart.setUTCDate(punchStart.getUTCDate() - 1);
    const punchEnd = new Date(`${end}T23:59:59Z`);
    punchEnd.setUTCDate(punchEnd.getUTCDate() + 1);
    const [employeesResult, linksResult, unitsResult, punchesResult, schedulesResult, assignmentsResult, exceptionsResult, approvalsResult, closureResult, statesResult, legalResult] = await Promise.all([
      this.client.from("employees").select("id,full_name,registration,company_id,status").eq("organization_id", organizationId).neq("status", "terminated"),
      this.client.from("employment_links").select("employee_id,position,salary,department_id,hire_date,termination_date").eq("organization_id", organizationId).eq("active", true),
      this.client.from("organization_units").select("id,name").eq("organization_id", organizationId),
      this.client.from("time_punches").select("id,employee_id,type,recorded_at,source").eq("organization_id", organizationId).gte("recorded_at", punchStart.toISOString()).lte("recorded_at", punchEnd.toISOString()).order("recorded_at"),
      this.client.from("time_schedules").select("id,name,start_time,end_time,break_minutes,night_shift").eq("organization_id", organizationId).eq("active", true),
      this.client.from("employee_schedules").select("employee_id,schedule_id,valid_from").eq("organization_id", organizationId).lte("valid_from", end),
      this.client.from("time_exceptions").select("id,employee_id,title,description,severity,status").eq("organization_id", organizationId).gte("date", start).lte("date", end),
      this.client.from("timesheet_approvals").select("employee_id,status").eq("organization_id", organizationId).eq("competence", start),
      this.client.from("time_competence_closures").select("id,status,closing_progress").eq("organization_id", organizationId).eq("competence", start).maybeSingle(),
      this.client.from("module_repository_states").select("module_name,state").eq("organization_id", organizationId).in("module_name", ["absences", "benefits"]),
      this.client.from("legal_parameter_sets").select("id,kind,code,name,version,effective_from,effective_to,source_name,source_url,source_hash,parameters,change_summary,created_at").eq("organization_id", organizationId).lte("effective_from", start).order("effective_from", { ascending: false }).order("version", { ascending: false }),
    ]);
    for (const result of [employeesResult, linksResult, unitsResult, punchesResult, schedulesResult, assignmentsResult, exceptionsResult, approvalsResult, closureResult, statesResult, legalResult]) {
      if (result.error) throw new Error(`payroll_source_load_failed:${result.error.message}`);
    }
    if (closureResult.data?.status !== "closed") throw new Error("time_competence_not_closed");
    const legal = resolveLegalParameters((legalResult.data ?? []) as LegalParameterRow[], start);
    const requiredLegalKinds = ["inss", "irrf", "fgts", "dsr"] as const;
    const missingLegalKinds = requiredLegalKinds.filter((kind) => !legal.has(kind));
    if (missingLegalKinds.length) throw new Error(`payroll_legal_parameters_missing:${missingLegalKinds.join(",")}`);
    const inssParameter = legal.get("inss")!;
    const irrfParameter = legal.get("irrf")!;
    const fgtsParameter = legal.get("fgts")!;
    const dsrParameter = legal.get("dsr")!;
    const collectiveAgreement = legal.get("collective_agreement");
    const companyJobMappings = Array.isArray(collectiveAgreement?.parameters.companyJobMappings) ? collectiveAgreement.parameters.companyJobMappings as Json[] : [];
    const legalParametersSnapshot = Object.fromEntries([...legal.entries()].map(([kind, row]) => [kind, {
      ...legalSnapshot(row),
      ...(kind === "collective_agreement" ? {
        applicabilityStatus: String((row.parameters.applicability as Json | undefined)?.status ?? "unknown"),
        automationStatus: String((row.parameters.automation as Json | undefined)?.status ?? "unknown"),
      } : {}),
    }]));

    const states = new Map((statesResult.data ?? []).map((row) => [row.module_name, row.state as Json]));
    const absences = states.get("absences") ?? {};
    const benefits = states.get("benefits") ?? {};
    const occurrences = Array.isArray(absences.occurrences) ? absences.occurrences as Json[] : [];
    const leaves = Array.isArray(absences.leaves) ? absences.leaves as Json[] : [];
    const vacationRequests = Array.isArray(absences.vacationRequests) ? absences.vacationRequests as Json[] : Array.isArray(absences.vacations) ? absences.vacations as Json[] : [];
    const enrollments = Array.isArray(benefits.enrollments) ? benefits.enrollments as Json[] : [];
    const unitNames = new Map((unitsResult.data ?? []).map((unit) => [unit.id, unit.name]));
    const links = new Map((linksResult.data ?? []).map((link) => [link.employee_id, link]));
    const schedules = new Map((schedulesResult.data ?? []).map((schedule) => [schedule.id, schedule]));
    const assignments = new Map((assignmentsResult.data ?? []).map((assignment) => [assignment.employee_id, assignment.schedule_id]));
    const approved = new Set((approvalsResult.data ?? []).filter((row) => row.status === "approved").map((row) => row.employee_id));
    const employeeByName = new Map((employeesResult.data ?? []).map((employee) => [employee.full_name, employee.id]));
    const sourceEmployeeId = (row: Json) => {
      const raw = String(row.employeeId ?? "");
      return (employeesResult.data ?? []).some((employee) => employee.id === raw) ? raw : employeeByName.get(String(row.employeeName ?? ""));
    };

    const processed: ProcessedEmployee[] = [];
    for (const employee of employeesResult.data ?? []) {
      const link = links.get(employee.id);
      if (!link) continue;
      const collectiveJobMapping = companyJobMappings.find((mapping) => String(mapping.companyRole).localeCompare(String(link.position), "pt-BR", { sensitivity: "base" }) === 0);
      const schedule = schedules.get(assignments.get(employee.id));
      const employeePunches = (punchesResult.data ?? []).filter((punch) => punch.employee_id === employee.id);
      const byShift = new Map<string, { worked: number; intervals: Array<{ start: string; end: string }> }>();
      for (let index = 0; index + 1 < employeePunches.length; index += 2) {
        const first = employeePunches[index]!;
        const second = employeePunches[index + 1]!;
        const day = String(first.recorded_at).slice(0, 10);
        if (day < start || day > end) continue;
        const current = byShift.get(day) ?? { worked: 0, intervals: [] };
        current.worked += Math.max(0, (new Date(second.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / 3_600_000);
        current.intervals.push({ start: first.recorded_at, end: second.recorded_at });
        byShift.set(day, current);
      }
      let overtime50Hours = 0;
      let overtime100Hours = 0;
      let payableNightHours = 0;
      for (const [day, shift] of byShift) {
        if (schedule?.night_shift) payableNightHours += calculateNightWork(shift.intervals).payableNightHours;
        const expected = schedule ? scheduledWorkMinutes(String(schedule.start_time), String(schedule.end_time), Number(schedule.break_minutes)) / 60 : 0;
        const excess = Math.max(0, shift.worked - expected);
        if (new Date(`${day}T12:00:00Z`).getUTCDay() === 0) overtime100Hours += excess;
        else overtime50Hours += excess;
      }
      overtime50Hours = round(overtime50Hours);
      overtime100Hours = round(overtime100Hours);
      payableNightHours = round(payableNightHours);
      const employeeOccurrences = occurrences.filter((row) => sourceEmployeeId(row) === employee.id && Boolean(row.impactsPayroll) && ["approved", "active", "closed"].includes(String(row.status)) && String(row.startDate) <= end && String(row.endDate) >= start);
      const employeeVacations = vacationRequests.filter((row) => sourceEmployeeId(row) === employee.id && ["approved", "completed"].includes(String(row.status)) && String(row.startDate) <= end && String(row.endDate) >= start);
      const absenceDays = employeeOccurrences.filter((row) => row.type === "unjustified_absence").reduce((sum, row) => sum + overlapDays(String(row.startDate), String(row.endDate), start, end), 0);
      const employeeBenefits = enrollments.filter((row) => sourceEmployeeId(row) === employee.id && row.status === "active" && String(row.startDate) <= end && (!row.endDate || String(row.endDate) >= start));
      const benefitDiscount = round(employeeBenefits.reduce((sum, row) => sum + Number(row.employeeAmount ?? 0), 0));
      const calculation = calculatePayroll({ salary: Number(link.salary), overtime50Hours, overtime100Hours, nightHours: payableNightHours, absenceDays, ...calendar, inssTable: inssParameter.parameters as InssTable, irrfTable: irrfParameter.parameters as IrrfTable, fgtsRate: Number(fgtsParameter.parameters.rate) / 100 });
      const events: SourceEvent[] = [
        { id: crypto.randomUUID(), code: "1001", name: "Salário mensal", kind: "earning", category: "salary", quantity: 30, reference: "30 dias", amount: Number(link.salary), automatic: true, sourceType: "employment_link", sourceId: employee.id, sourceSnapshot: { salary: Number(link.salary) } },
      ];
      const add = (code: string, name: string, kind: "earning" | "deduction" | "informational", category: SourceEvent["category"], quantity: number, reference: string, amount: number, sourceType: string, sourceId?: string, sourceSnapshot: Json = {}) => { if (amount > 0) events.push({ id: crypto.randomUUID(), code, name, kind, category, quantity, reference, amount, automatic: true, sourceType, ...(sourceId ? { sourceId } : {}), sourceSnapshot }); };
      add("1101", "Horas extras 50%", "earning", "overtime", overtime50Hours, `${overtime50Hours}h`, calculation.overtime50, "time_tracking", closureResult.data.id, { punchIds: employeePunches.map((p) => p.id) });
      add("1102", "Horas extras 100%", "earning", "overtime", overtime100Hours, `${overtime100Hours}h`, calculation.overtime100, "time_tracking", closureResult.data.id, { punchIds: employeePunches.map((p) => p.id) });
      add("1201", "Adicional noturno", "earning", "additional", payableNightHours, `${payableNightHours}h noturnas equivalentes`, calculation.night, "time_tracking", closureResult.data.id, { punchIds: employeePunches.map((p) => p.id), reducedNightHourMinutes: 52.5, additionalRate: 0.2, includesExtensionAfter05: true });
      add("1202", "DSR sobre verbas variáveis", "earning", "additional", calendar.restDays, `${calendar.restDays} repousos / ${calendar.workingDays} dias úteis`, calculation.dsr, "legal_table", dsrParameter.id, { ...legalSnapshot(dsrParameter), competence, ...calendar, holidayCalendarIncluded: false, variableBase: round(calculation.overtime50 + calculation.overtime100 + calculation.night) });
      add("2001", "Faltas injustificadas", "deduction", "absence", absenceDays, `${absenceDays} dia(s)`, calculation.absence, "absence", employeeOccurrences[0]?.id as string | undefined, { occurrenceIds: employeeOccurrences.map((row) => row.id) });
      for (const benefit of employeeBenefits) add(String(benefit.payrollCode ?? "3100"), String(benefit.planName ?? "Benefício"), "deduction", "benefit", 1, competence, Number(benefit.employeeAmount ?? 0), "benefit_enrollment", String(benefit.id), { planId: benefit.planId });
      add("2101", "INSS", "deduction", "tax", 1, `Tabela progressiva v${inssParameter.version}`, calculation.inss, "legal_table", inssParameter.id, legalSnapshot(inssParameter));
      add("2102", "IRRF", "deduction", "tax", 1, `Base após INSS · v${irrfParameter.version}`, calculation.irrf, "legal_table", irrfParameter.id, legalSnapshot(irrfParameter));
      add("9001", "FGTS empresa", "informational", "tax", 1, `${Number(fgtsParameter.parameters.rate)}%`, calculation.fgts, "legal_table", fgtsParameter.id, legalSnapshot(fgtsParameter));
      const employeeExceptions: ProcessedEmployee["exceptions"] = [];
      if (!approved.has(employee.id)) employeeExceptions.push({ id: crypto.randomUUID(), code: "TIMESHEET_NOT_APPROVED", title: "Folha de ponto não aprovada", description: "A folha individual precisa ser aprovada antes do cálculo salarial.", severity: "critical", status: "open" });
      for (const value of (exceptionsResult.data ?? []).filter((row) => row.employee_id === employee.id && row.status !== "resolved")) employeeExceptions.push({ id: crypto.randomUUID(), code: `TIME_${value.id}`, title: value.title, description: value.description, severity: value.severity, status: "open" });
      for (const value of occurrences.filter((row) => sourceEmployeeId(row) === employee.id && Boolean(row.impactsPayroll) && row.status === "pending")) employeeExceptions.push({ id: crypto.randomUUID(), code: `ABSENCE_${value.id}`, title: "Ausência pendente de decisão", description: String(value.reason ?? "Ocorrência com impacto financeiro ainda não aprovada."), severity: "critical", status: "open" });
      for (const value of leaves.filter((row) => sourceEmployeeId(row) === employee.id && Boolean(row.impactsPayroll) && ["active", "scheduled"].includes(String(row.status)) && String(row.startDate) <= end && String(row.endDate ?? row.returnForecast) >= start)) employeeExceptions.push({ id: crypto.randomUUID(), code: `LEAVE_${value.id}`, title: "Afastamento com impacto na folha", description: "O afastamento exige definição manual da responsabilidade salarial antes da aprovação.", severity: "critical", status: "open" });
      for (const value of employeeVacations.filter((row) => row.payrollEventStatus !== "processed")) employeeExceptions.push({ id: crypto.randomUUID(), code: `VACATION_${value.id}`, title: "Férias sem cálculo processado", description: "A remuneração de férias e o terço constitucional precisam ser processados antes da aprovação da folha, evitando pagamento mensal em duplicidade ou omissão do evento.", severity: "critical", status: "open" });
      if (employee.registration === "AUD-0001" && collectiveAgreement && (collectiveAgreement.parameters.automation as Json | undefined)?.status === "blocked_pending_applicability_confirmation") employeeExceptions.push({ id: crypto.randomUUID(), code: "CCT_APPLICABILITY_PENDING", title: "Aplicabilidade da CCT pendente", description: "O Termo Aditivo SINDEEPRES SP002405/2026 exclui vigilância e segurança patrimonial. Confirme as atividades reais do cargo Vigia antes de aplicar automaticamente as cláusulas econômicas.", severity: "critical", status: "open" });
      const mappedSalaryReference = Number(collectiveJobMapping?.companySalary ?? collectiveJobMapping?.collectiveFloor ?? 0);
      if (collectiveJobMapping && Number(link.salary) < mappedSalaryReference) employeeExceptions.push({ id: crypto.randomUUID(), code: "CCT_SALARY_BELOW_REFERENCE", title: "Salário abaixo da referência coletiva", description: `${String(link.position)} está com salário de ${Number(link.salary).toFixed(2)}, abaixo da referência empresarial/coletiva de ${mappedSalaryReference.toFixed(2)}.`, severity: "critical", status: "open" });
      const deductions = round(calculation.inss + calculation.irrf + calculation.absence + benefitDiscount);
      processed.push({ id: crypto.randomUUID(), employeeId: employee.id, employeeName: employee.full_name, registration: employee.registration, position: link.position, departmentName: unitNames.get(link.department_id) ?? "Sem departamento", baseSalary: Number(link.salary), grossPay: calculation.gross, deductions, netPay: round(calculation.gross - deductions), employerCharges: calculation.fgts, status: employeeExceptions.length ? "exception" : "pending", events, exceptions: employeeExceptions, inputSnapshot: { competence, timeClosureId: closureResult.data.id, timeApproval: approved.has(employee.id), punchIds: employeePunches.map((p) => p.id), absenceIds: employeeOccurrences.map((row) => row.id), vacationIds: employeeVacations.map((row) => row.id), benefitIds: employeeBenefits.map((row) => row.id), legalParameters: legalParametersSnapshot, ...(collectiveJobMapping ? { collectiveJobMapping } : {}), calculationVersion: 4 } });
    }
    const hash = createHash("sha256").update(JSON.stringify(processed.map((employee) => employee.inputSnapshot))).digest("hex");
    const { error } = await this.client.rpc("save_payroll_calculation", { competence_value: start, input_hash_value: hash, employees_value: processed });
    if (error) throw new Error(`payroll_process_failed:${error.message}`);
    return this.overview(competence);
  }

  async overview(competence?: string): Promise<PayrollOverview> {
    const organizationId = await getCurrentOrganizationId(this.client);
    let query = this.client.from("payroll_runs").select("*").eq("organization_id", organizationId).order("competence", { ascending: false });
    if (competence) query = query.eq("competence", `${competence}-01`);
    const { data: runs, error } = await query;
    if (error) throw new Error(`payroll_overview_failed:${error.message}`);
    const active = runs?.[0];
    if (!active) throw new Error("payroll_run_not_processed");
    const [calculationsResult, eventsResult, exceptionsResult, companyResult, legalResult] = await Promise.all([
      this.client.from("payroll_employee_calculations").select("*").eq("run_id", active.id).order("employee_name"),
      this.client.from("payroll_events").select("*").eq("run_id", active.id),
      this.client.from("payroll_exceptions").select("*").eq("run_id", active.id),
      this.client.from("organizations").select("name").eq("id", organizationId).single(),
      this.client.from("legal_parameter_sets").select("id,kind,code,name,version,effective_from,effective_to,source_name,source_url,source_hash,parameters,change_summary,created_at").eq("organization_id", organizationId).in("kind", ["inss", "irrf"]).order("effective_from", { ascending: false }).order("version", { ascending: false }),
    ]);
    for (const result of [calculationsResult, eventsResult, exceptionsResult, companyResult, legalResult]) if (result.error) throw new Error(`payroll_overview_failed:${result.error.message}`);
    const employees: PayrollEmployee[] = (calculationsResult.data ?? []).map((row) => ({ id: row.id, employeeId: row.employee_id, employeeName: row.employee_name, registration: row.registration, position: row.position, departmentName: row.department_name, baseSalary: Number(row.base_salary), grossPay: Number(row.gross_pay), deductions: Number(row.deductions), netPay: Number(row.net_pay), employerCharges: Number(row.employer_charges), status: row.status, events: (eventsResult.data ?? []).filter((event) => event.calculation_id === row.id).map((event) => ({ id: event.id, code: event.code, name: event.name, kind: event.kind, category: event.category, quantity: Number(event.quantity), reference: event.reference, amount: Number(event.amount), automatic: event.automatic })), exceptions: (exceptionsResult.data ?? []).filter((exception) => exception.calculation_id === row.id).map((exception) => ({ id: exception.id, title: exception.title, description: exception.description, severity: exception.severity, status: exception.status })) }));
    const totals = { grossTotal: round(employees.reduce((sum, employee) => sum + employee.grossPay, 0)), deductionsTotal: round(employees.reduce((sum, employee) => sum + employee.deductions, 0)), netTotal: round(employees.reduce((sum, employee) => sum + employee.netPay, 0)), employerChargesTotal: round(employees.reduce((sum, employee) => sum + employee.employerCharges, 0)) };
    const companyName = companyResult.data?.name ?? "Organização";
    const run = (row: typeof active, includeEmployees = false): PayrollRun => ({ id: row.id, companyName, competence: String(row.competence).slice(0, 7), status: row.status, employeesCount: includeEmployees ? employees.length : Number(row.employees_count ?? 0), processedCount: includeEmployees ? employees.length : Number(row.processed_count ?? 0), exceptionsCount: includeEmployees ? employees.flatMap((employee) => employee.exceptions).filter((value) => value.status === "open").length : Number(row.exceptions_count ?? 0), ...(includeEmployees ? totals : { grossTotal: Number(row.gross_total ?? 0), deductionsTotal: Number(row.deductions_total ?? 0), netTotal: Number(row.net_total ?? 0), employerChargesTotal: Number(row.employer_charges_total ?? 0) }), updatedAt: row.updated_at, employees: includeEmployees ? employees : [] });
    const current = run(active, true);
    const approvedCount = employees.filter((employee) => employee.status === "approved").length;
    const competenceStart = String(active.competence).slice(0, 10);
    const legalTables = ((legalResult.data ?? []) as LegalParameterRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      effectiveFrom: row.effective_from,
      ...(row.effective_to ? { effectiveTo: row.effective_to } : {}),
      version: row.version,
      status: row.effective_from > competenceStart ? "scheduled" as const : row.effective_to && row.effective_to < competenceStart ? "expired" as const : "active" as const,
      updatedAt: row.created_at.slice(0, 10),
      sourceName: row.source_name,
      ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      sourceHash: row.source_hash,
      changes: Array.isArray(row.change_summary) ? row.change_summary.map(String) : [],
      brackets: Array.isArray(row.parameters.brackets) ? row.parameters.brackets as Array<{ from: number; to: number | null; rate: number; deduction: number }> : [],
    }));
    return { summary: { activeRun: active.status !== "closed", employees: employees.length, grossTotal: totals.grossTotal, netTotal: totals.netTotal, openExceptions: current.exceptionsCount, closingProgress: employees.length ? Math.round(approvedCount / employees.length * 100) : 0 }, run: current, legalTables: legalTables.length ? legalTables : structuredClone(payrollLegalTables), catalog: structuredClone(payrollCatalog), history: (runs ?? []).filter((row) => row.id !== active.id && row.status === "closed").map((row) => run(row)) };
  }

  async resolve(employeeId: string, exceptionId: string, note: string) { const { error } = await this.client.rpc("resolve_payroll_exception", { exception_id_value: exceptionId, note_value: note }); if (error) return undefined; return (await this.overview()).run.employees.find((employee) => employee.employeeId === employeeId); }
  async approve(employeeId: string) { const overview = await this.overview(); const { error } = await this.client.rpc("approve_payroll_employee", { run_id_value: overview.run.id, employee_id_value: employeeId }); if (error) return undefined; return (await this.overview()).run.employees.find((employee) => employee.employeeId === employeeId); }
  async close() { const overview = await this.overview(); const { error } = await this.client.rpc("close_payroll_run", { run_id_value: overview.run.id }); return error ? { error: "employees_pending" as const } : { data: (await this.overview()).run }; }
}
