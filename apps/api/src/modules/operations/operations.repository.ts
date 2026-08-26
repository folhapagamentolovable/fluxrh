import type { DashboardSnapshot } from "@fluxrh/contracts";

export interface OperationsRepository {
  getDashboard(): Promise<DashboardSnapshot>;
}

const snapshot: DashboardSnapshot = {
  organization: { id: "org_flux", name: "Grupo Flux", document: "12.345.678/0001-90" },
  metrics: { activeEmployees: 148, openExceptions: 7, workflowsRunning: 23, automationRate: 91.4 },
  exceptions: [
    { id: "exc_1", title: "Documento de admissão ilegível", description: "O comprovante de residência precisa ser reenviado.", employeeName: "Marina Souza", area: "Admissão", priority: "high", status: "open", dueAt: "2026-08-25T20:00:00.000Z", createdAt: "2026-08-25T13:20:00.000Z" },
    { id: "exc_2", title: "Marcação de ponto ausente", description: "Não há marcação de saída no turno de ontem.", employeeName: "Carlos Mendes", area: "Ponto", priority: "medium", status: "open", dueAt: "2026-08-26T15:00:00.000Z", createdAt: "2026-08-25T10:05:00.000Z" },
    { id: "exc_3", title: "Férias próximas do limite", description: "Período concessivo termina em 42 dias.", employeeName: "Beatriz Lima", area: "Férias", priority: "critical", status: "in_review", dueAt: "2026-08-25T18:00:00.000Z", createdAt: "2026-08-24T12:00:00.000Z" }
  ],
  workflows: [
    { id: "wf_1", name: "Admissão digital", subject: "Marina Souza", progress: 72, currentStep: "Validação de documentos" },
    { id: "wf_2", name: "Programação de férias", subject: "Rafael Alves", progress: 48, currentStep: "Aguardando gestor" },
    { id: "wf_3", name: "Onboarding", subject: "Camila Rocha", progress: 86, currentStep: "Treinamento obrigatório" }
  ]
};

export class InMemoryOperationsRepository implements OperationsRepository {
  async getDashboard() { return structuredClone(snapshot); }
}
