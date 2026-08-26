import type { WorkflowStepKey } from "@fluxrh/contracts";
export const stepLabels: Record<WorkflowStepKey, string> = { digital_admission: "Admissão digital", documents: "Documentos", validation: "Validação", contract: "Contrato", onboarding: "Onboarding" };
export const stepOrder: WorkflowStepKey[] = ["digital_admission", "documents", "validation", "contract", "onboarding"];
