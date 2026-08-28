import type {
  CreateServiceRequestInput,
  EmployeePortalOverview,
  ServiceRequest,
} from "@fluxrh/contracts";
const now = "2026-08-26T14:00:00.000Z";
const requests: ServiceRequest[] = [
  {
    id: "req_1",
    protocol: "FLX-2026-0041",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    type: "time_adjustment",
    title: "Ajuste de marcação",
    description: "Esqueci de registrar a saída em 22/08.",
    status: "in_review",
    priority: "medium",
    createdAt: "2026-08-23T13:20:00.000Z",
    updatedAt: now,
    assignedTo: "Marina Souza",
    dueAt: "2026-08-28",
    timeline: [
      {
        id: "tl_1",
        actor: "Carlos Mendes",
        action: "Solicitação criada",
        detail: "Pedido enviado para análise do gestor.",
        occurredAt: "2026-08-23T13:20:00.000Z",
      },
      {
        id: "tl_2",
        actor: "FluxRH",
        action: "Encaminhamento automático",
        detail: "Responsável definido conforme departamento.",
        occurredAt: "2026-08-23T13:20:02.000Z",
      },
    ],
  },
  {
    id: "req_2",
    protocol: "FLX-2026-0038",
    employeeId: "emp_carlos",
    employeeName: "Carlos Mendes",
    type: "document",
    title: "Declaração de vínculo",
    description: "Documento para apresentação bancária.",
    status: "completed",
    priority: "low",
    createdAt: "2026-08-18T10:00:00.000Z",
    updatedAt: "2026-08-18T10:02:00.000Z",
    assignedTo: "FluxRH",
    dueAt: "2026-08-20",
    timeline: [
      {
        id: "tl_3",
        actor: "FluxRH",
        action: "Documento gerado",
        detail: "Declaração disponibilizada no portal.",
        occurredAt: "2026-08-18T10:02:00.000Z",
      },
    ],
  },
];
const approvals: EmployeePortalOverview["approvals"] = [
  {
    id: "apr_1",
    employeeName: "Beatriz Lima",
    type: "Férias",
    description: "20 dias a partir de 14/09/2026",
    requestedAt: "2026-08-25",
    status: "pending",
  },
  {
    id: "apr_2",
    employeeName: "Paulo Ribeiro",
    type: "Ajuste de ponto",
    description: "Inclusão de saída em 25/08 às 18:04",
    requestedAt: "2026-08-26",
    status: "pending",
  },
];
export class InMemoryPortalRepository {
  hydrate(state: Record<string, unknown>) {
    const value = state as unknown as EmployeePortalOverview;
    requests.splice(0, requests.length, ...structuredClone(value.requests));
    approvals.splice(0, approvals.length, ...structuredClone(value.approvals));
  }

  async overview(): Promise<EmployeePortalOverview> {
    return structuredClone({
      profile: {
        employeeId: "emp_carlos",
        name: "Carlos Mendes",
        registration: "FLX-101",
        position: "Supervisor de Operações",
        department: "Operações",
        company: "Flux Serviços Ltda.",
        manager: "Marina Souza",
        email: "carlos.mendes@flux.local",
        phone: "(11) 99876-4321",
      },
      summary: {
        vacationBalance: 22,
        timeBankMinutes: 348,
        openRequests: requests.filter(
          (x) => !["completed", "rejected"].includes(x.status),
        ).length,
        pendingDocuments: 1,
      },
      quickActions: [
        {
          id: "qa_1",
          label: "Solicitar férias",
          description: "Escolha o período e acompanhe a aprovação.",
          type: "vacation",
        },
        {
          id: "qa_2",
          label: "Ajustar ponto",
          description: "Informe uma marcação ausente ou incorreta.",
          type: "time_adjustment",
        },
        {
          id: "qa_3",
          label: "Pedir documento",
          description: "Solicite declarações e comprovantes.",
          type: "document",
        },
        {
          id: "qa_4",
          label: "Falar com o RH",
          description: "Abra uma solicitação e acompanhe o SLA.",
          type: "other",
        },
      ],
      documents: [
        {
          id: "pd_1",
          name: "Holerite",
          category: "Folha de pagamento",
          competence: "08/2026",
          status: "available",
          updatedAt: "2026-08-25",
        },
        {
          id: "pd_2",
          name: "Espelho de ponto",
          category: "Jornada",
          competence: "08/2026",
          status: "available",
          updatedAt: "2026-08-26",
        },
        {
          id: "pd_3",
          name: "Política de segurança",
          category: "Aceite eletrônico",
          status: "action_required",
          updatedAt: "2026-08-22",
        },
        {
          id: "pd_4",
          name: "Informe de rendimentos",
          category: "Fiscal",
          competence: "2025",
          status: "available",
          updatedAt: "2026-02-27",
        },
      ],
      requests,
      team: [
        {
          employeeId: "emp_beatriz",
          name: "Beatriz Lima",
          position: "Assistente operacional",
          status: "working",
          pendingItems: 1,
        },
        {
          employeeId: "emp_paulo",
          name: "Paulo Ribeiro",
          position: "Vigilante",
          status: "working",
          pendingItems: 1,
        },
        {
          employeeId: "emp_ana",
          name: "Ana Paula Rocha",
          position: "Analista sênior",
          status: "vacation",
          pendingItems: 0,
        },
      ],
      approvals,
    });
  }
  async create(input: CreateServiceRequestInput) {
    const value: ServiceRequest = {
      id: `req_${crypto.randomUUID()}`,
      protocol: `FLX-2026-${String(requests.length + 42).padStart(4, "0")}`,
      ...input,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: input.type === "time_adjustment" ? "Gestor direto" : "FluxRH",
      dueAt: "2026-09-02",
      timeline: [
        {
          id: `tl_${crypto.randomUUID()}`,
          actor: input.employeeName,
          action: "Solicitação criada",
          detail: "Solicitação registrada pelo portal.",
          occurredAt: new Date().toISOString(),
        },
      ],
    };
    requests.unshift(value);
    return structuredClone(value);
  }
  async decide(id: string, decision: "approve" | "reject", note: string) {
    const value = approvals.find((x) => x.id === id);
    if (!value) return;
    value.status = decision === "approve" ? "approved" : "rejected";
    value.description += ` · ${note}`;
    return structuredClone(value);
  }
}
