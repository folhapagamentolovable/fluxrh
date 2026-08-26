import type { Admission, WorkflowStepKey, WorkflowTask } from "@fluxrh/contracts";

export const admissionSteps: WorkflowStepKey[] = ["digital_admission", "documents", "validation", "contract", "onboarding"];
export const stepNames: Record<WorkflowStepKey, string> = { digital_admission: "Admissão digital", documents: "Documentos", validation: "Validação", contract: "Contrato", onboarding: "Onboarding" };

const taskTemplates: Record<WorkflowStepKey, Array<Pick<WorkflowTask, "title" | "description" | "kind" | "assignee">>> = {
  digital_admission: [{ title: "Conferir solicitação de contratação", description: "Validar cargo, lotação e data prevista.", kind: "approval", assignee: "RH" }, { title: "Enviar convite de pré-admissão", description: "Convite enviado automaticamente para o candidato.", kind: "automatic", assignee: "FluxRH" }],
  documents: [{ title: "Coletar documentos obrigatórios", description: "Acompanhar o envio pelo portal de admissão.", kind: "automatic", assignee: "FluxRH" }, { title: "Resolver documentos rejeitados", description: "Atuar somente quando houver documento inválido.", kind: "human", assignee: "RH" }],
  validation: [{ title: "Validar dados e documentos", description: "CPF, dados pessoais, duplicidades e requisitos do cargo.", kind: "automatic", assignee: "FluxRH" }, { title: "Aprovar divergências", description: "Decisão humana para validações que exigem julgamento.", kind: "approval", assignee: "RH" }],
  contract: [{ title: "Gerar contrato", description: "Preencher o modelo vigente com os dados aprovados.", kind: "automatic", assignee: "FluxRH" }, { title: "Acompanhar aceite", description: "Monitorar o aceite eletrônico e o prazo.", kind: "automatic", assignee: "FluxRH" }],
  onboarding: [{ title: "Preparar primeiro dia", description: "Criar checklist, atribuir responsáveis e comunicar o gestor.", kind: "automatic", assignee: "FluxRH" }, { title: "Confirmar acolhimento", description: "Gestor confirma a recepção e os recursos essenciais.", kind: "human", assignee: "Gestor" }]
};

export class WorkflowEngine {
  createTasks(stepKey: WorkflowStepKey, dueAt: string): WorkflowTask[] {
    return taskTemplates[stepKey].map((template, index) => ({ id: crypto.randomUUID(), ...template, stepKey, status: template.kind === "automatic" && index === 0 ? "completed" : "pending", dueAt, ...(template.kind === "automatic" && index === 0 ? { completedAt: new Date().toISOString() } : {}) }));
  }

  advance(admission: Admission, actor = "Marina Alves", note?: string): Admission {
    if (admission.status === "completed") return admission;
    const now = new Date().toISOString();
    admission.tasks.filter(task => task.stepKey === admission.currentStep && task.status !== "completed").forEach(task => { task.status = "completed"; task.completedAt = now; });
    this.applyStepEffects(admission, admission.currentStep, now);
    admission.history.unshift({ id: crypto.randomUUID(), title: `${stepNames[admission.currentStep]} concluída`, description: note || "Etapa concluída e validada.", actor, occurredAt: now, type: "user" });
    const index = admissionSteps.indexOf(admission.currentStep);
    if (index === admissionSteps.length - 1) {
      admission.status = "completed"; admission.progress = 100;
      admission.history.unshift({ id: crypto.randomUUID(), title: "Admissão concluída", description: "Colaborador pronto para iniciar suas atividades.", actor: "FluxRH", occurredAt: now, type: "system" });
      return admission;
    }
    admission.currentStep = admissionSteps[index + 1];
    admission.progress = Math.round(((index + 1) / admissionSteps.length) * 100);
    admission.status = "running";
    admission.tasks.push(...this.createTasks(admission.currentStep, admission.dueAt));
    admission.history.unshift({ id: crypto.randomUUID(), title: `${stepNames[admission.currentStep]} iniciada`, description: "Tarefas e automações da etapa foram preparadas.", actor: "FluxRH", occurredAt: now, type: "system" });
    return admission;
  }

  private applyStepEffects(admission: Admission, step: WorkflowStepKey, now: string) {
    if (step === "documents") admission.documents.forEach(document => { document.status = "valid"; });
    if (step === "validation") admission.validations.forEach(validation => { validation.status = "approved"; validation.detail = "Validação concluída"; });
    if (step === "contract") admission.contract = { status: "accepted", generatedAt: now, acceptedAt: now };
    if (step === "onboarding") admission.onboarding.checklistCompleted = admission.onboarding.checklistTotal;
  }
}
