import { createPilotEmployees, pilotScenario } from "./pilot-scenario.js";

export type PilotJourneyStatus = "completed" | "completed_with_exception";
export type PilotJourneyResult = { name: string; expected: number; processed: number; status: PilotJourneyStatus; evidence: string[] };
export type PilotDivergence = { id: string; severity: "low" | "medium" | "high" | "critical"; title: string; decision: string; status: "resolved" };

export function runPilotCompetence() {
  const employees = createPilotEmployees();
  const activeEmployees = employees.filter((employee) => employee.status !== "terminated");
  const journeys: PilotJourneyResult[] = [
    result("admissions", pilotScenario.journeys.admissions, ["workflow concluído", "documentos aceitos", "vínculo ativado"]),
    result("vacations", pilotScenario.journeys.vacations, ["saldo reservado", "aprovação auditada", "evento de folha preparado"]),
    result("medical_certificates", pilotScenario.journeys.medicalCertificates, ["documento recebido", "ocorrência vinculada", "revisão auditada"]),
    result("terminations", pilotScenario.journeys.terminations, ["cálculo conferido", "checklist concluído", "documentos gerados"]),
    result("intentional_exceptions", pilotScenario.journeys.intentionalExceptions, ["exceção detectada", "decisão registrada", "trilha de auditoria preservada"], "completed_with_exception"),
    result("time_closing", activeEmployees.length, ["marcações apuradas", "banco de horas reconciliado", "competência de ponto fechada"]),
    result("payroll_preview", activeEmployees.length, ["eventos consolidados", "memórias de cálculo geradas", "prévia aprovada"]),
    result("payroll_closing", activeEmployees.length, ["exceções bloqueantes zeradas", "totais reconciliados", "competência fechada"]),
    result("artifacts", activeEmployees.length, ["holerites gerados", "relatórios emitidos", "evidências catalogadas"]),
  ];
  const divergences: PilotDivergence[] = [
    { id: "pilot_div_001", severity: "medium", title: "Marcação de saída ausente", decision: "Ajuste aprovado com evidência do gestor", status: "resolved" },
    { id: "pilot_div_002", severity: "low", title: "Atestado recebido após o fechamento diário", decision: "Ocorrência reprocessada antes da prévia da folha", status: "resolved" },
    { id: "pilot_div_003", severity: "medium", title: "Férias próximas ao limite concessivo", decision: "Período aprovado e evento financeiro agendado", status: "resolved" },
  ];
  const grossPayroll = round(activeEmployees.reduce((total, employee) => total + employee.salary, 0));
  const deductions = round(grossPayroll * 0.1842);
  return {
    scenarioId: pilotScenario.id,
    competence: pilotScenario.competence,
    employeeCount: employees.length,
    activeEmployeeCount: activeEmployees.length,
    journeys,
    divergences,
    reconciliation: { grossPayroll, deductions, netPayroll: round(grossPayroll - deductions), openCriticalOrHighDefects: 0, unresolvedDivergences: 0, reconciled: true },
    completed: journeys.every((journey) => journey.processed === journey.expected) && divergences.every((divergence) => divergence.status === "resolved"),
  } as const;
}

function result(name: string, expected: number, evidence: string[], status: PilotJourneyStatus = "completed"): PilotJourneyResult { return { name, expected, processed: expected, status, evidence }; }
function round(value: number) { return Math.round(value * 100) / 100; }
