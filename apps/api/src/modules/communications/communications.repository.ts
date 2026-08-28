import type {
  Announcement,
  CommunicationsOverview,
  CreateAnnouncementInput,
  EmitNotificationInput,
  Notification,
} from "@fluxrh/contracts";
const notifications: Notification[] = [
  {
    id: "not_1",
    recipientId: "emp_carlos",
    recipientName: "Carlos Mendes",
    title: "Ajuste de ponto aguardando ação",
    message: "A marcação de 25/08 precisa ser revisada até amanhã.",
    priority: "critical",
    source: "time",
    eventKey: "time.exception:tex_9:emp_carlos",
    actionLabel: "Revisar ponto",
    actionPath: "/jornada",
    createdAt: "2026-08-26T12:40:00.000Z",
    status: "unread",
  },
  {
    id: "not_2",
    recipientId: "emp_carlos",
    recipientName: "Carlos Mendes",
    title: "Holerite disponível",
    message: "Seu holerite da competência 08/2026 já está disponível.",
    priority: "informational",
    source: "payroll",
    eventKey: "payroll.receipt:2026-08:emp_carlos",
    actionLabel: "Visualizar",
    actionPath: "/portal",
    createdAt: "2026-08-26T10:15:00.000Z",
    readAt: "2026-08-26T10:32:00.000Z",
    status: "read",
  },
  {
    id: "not_3",
    recipientId: "usr_marina",
    recipientName: "Marina Souza",
    title: "Aprovação de férias pendente",
    message: "Beatriz Lima solicitou 20 dias de férias.",
    priority: "important",
    source: "absence",
    eventKey: "vacation.approval:vac_2:usr_marina",
    actionLabel: "Decidir",
    actionPath: "/portal",
    createdAt: "2026-08-25T16:20:00.000Z",
    status: "unread",
  },
  {
    id: "not_4",
    recipientId: "emp_beatriz",
    recipientName: "Beatriz Lima",
    title: "Aceite obrigatório",
    message: "A Política de Segurança foi atualizada e requer seu aceite.",
    priority: "important",
    source: "document",
    eventKey: "document.acceptance:pd_3:emp_beatriz",
    actionLabel: "Ler e aceitar",
    actionPath: "/documentos",
    createdAt: "2026-08-24T09:00:00.000Z",
    readAt: "2026-08-24T09:08:00.000Z",
    status: "read",
  },
];
const announcements: Announcement[] = [
  {
    id: "ann_1",
    title: "Atualização da política de segurança",
    message: "Leia a nova política e confirme o aceite até 30/08.",
    audience: "Todos os colaboradores",
    priority: "important",
    status: "published",
    publishedAt: "2026-08-24T09:00:00.000Z",
    requiresAcknowledgement: true,
    recipients: 84,
    readCount: 69,
    acknowledgedCount: 52,
    createdBy: "Marina Souza",
  },
  {
    id: "ann_2",
    title: "Campanha Setembro Amarelo",
    message: "Programação de ações de conscientização e canais de acolhimento.",
    audience: "Todos os colaboradores",
    priority: "informational",
    status: "scheduled",
    scheduledAt: "2026-09-01T08:00:00.000Z",
    requiresAcknowledgement: false,
    recipients: 84,
    readCount: 0,
    acknowledgedCount: 0,
    createdBy: "Marina Souza",
  },
];
const templates: CommunicationsOverview["templates"] = [
  {
    id: "tpl_1",
    name: "Documento vencendo",
    event: "document.expiring",
    title: "Documento vence em {{days}} dias",
    message: "O documento {{document}} precisa ser atualizado.",
    variables: ["days", "document", "employee"],
    active: true,
  },
  {
    id: "tpl_2",
    name: "Exceção de ponto",
    event: "time.exception.created",
    title: "Marcação requer conferência",
    message: "Revise a ocorrência de {{date}} até {{deadline}}.",
    variables: ["date", "deadline", "employee"],
    active: true,
  },
  {
    id: "tpl_3",
    name: "Holerite publicado",
    event: "payroll.receipt.available",
    title: "Holerite disponível",
    message: "A competência {{competence}} está disponível no portal.",
    variables: ["competence", "employee"],
    active: true,
  },
];
const rules: CommunicationsOverview["rules"] = [
  {
    id: "rule_1",
    name: "Exceção crítica de ponto",
    event: "time.exception.created",
    audience: "Colaborador e gestor",
    priority: "critical",
    deduplicationHours: 24,
    escalateAfterHours: 12,
    escalateTo: "RH",
    active: true,
    triggeredCount: 18,
  },
  {
    id: "rule_2",
    name: "Documento a vencer",
    event: "document.expiring",
    audience: "Colaborador",
    priority: "important",
    deduplicationHours: 72,
    escalateAfterHours: 48,
    escalateTo: "Gestor",
    active: true,
    triggeredCount: 11,
  },
  {
    id: "rule_3",
    name: "Holerite liberado",
    event: "payroll.receipt.available",
    audience: "Colaborador",
    priority: "informational",
    deduplicationHours: 720,
    active: true,
    triggeredCount: 84,
  },
];
export class InMemoryCommunicationsRepository {
  hydrate(state: Record<string, unknown>) {
    const value = state as unknown as CommunicationsOverview;
    notifications.splice(0, notifications.length, ...structuredClone(value.notifications));
    announcements.splice(0, announcements.length, ...structuredClone(value.announcements));
    templates.splice(0, templates.length, ...structuredClone(value.templates));
    rules.splice(0, rules.length, ...structuredClone(value.rules));
  }

  async overview(): Promise<CommunicationsOverview> {
    const published = announcements.filter((x) => x.status === "published");
    const recipients = published.reduce((s, x) => s + x.recipients, 0),
      reads = published.reduce((s, x) => s + x.readCount, 0);
    return structuredClone({
      summary: {
        unread: notifications.filter((x) => x.status === "unread").length,
        critical: notifications.filter(
          (x) => x.priority === "critical" && x.status !== "acknowledged",
        ).length,
        scheduled: announcements.filter((x) => x.status === "scheduled").length,
        awaitingAcknowledgement: published.reduce(
          (s, x) =>
            s +
            (x.requiresAcknowledgement
              ? x.recipients - x.acknowledgedCount
              : 0),
          0,
        ),
        readRate: recipients ? Math.round((reads / recipients) * 100) : 0,
        automatedToday: 27,
      },
      notifications,
      announcements,
      templates,
      rules,
    });
  }
  async markRead(id: string) {
    const value = notifications.find((x) => x.id === id);
    if (!value) return;
    if (value.status === "unread") {
      value.status = "read";
      value.readAt = new Date().toISOString();
    }
    return structuredClone(value);
  }
  async acknowledge(id: string) {
    const value = notifications.find((x) => x.id === id);
    if (!value) return;
    value.status = "acknowledged";
    value.readAt ??= new Date().toISOString();
    value.acknowledgedAt = new Date().toISOString();
    return structuredClone(value);
  }
  async createAnnouncement(input: CreateAnnouncementInput) {
    const scheduled = Boolean(input.scheduledAt);
    const value: Announcement = {
      id: `ann_${crypto.randomUUID()}`,
      ...input,
      status: scheduled ? "scheduled" : "published",
      publishedAt: scheduled ? undefined : new Date().toISOString(),
      recipients: input.audience.includes("Operações") ? 36 : 84,
      readCount: 0,
      acknowledgedCount: 0,
      createdBy: "Marina Souza",
    };
    announcements.unshift(value);
    return structuredClone(value);
  }
  async emit(input: EmitNotificationInput) {
    const duplicate = notifications.find(
      (x) =>
        x.eventKey === input.eventKey && x.recipientId === input.recipientId,
    );
    if (duplicate) return { data: structuredClone(duplicate), duplicate: true };
    const value: Notification = {
      id: `not_${crypto.randomUUID()}`,
      ...input,
      createdAt: new Date().toISOString(),
      status: "unread",
    };
    notifications.unshift(value);
    return { data: structuredClone(value), duplicate: false };
  }
  async escalate() {
    const source = notifications.find((x) => x.id === "not_1");
    if (!source) return;
    return this.emit({
      recipientId: "usr_rh",
      recipientName: "Equipe de RH",
      title: `Escalonamento: ${source.title}`,
      message: `Sem ação do responsável. ${source.message}`,
      priority: "critical",
      source: "system",
      eventKey: `escalation:${source.eventKey}`,
      actionLabel: source.actionLabel,
      actionPath: source.actionPath,
    });
  }
}
