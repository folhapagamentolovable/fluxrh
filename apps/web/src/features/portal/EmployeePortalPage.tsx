import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  HelpCircle,
  MessageSquarePlus,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ServiceRequest } from "@fluxrh/contracts";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createServiceRequest,
  decidePortalApproval,
  getEmployeePortal,
} from "@/lib/api";
type Tab = "home" | "requests" | "documents" | "team";
const statusLabel: Record<string, string> = {
  submitted: "Enviada",
  in_review: "Em análise",
  waiting_employee: "Aguardando você",
  approved: "Aprovada",
  rejected: "Rejeitada",
  completed: "Concluída",
};
const bank = (m: number) =>
  `${m < 0 ? "−" : ""}${Math.floor(Math.abs(m) / 60)}h ${Math.abs(m) % 60}min`;
export function EmployeePortalPage() {
  const client = useQueryClient(),
    [tab, setTab] = useState<Tab>("home"),
    [newType, setNewType] = useState<ServiceRequest["type"]>(),
    [detail, setDetail] = useState<ServiceRequest>();
  const { data, isLoading } = useQuery({
    queryKey: ["employee-portal"],
    queryFn: getEmployeePortal,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["employee-portal"] });
  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approve" | "reject";
    }) => decidePortalApproval(id, decision, "Decisão registrada pelo gestor."),
    onSuccess: refresh,
  });
  if (isLoading || !data)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  const tabs: [Tab, string][] = [
    ["home", "Meu espaço"],
    ["requests", "Solicitações"],
    ["documents", "Documentos"],
    ["team", "Minha equipe"],
  ];
  return (
    <div className="page portal-page">
      <section className="portal-hero">
        <div>
          <span className="eyebrow">
            <UserRound /> Portal de autoatendimento
          </span>
          <h1>Olá, {data.profile.name.split(" ")[0]}</h1>
          <p>
            {data.profile.position} · {data.profile.department} ·{" "}
            {data.profile.company}
          </p>
        </div>
        <div className="portal-avatar">CM</div>
      </section>
      <div className="module-tabs">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {l}
            {k === "team" &&
              data.approvals.some((x) => x.status === "pending") && (
                <span>
                  {data.approvals.filter((x) => x.status === "pending").length}
                </span>
              )}
          </button>
        ))}
      </div>
      {tab === "home" && (
        <>
          <section className="portal-metrics">
            <article>
              <CalendarDays />
              <div>
                <strong>{data.summary.vacationBalance} dias</strong>
                <small>Saldo de férias</small>
              </div>
            </article>
            <article>
              <Clock3 />
              <div>
                <strong>{bank(data.summary.timeBankMinutes)}</strong>
                <small>Banco de horas</small>
              </div>
            </article>
            <article>
              <MessageSquarePlus />
              <div>
                <strong>{data.summary.openRequests}</strong>
                <small>Solicitações abertas</small>
              </div>
            </article>
            <article>
              <FileText />
              <div>
                <strong>{data.summary.pendingDocuments}</strong>
                <small>Aceite pendente</small>
              </div>
            </article>
          </section>
          <section className="portal-grid">
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">
                    Resolva em poucos cliques
                  </span>
                  <h2>O que você precisa?</h2>
                </div>
              </div>
              <div className="quick-actions">
                {data.quickActions.map((a) => (
                  <button key={a.id} onClick={() => setNewType(a.type)}>
                    <span>
                      {a.type === "vacation" ? (
                        <CalendarDays />
                      ) : a.type === "time_adjustment" ? (
                        <Clock3 />
                      ) : a.type === "document" ? (
                        <FileText />
                      ) : (
                        <HelpCircle />
                      )}
                    </span>
                    <div>
                      <strong>{a.label}</strong>
                      <small>{a.description}</small>
                    </div>
                    <ArrowRight />
                  </button>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Acompanhamento</span>
                  <h2>Últimas solicitações</h2>
                </div>
                <button
                  className="ghost-action"
                  onClick={() => setTab("requests")}
                >
                  Ver todas
                </button>
              </div>
              <RequestList rows={data.requests.slice(0, 3)} open={setDetail} />
            </div>
          </section>
        </>
      )}
      {tab === "requests" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-label">Protocolos e SLA</span>
              <h2>Minhas solicitações</h2>
            </div>
            <button
              className="primary-button"
              onClick={() => setNewType("other")}
            >
              <MessageSquarePlus /> Nova solicitação
            </button>
          </div>
          <RequestList rows={data.requests} open={setDetail} />
        </section>
      )}
      {tab === "documents" && (
        <section className="portal-documents">
          {data.documents.map((d) => (
            <article className="panel" key={d.id}>
              <span className="document-symbol">
                <FileText />
              </span>
              <div>
                <small>{d.category}</small>
                <h2>{d.name}</h2>
                <p>
                  {d.competence ??
                    `Atualizado em ${new Date(d.updatedAt + "T12:00:00").toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <StatusBadge
                tone={d.status === "action_required" ? "amber" : "green"}
              >
                {d.status === "action_required"
                  ? "Aceite necessário"
                  : "Disponível"}
              </StatusBadge>
              <button className="secondary-button" onClick={() => window.print()}>
                {d.status === "action_required" ? "Imprimir para revisão" : "Imprimir documento"}
              </button>
            </article>
          ))}
        </section>
      )}
      {tab === "team" && (
        <section className="portal-grid">
          <div className="panel team-list">
            <div className="panel-heading">
              <div>
                <span className="section-label">Liderança</span>
                <h2>Minha equipe</h2>
              </div>
            </div>
            {data.team.map((m) => (
              <article key={m.employeeId}>
                <span className="calc-avatar">
                  {m.name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)}
                </span>
                <div>
                  <strong>{m.name}</strong>
                  <small>{m.position}</small>
                </div>
                <StatusBadge tone={m.status === "working" ? "green" : "blue"}>
                  {m.status === "working"
                    ? "Trabalhando"
                    : m.status === "vacation"
                      ? "Em férias"
                      : "Afastado"}
                </StatusBadge>
              </article>
            ))}
          </div>
          <div className="panel approvals-list">
            <div className="panel-heading">
              <div>
                <span className="section-label">Decisões</span>
                <h2>Aguardando aprovação</h2>
              </div>
            </div>
            {data.approvals
              .filter((x) => x.status === "pending")
              .map((a) => (
                <article key={a.id}>
                  <div>
                    <strong>
                      {a.type} · {a.employeeName}
                    </strong>
                    <p>{a.description}</p>
                    <small>
                      Solicitado em{" "}
                      {new Date(a.requestedAt + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </small>
                  </div>
                  <span>
                    <button
                      className="reject-button"
                      onClick={() =>
                        decide.mutate({ id: a.id, decision: "reject" })
                      }
                    >
                      <X />
                    </button>
                    <button
                      className="approve-button"
                      onClick={() =>
                        decide.mutate({ id: a.id, decision: "approve" })
                      }
                    >
                      <Check />
                    </button>
                  </span>
                </article>
              ))}
            {!data.approvals.some((x) => x.status === "pending") && (
              <div className="empty-state">
                <ShieldCheck />
                <p>Nenhuma aprovação pendente.</p>
              </div>
            )}
          </div>
        </section>
      )}
      <NewRequest
        type={newType}
        profile={data.profile}
        close={() => setNewType(undefined)}
        done={() => {
          setNewType(undefined);
          refresh();
          setTab("requests");
        }}
      />
      <RequestDetail value={detail} close={() => setDetail(undefined)} />
    </div>
  );
}
function RequestList({
  rows,
  open,
}: {
  rows: ServiceRequest[];
  open: (r: ServiceRequest) => void;
}) {
  return (
    <div className="request-list">
      {rows.map((r) => (
        <button key={r.id} onClick={() => open(r)}>
          <span className={`request-icon ${r.type}`}>
            {r.type === "time_adjustment" ? (
              <Clock3 />
            ) : r.type === "document" ? (
              <FileText />
            ) : (
              <HelpCircle />
            )}
          </span>
          <div>
            <strong>{r.title}</strong>
            <small>
              {r.protocol} · atualizado em{" "}
              {new Date(r.updatedAt).toLocaleDateString("pt-BR")}
            </small>
          </div>
          <span>
            <small>Responsável</small>
            {r.assignedTo}
          </span>
          <StatusBadge
            tone={
              r.status === "completed"
                ? "green"
                : r.status === "waiting_employee"
                  ? "red"
                  : "amber"
            }
          >
            {statusLabel[r.status]}
          </StatusBadge>
          <ArrowRight />
        </button>
      ))}
    </div>
  );
}
function NewRequest({
  type,
  profile,
  close,
  done,
}: {
  type?: ServiceRequest["type"];
  profile: { employeeId: string; name: string };
  close: () => void;
  done: () => void;
}) {
  const titles: Record<string, string> = {
    vacation: "Solicitação de férias",
    time_adjustment: "Ajuste de ponto",
    document: "Solicitação de documento",
    benefit: "Benefício",
    personal_data: "Alteração cadastral",
    payroll_question: "Dúvida sobre folha",
    other: "Falar com o RH",
  };
  const [title, setTitle] = useState(titles[type ?? "other"]);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const mutation = useMutation({
    mutationFn: () =>
      createServiceRequest({
        employeeId: profile.employeeId,
        employeeName: profile.name,
        type: type ?? "other",
        title,
        description,
        priority,
      }),
    onSuccess: done,
  });
  return (
    <Modal
      open={Boolean(type)}
      onClose={close}
      title={titles[type ?? "other"]}
      description="Você poderá acompanhar o protocolo e todas as atualizações."
    >
      <div className="special-form">
        <label>
          Assunto
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Descrição
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descreva o que você precisa e inclua os dados necessários para análise."
          />
        </label>
        <label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="low">Baixa</option><option value="medium">Normal</option><option value="high">Alta</option></select></label>
        <div className="form-note">
          <ShieldCheck />
          <p>
            O FluxRH direcionará automaticamente para o responsável e avisará se
            precisar de mais informações.
          </p>
        </div>
        <footer className="form-actions">
          <button className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button className="primary-button" disabled={title.trim().length < 3 || description.trim().length < 5 || mutation.isPending} onClick={() => mutation.mutate()}>
            Enviar solicitação
          </button>
        </footer>
      </div>
    </Modal>
  );
}
function RequestDetail({
  value,
  close,
}: {
  value?: ServiceRequest;
  close: () => void;
}) {
  return (
    <Modal
      open={Boolean(value)}
      onClose={close}
      title={value?.title ?? "Solicitação"}
      description={
        value ? `${value.protocol} · ${statusLabel[value.status]}` : ""
      }
    >
      {value && (
        <div className="request-detail">
          <p>{value.description}</p>
          <h3>Histórico</h3>
          {value.timeline.map((t) => (
            <article key={t.id}>
              <span />
              <div>
                <strong>{t.action}</strong>
                <p>{t.detail}</p>
                <small>
                  {t.actor} · {new Date(t.occurredAt).toLocaleString("pt-BR")}
                </small>
              </div>
            </article>
          ))}
          <footer className="form-actions">
            <button className="secondary-button" onClick={close}>
              Fechar
            </button>
          </footer>
        </div>
      )}
    </Modal>
  );
}
