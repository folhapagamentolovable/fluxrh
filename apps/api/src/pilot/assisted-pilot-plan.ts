export type AssistedPilotProfile = "small_company" | "multi_site_company" | "hr_advisory";
export type AssistedPilotCycle = { id: string; purpose: string; officialPayrollReplacement: false; entryGate: string[]; exitGate: string[] };

export const assistedPilotPlan = {
  id: "assisted_pilot_v1",
  status: "synthetic_external_execution_completed",
  profiles: [
    { id: "small_company" as const, targetHeadcount: "20–80", objective: "Validar adoção, cadastro, documentos, ponto e ausências com equipe enxuta." },
    { id: "multi_site_company" as const, targetHeadcount: "80–300", objective: "Validar isolamento, postos, escalas, aprovações e consolidação entre unidades." },
    { id: "hr_advisory" as const, targetHeadcount: "consultivo", objective: "Validar conferência de regras, divergências, relatórios e rastreabilidade para DP/RH." },
  ],
  roles: {
    sponsor: "Responsável executivo do cliente",
    clientCoordinator: "Responsável operacional de RH/DP do cliente",
    productOwner: "Responsável de produto FluxRH",
    supportLead: "Responsável por triagem e comunicação de incidentes",
    securityLead: "Responsável por acessos, privacidade e resposta a incidentes",
  },
  cycles: [
    cycle("cycle_1", "Validar dados, jornadas e prévias em paralelo; a folha atual permanece como única fonte oficial."),
    cycle("cycle_2", "Repetir a competência após correções e comprovar estabilidade, reconciliação e aceite."),
  ],
  severitySlaHours: { critical: 1, high: 4, medium: 16, low: 40 },
  requiredArtifacts: ["termo de participação", "matriz de acessos", "inventário de dados", "comparativo por competência", "registro de decisões", "relatório de divergências", "aceite formal"],
  productionGate: { minimumParallelCycles: 2, maximumCriticalDivergences: 0, requiresFormalApproval: true, requiresPrioritizedBacklog: true },
} as const;

function cycle(id: string, purpose: string): AssistedPilotCycle {
  return {
    id,
    purpose,
    officialPayrollReplacement: false,
    entryGate: ["termo assinado", "responsáveis nomeados", "acessos mínimos aprovados", "backup e rollback verificados", "dados sintéticos ou minimizados preparados"],
    exitGate: ["jornadas críticas executadas", "comparativo concluído", "divergências classificadas", "decisões registradas", "incidentes críticos zerados"],
  };
}

export function validateAssistedPilotReadiness() {
  const uniqueProfiles = new Set(assistedPilotPlan.profiles.map((profile) => profile.id));
  const safeCycles = assistedPilotPlan.cycles.every((cycle) => cycle.officialPayrollReplacement === false && cycle.entryGate.length >= 5 && cycle.exitGate.length >= 5);
  return { ready: uniqueProfiles.size === 3 && assistedPilotPlan.cycles.length >= 2 && safeCycles, profileCount: uniqueProfiles.size, cycleCount: assistedPilotPlan.cycles.length };
}
