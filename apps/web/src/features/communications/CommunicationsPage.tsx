import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Megaphone,
  Plus,
  Send,
  Settings2,
  ShieldAlert,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import type { Notification } from "@fluxrh/contracts";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  acknowledgeNotification,
  createAnnouncement,
  getCommunications,
  markNotificationRead,
  runCommunicationEscalations,
  sendExternalEmail,
} from "@/lib/api";
type Tab = "inbox" | "announcements" | "templates" | "rules";
const sourceLabel: Record<string, string> = {
  workflow: "Workflow",
  document: "Documentos",
  time: "Jornada",
  absence: "Férias e ausências",
  payroll: "Folha",
  benefit: "Benefícios",
  termination: "Desligamentos",
  announcement: "Comunicado",
  system: "Sistema",
};
const priorityLabel: Record<string, string> = {
  informational: "Informativa",
  important: "Importante",
  critical: "Crítica",
};
export function CommunicationsPage() {
  const client = useQueryClient(),
    [tab, setTab] = useState<Tab>("inbox"),
    [detail, setDetail] = useState<Notification>(),
    [newOpen, setNewOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["communications"],
    queryFn: getCommunications,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["communications"] });
  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
  });
  const acknowledge = useMutation({
    mutationFn: acknowledgeNotification,
    onSuccess: async () => {
      await refresh();
      setDetail(undefined);
    },
  });
  const escalate = useMutation({
    mutationFn: runCommunicationEscalations,
    onSuccess: refresh,
  });
  if (isLoading || !data)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  const openNotification = (n: Notification) => {
    setDetail(n);
    if (n.status === "unread") read.mutate(n.id);
  };
  const tabs: [Tab, string][] = [
    ["inbox", "Caixa de entrada"],
    ["announcements", "Comunicados"],
    ["templates", "Modelos"],
    ["rules", "Regras e eventos"],
  ];
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <Megaphone /> Comunicação orientada a eventos
          </span>
          <h1>Central de comunicação</h1>
          <p>
            Mensagens certas, para as pessoas certas, no momento em que cada
            processo exige atenção.
          </p>
        </div>
        <button className="primary-button" onClick={() => setNewOpen(true)}>
          <Plus /> Novo comunicado
        </button>
      </section>
      <div className="module-tabs">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {l}
            {k === "inbox" && data.summary.unread > 0 && (
              <span>{data.summary.unread}</span>
            )}
          </button>
        ))}
      </div>
      <section className="communication-metrics">
        {(
          [
            ["Não lidas", data.summary.unread, BellRing, "blue"],
            ["Críticas", data.summary.critical, ShieldAlert, "red"],
            ["Agendadas", data.summary.scheduled, Clock3, "purple"],
            [
              "Aguardam aceite",
              data.summary.awaitingAcknowledgement,
              CheckCheck,
              "amber",
            ],
            [
              "Taxa de leitura",
              `${data.summary.readRate}%`,
              UsersRound,
              "green",
            ],
          ] as const
        ).map(([l, v, I, t]) => (
          <article key={l}>
            <span className={`metric-icon ${t}`}>
              <I />
            </span>
            <strong>{v}</strong>
            <small>{l}</small>
          </article>
        ))}
      </section>
      {tab === "inbox" && (
        <section className="communication-layout">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-label">Prioridade e ação</span>
                <h2>Notificações</h2>
              </div>
              <StatusBadge tone="blue">
                {data.summary.automatedToday} automáticas hoje
              </StatusBadge>
            </div>
            <div className="notification-list">
              {data.notifications.map((n) => (
                <button
                  key={n.id}
                  className={n.status === "unread" ? "unread" : ""}
                  onClick={() => openNotification(n)}
                >
                  <span className={`notification-dot ${n.priority}`} />
                  <div>
                    <span>
                      <strong>{n.title}</strong>
                      {n.status === "unread" && <i />}
                    </span>
                    <p>{n.message}</p>
                    <small>
                      {sourceLabel[n.source]} · {n.recipientName} ·{" "}
                      {new Date(n.createdAt).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  <StatusBadge
                    tone={
                      n.priority === "critical"
                        ? "red"
                        : n.priority === "important"
                          ? "amber"
                          : "blue"
                    }
                  >
                    {priorityLabel[n.priority]}
                  </StatusBadge>
                  <ArrowUpRight />
                </button>
              ))}
            </div>
          </div>
          <aside className="panel escalation-panel">
            <span className="section-label">Autonomia supervisionada</span>
            <h2>Escalonamento</h2>
            <div className="escalation-visual">
              <Workflow />
              <span />
              <BellRing />
              <span />
              <UsersRound />
            </div>
            <p>
              Itens críticos sem ação são encaminhados ao próximo responsável,
              sem gerar mensagens duplicadas.
            </p>
            <dl>
              <div>
                <dt>Prazo padrão</dt>
                <dd>12 horas</dd>
              </div>
              <div>
                <dt>Destino</dt>
                <dd>RH responsável</dd>
              </div>
            </dl>
            <button
              className="secondary-button"
              onClick={() => escalate.mutate()}
            >
              <AlertTriangle /> Executar verificação
            </button>
          </aside>
        </section>
      )}
      {tab === "announcements" && (
        <section className="announcement-grid">
          {data.announcements.map((a) => (
            <article className="panel" key={a.id}>
              <header>
                <span className={`announcement-icon ${a.priority}`}>
                  <Megaphone />
                </span>
                <StatusBadge tone={a.status === "published" ? "green" : "blue"}>
                  {a.status === "published" ? "Publicado" : "Agendado"}
                </StatusBadge>
              </header>
              <h2>{a.title}</h2>
              <p>{a.message}</p>
              <small>
                {a.audience} · por {a.createdBy}
              </small>
              <div className="announcement-progress">
                <span>
                  <strong>{a.readCount}</strong>
                  <small>leituras de {a.recipients}</small>
                </span>
                {a.requiresAcknowledgement && (
                  <span>
                    <strong>{a.acknowledgedCount}</strong>
                    <small>aceites</small>
                  </span>
                )}
              </div>
              <div className="progress">
                <i
                  style={{
                    width: `${a.recipients ? Math.round((a.readCount / a.recipients) * 100) : 0}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </section>
      )}
      {tab === "templates" && (
        <section className="panel templates-list">
          <div className="panel-heading">
            <div>
              <span className="section-label">Conteúdo reutilizável</span>
              <h2>Modelos automáticos</h2>
            </div>
          </div>
          {data.templates.map((t) => (
            <article key={t.id}>
              <span className="template-icon">
                <FileText />
              </span>
              <div>
                <strong>{t.name}</strong>
                <p>{t.title}</p>
                <small>
                  {t.event} · variáveis:{" "}
                  {t.variables.map((v) => `{{${v}}}`).join(", ")}
                </small>
              </div>
              <StatusBadge tone="green">Ativo</StatusBadge>
            </article>
          ))}
        </section>
      )}
      {tab === "rules" && (
        <section className="rules-grid">
          {data.rules.map((r) => (
            <article className="panel" key={r.id}>
              <header>
                <span className="metric-icon purple">
                  <Settings2 />
                </span>
                <StatusBadge tone="green">Ativa</StatusBadge>
              </header>
              <h2>{r.name}</h2>
              <p>
                <code>{r.event}</code>
              </p>
              <dl>
                <div>
                  <dt>Destinatários</dt>
                  <dd>{r.audience}</dd>
                </div>
                <div>
                  <dt>Antiduplicidade</dt>
                  <dd>{r.deduplicationHours}h</dd>
                </div>
                <div>
                  <dt>Escalonamento</dt>
                  <dd>
                    {r.escalateAfterHours
                      ? `${r.escalateAfterHours}h → ${r.escalateTo}`
                      : "Não aplicável"}
                  </dd>
                </div>
                <div>
                  <dt>Acionamentos</dt>
                  <dd>{r.triggeredCount}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
      <NotificationDetail
        value={detail}
        close={() => setDetail(undefined)}
        acknowledge={(id) => acknowledge.mutate(id)}
      />
      <NewAnnouncement
        open={newOpen}
        close={() => setNewOpen(false)}
        done={() => {
          setNewOpen(false);
          refresh();
          setTab("announcements");
        }}
      />
    </div>
  );
}
function NotificationDetail({
  value,
  close,
  acknowledge,
}: {
  value?: Notification;
  close: () => void;
  acknowledge: (id: string) => void;
}) {
  return (
    <Modal
      open={Boolean(value)}
      onClose={close}
      title={value?.title ?? "Notificação"}
      description={
        value
          ? `${sourceLabel[value.source]} · ${priorityLabel[value.priority]}`
          : ""
      }
    >
      {value && (
        <div className="notification-detail">
          <div className={`detail-priority ${value.priority}`}>
            <BellRing />
            <p>{value.message}</p>
          </div>
          <dl>
            <div>
              <dt>Destinatário</dt>
              <dd>{value.recipientName}</dd>
            </div>
            <div>
              <dt>Evento</dt>
              <dd>
                <code>{value.eventKey}</code>
              </dd>
            </div>
            <div>
              <dt>Criada em</dt>
              <dd>{new Date(value.createdAt).toLocaleString("pt-BR")}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {value.status === "acknowledged"
                  ? "Confirmada"
                  : value.status === "read"
                    ? "Lida"
                    : "Não lida"}
              </dd>
            </div>
          </dl>
          <footer className="form-actions">
            <button className="secondary-button" onClick={close}>
              Fechar
            </button>
            <button
              className="primary-button"
              disabled={value.status === "acknowledged"}
              onClick={() => acknowledge(value.id)}
            >
              <Check /> Confirmar ciência
            </button>
          </footer>
        </div>
      )}
    </Modal>
  );
}
function NewAnnouncement({
  open,
  close,
  done,
}: {
  open: boolean;
  close: () => void;
  done: () => void;
}) {
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [title, setTitle] = useState("Comunicado interno");
  const [message, setMessage] = useState(
    "Nova orientação disponível para os colaboradores. Consulte os detalhes no portal.",
  );
  const [audience, setAudience] = useState("Todos os colaboradores");
  const [priority, setPriority] = useState<
    "informational" | "important" | "critical"
  >("important");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [recipients, setRecipients] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const announcement=await createAnnouncement({
        title,
        message,
        audience,
        priority,
        requiresAcknowledgement: true,
        scheduledAt: scheduled ? new Date(scheduledAt).toISOString() : undefined,
      });
      if (emailEnabled)
        await sendExternalEmail({
          to: recipients.split(/[;,\s]+/).filter(Boolean),
          subject: title,
          text: message,
          idempotencyKey: `announcement-${announcement.id}`,
        });
      return announcement;
    },
    onSuccess: done,
  });
  return (
    <Modal
      open={open}
      onClose={close}
      title="Novo comunicado"
      description="Publique agora ou programe a entrega para o público escolhido."
    >
      <div className="special-form">
        <label>
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Mensagem
          <textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Público
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
            >
              <option>Todos os colaboradores</option>
              <option>Departamento de Operações</option>
              <option>Gestores</option>
            </select>
          </label>
          <label>
            Prioridade
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as typeof priority)
              }
            >
              <option value="important">Importante</option>
              <option value="informational">Informativa</option>
              <option value="critical">Crítica</option>
            </select>
          </label>
        </div>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={scheduled}
            onChange={(e) => setScheduled(e.target.checked)}
          />
          <span>Agendar publicação</span>
        </label>
        {scheduled && <label>Data e hora<input type="datetime-local" value={scheduledAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setScheduledAt(event.target.value)} /></label>}
        <label className="switch-row">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(event) => setEmailEnabled(event.target.checked)}
          />
          <span>Também enviar por e-mail (Resend)</span>
        </label>
        {emailEnabled && (
          <label>
            Destinatários por e-mail
            <input
              type="text"
              placeholder="pessoa@empresa.com; equipe@empresa.com"
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
            />
          </label>
        )}
        {mutation.error && (
          <p className="form-error" role="alert">
            Não foi possível concluir a publicação e o envio. Verifique a
            configuração do Resend e a lista de destinatários.
          </p>
        )}
        <footer className="form-actions">
          <button className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={
              mutation.isPending ||
              title.trim().length < 3 ||
              message.trim().length < 5 ||
              (scheduled && !scheduledAt) ||
              (emailEnabled && !recipients.includes("@"))
            }
            onClick={() => mutation.mutate()}
          >
            <Send /> {scheduled ? "Agendar" : "Publicar"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
