import type { Admission, CreateAdmissionInput, WorkflowOverview, WorkflowStepKey } from "@fluxrh/contracts";
import { admissionSteps, stepNames, WorkflowEngine } from "./workflow.engine.js";

const engine = new WorkflowEngine();
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function makeAdmission(id: string, candidateName: string, currentStep: WorkflowStepKey, companyName: string, position: string, status: Admission["status"] = "running"): Admission {
  const index = admissionSteps.indexOf(currentStep);
  const tasks = admissionSteps.slice(0, index + 1).flatMap(step => engine.createTasks(step, daysFromNow(5))).map(task => task.stepKey === currentStep ? task : { ...task, status: "completed" as const, completedAt: daysFromNow(-1) });
  if (status === "completed") tasks.forEach(task => { task.status = "completed"; task.completedAt = daysFromNow(-1); });
  const emailSlug = candidateName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll(" ", ".");
  return { id, candidateName, email: `${emailSlug}@email.local`, phone: "(11) 99999-0000", cpf: "***.482.***-09", companyId: companyName === "Norte Facilities" ? "company_norte" : "company_flux", companyName, establishmentName: companyName === "Norte Facilities" ? "Operação Campinas" : "Matriz São Paulo", departmentName: companyName === "Norte Facilities" ? "Operação de Campo" : "Pessoas e Cultura", position, managerName: companyName === "Norte Facilities" ? "Luciana Prado" : "Marina Alves", expectedStartDate: "2026-09-01", salary: position.includes("Analista") ? 4850 : 3200, status, currentStep, progress: status === "completed" ? 100 : Math.round((index / admissionSteps.length) * 100), startedAt: daysFromNow(-6), dueAt: daysFromNow(6), definitionVersion: 1, tasks,
    documents: [{ id: `${id}_cpf`, name: "CPF", required: true, status: index >= 2 ? "valid" : "received" }, { id: `${id}_rg`, name: "Documento de identidade", required: true, status: index >= 2 ? "valid" : "received" }, { id: `${id}_address`, name: "Comprovante de residência", required: true, status: index >= 2 ? "valid" : "requested" }, { id: `${id}_bank`, name: "Dados bancários", required: false, status: index >= 2 ? "valid" : "requested" }],
    validations: [{ id: `${id}_identity`, label: "Identidade e CPF", status: index >= 3 ? "approved" : "pending", detail: index >= 3 ? "Dados consistentes" : "Aguardando etapa" }, { id: `${id}_duplicate`, label: "Duplicidade de cadastro", status: index >= 3 ? "approved" : "pending", detail: index >= 3 ? "Nenhum vínculo conflitante" : "Aguardando etapa" }, { id: `${id}_position`, label: "Requisitos do cargo", status: index >= 3 ? "approved" : "pending", detail: index >= 3 ? "Requisitos atendidos" : "Aguardando etapa" }],
    contract: index >= 4 ? { status: "accepted", generatedAt: daysFromNow(-2), acceptedAt: daysFromNow(-1) } : { status: index === 3 ? "generated" : "not_generated" },
    onboarding: { checklistTotal: 6, checklistCompleted: status === "completed" ? 6 : currentStep === "onboarding" ? 3 : 0, buddy: currentStep === "onboarding" || status === "completed" ? "Carlos Mendes" : undefined },
    history: [{ id: `${id}_h1`, title: `${stepNames[currentStep]} em andamento`, description: "Workflow avançou automaticamente até esta etapa.", actor: "FluxRH", occurredAt: daysFromNow(-1), type: "system" }, { id: `${id}_h2`, title: "Admissão iniciada", description: "Solicitação aprovada e processo criado.", actor: "Marina Alves", occurredAt: daysFromNow(-6), type: "user" }]
  };
}

const admissions: Admission[] = [
  makeAdmission("adm_marina", "Marina Souza", "documents", "Grupo Flux", "Analista de RH"),
  makeAdmission("adm_camila", "Camila Rocha", "onboarding", "Norte Facilities", "Agente de Facilities"),
  makeAdmission("adm_lucas", "Lucas Ferreira", "validation", "Grupo Flux", "Assistente Administrativo"),
  makeAdmission("adm_julia", "Júlia Martins", "onboarding", "Grupo Flux", "Analista Financeira", "completed")
];
admissions[3].progress = 100;

export class InMemoryWorkflowsRepository {
  async overview(): Promise<WorkflowOverview> {
    const tasks = admissions.flatMap(instance => instance.tasks.filter(task => task.status !== "completed").map(task => ({ ...task, workflowId: instance.id, subject: instance.candidateName })));
    return { summary: { running: admissions.filter(x => x.status === "running").length, pendingTasks: tasks.length, automatedToday: 34, exceptions: admissions.filter(x => x.status === "exception").length }, definition: { id: "admission_v1", name: "Admissão completa", version: 1, active: true, steps: admissionSteps.map((key, index) => ({ key, name: stepNames[key], description: ["Coleta de dados e aprovação da solicitação", "Solicitação e recebimento dos documentos", "Conferências automáticas e tratamento de divergências", "Geração, envio e aceite do contrato", "Tarefas do primeiro dia e período de experiência"][index], automationCount: [3, 5, 6, 4, 7][index] })) }, tasks, instances: structuredClone(admissions) };
  }
  async list() { return structuredClone(admissions); }
  async find(id: string) { const value = admissions.find(x => x.id === id); return value ? structuredClone(value) : undefined; }
  async create(input: CreateAdmissionInput) {
    const admission = makeAdmission(`adm_${crypto.randomUUID()}`, input.candidateName, "digital_admission", input.companyName, input.position);
    Object.assign(admission, input, { progress: 0, startedAt: new Date().toISOString(), dueAt: daysFromNow(10) }); admissions.unshift(admission); return structuredClone(admission);
  }
  async advance(id: string, note?: string) { const admission = admissions.find(x => x.id === id); return admission ? structuredClone(engine.advance(admission, "Marina Alves", note)) : undefined; }
}
