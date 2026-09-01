import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardPlus,
  FileCheck2,
  FileText,
  HeartPulse,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type { OccupationalExam } from "@fluxrh/contracts";
import { Modal } from "@/components/ui/Modal";
import { BrazilianDateInput } from "@/components/ui/BrazilianDateInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  completeOccupationalExam,
  createOccupationalExam,
  getEmployees,
  getOccupationalHealth,
  resolveOccupationalException,
} from "@/lib/api";
type Tab =
  "overview" | "exams" | "calendar" | "risks" | "programs" | "exceptions";
const typeLabel: Record<string, string> = {
  admission: "Admissional",
  periodic: "Periódico",
  return_to_work: "Retorno ao trabalho",
  risk_change: "Mudança de risco",
  termination: "Demissional",
};
const resultLabel: Record<string, string> = {
  pending: "Pendente",
  fit: "Apto",
  unfit: "Inapto",
  fit_with_restrictions: "Apto com restrições",
};
export function OccupationalHealthPage() {
  const client = useQueryClient(),
    [tab, setTab] = useState<Tab>("overview"),
    [detail, setDetail] = useState<OccupationalExam>(),
    [newOpen, setNewOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["occupational-health"],
    queryFn: getOccupationalHealth,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["occupational-health"] });
  const resolve = useMutation({
    mutationFn: (id: string) =>
      resolveOccupationalException(
        id,
        "Pendência regularizada e evidência documental conferida.",
      ),
    onSuccess: refresh,
  });
  if (isLoading || !data)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  const tabs: [Tab, string][] = [
    ["overview", "Visão geral"],
    ["exams", "Exames e ASOs"],
    ["calendar", "Agenda"],
    ["risks", "Riscos por função"],
    ["programs", "Programas e laudos"],
    ["exceptions", "Exceções"],
  ];
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <Activity /> Saúde e segurança do trabalho
          </span>
          <h1>Saúde ocupacional</h1>
          <p>
            Controle aptidão, vencimentos e riscos funcionais com privacidade e
            intervenção humana nas exceções.
          </p>
        </div>
        <button className="primary-button" onClick={() => setNewOpen(true)}>
          <Plus /> Agendar exame
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
            {k === "exceptions" && data.summary.openExceptions > 0 && (
              <span>{data.summary.openExceptions}</span>
            )}
          </button>
        ))}
      </div>
      <section className="occupational-metrics">
        {(
          [
            [
              "Conformidade",
              `${data.summary.complianceRate}%`,
              ShieldCheck,
              "green",
            ],
            [
              "Vencem em 30 dias",
              data.summary.examsDue30Days,
              CalendarClock,
              "blue",
            ],
            [
              "Exames vencidos",
              data.summary.overdueExams,
              AlertTriangle,
              "red",
            ],
            [
              "Com restrições",
              data.summary.restrictedEmployees,
              UserCheck,
              "amber",
            ],
            [
              "Programas a vencer",
              data.summary.expiringPrograms,
              FileText,
              "purple",
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
      {tab === "overview" && (
        <section className="occupational-layout">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-label">Próximas ações</span>
                <h2>Exames ocupacionais</h2>
              </div>
            </div>
            <ExamRows rows={data.exams} open={setDetail} />
          </div>
          <aside className="panel compliance-ring">
            <span className="section-label">Cobertura atual</span>
            <h2>Conformidade dos exames</h2>
            <div className="special-ring">
              <strong>{data.summary.complianceRate}%</strong>
              <small>em conformidade</small>
            </div>
            <div className="progress">
              <i style={{ width: `${data.summary.complianceRate}%` }} />
            </div>
            <p>
              {data.exams.filter((x) => x.status === "completed").length} de{" "}
              {data.exams.length} registros com resultado atualizado.
            </p>
            <button
              className="secondary-button"
              onClick={() => setTab("exceptions")}
            >
              <ShieldAlert /> Tratar exceções
            </button>
          </aside>
        </section>
      )}
      {tab === "exams" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-label">Aptidão e validade</span>
              <h2>Exames e ASOs</h2>
            </div>
          </div>
          <ExamRows rows={data.exams} open={setDetail} />
        </section>
      )}
      {tab === "calendar" && (
        <section className="occupational-calendar">
          {data.calendar.map((e) => (
            <article className="panel" key={e.examId}>
              <div className="calendar-date">
                <strong>{new Date(e.date + "T12:00:00").getDate()}</strong>
                <small>
                  {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    month: "short",
                  })}
                </small>
              </div>
              <div>
                <StatusBadge tone={e.status === "overdue" ? "red" : "blue"}>
                  {typeLabel[e.type]}
                </StatusBadge>
                <h2>{e.employeeName}</h2>
                <p>
                  {e.status === "overdue"
                    ? "Prazo vencido — requer reagendamento"
                    : "Exame programado"}
                </p>
              </div>
            </article>
          ))}
        </section>
      )}
      {tab === "risks" && (
        <section className="risk-grid">
          {data.risks.map((r) => (
            <article className="panel" key={r.id}>
              <header>
                <span className={`risk-symbol ${r.exposure}`}>
                  <HeartPulse />
                </span>
                <StatusBadge
                  tone={
                    r.exposure === "high"
                      ? "red"
                      : r.exposure === "medium"
                        ? "amber"
                        : "blue"
                  }
                >
                  {r.exposure === "high"
                    ? "Exposição alta"
                    : r.exposure === "medium"
                      ? "Exposição média"
                      : "Exposição baixa"}
                </StatusBadge>
              </header>
              <h2>{r.position}</h2>
              <p>
                {r.departmentName} · {r.agent}
              </p>
              <h3>Exames requeridos</h3>
              <ul>
                {r.requiredExams.map((x) => (
                  <li key={x}>
                    <Check /> {x}
                  </li>
                ))}
              </ul>
              <h3>Controles</h3>
              <ul>
                {r.controls.map((x) => (
                  <li key={x}>
                    <ShieldCheck /> {x}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
      {tab === "programs" && (
        <section className="program-grid">
          {data.programs.map((p) => (
            <article className="panel" key={p.id}>
              <header>
                <span className="program-type">{p.type}</span>
                <StatusBadge
                  tone={
                    p.status === "valid"
                      ? "green"
                      : p.status === "expired"
                        ? "red"
                        : "amber"
                  }
                >
                  {p.status === "valid"
                    ? "Válido"
                    : p.status === "expired"
                      ? "Vencido"
                      : "A vencer"}
                </StatusBadge>
              </header>
              <h2>{p.name}</h2>
              <p>{p.companyName}</p>
              <dl>
                <div>
                  <dt>Validade</dt>
                  <dd>
                    {new Date(p.validUntil + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Responsável</dt>
                  <dd>{p.responsible}</dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>
                    {p.documentStatus === "available"
                      ? "Disponível"
                      : "Em revisão"}
                  </dd>
                </div>
              </dl>
              <button className="secondary-button" onClick={() => window.print()}>
                <FileCheck2 /> Imprimir documento
              </button>
            </article>
          ))}
        </section>
      )}
      {tab === "exceptions" && (
        <section className="panel occupational-exceptions">
          <div className="panel-heading">
            <div>
              <span className="section-label">Requer decisão</span>
              <h2>Exceções ocupacionais</h2>
            </div>
          </div>
          {data.exceptions
            .filter((x) => x.status === "open")
            .map((e) => (
              <article key={e.id}>
                <span className={`exception-icon ${e.severity}`}>
                  <AlertTriangle />
                </span>
                <div>
                  <strong>{e.title}</strong>
                  <p>{e.description}</p>
                  <small>
                    {e.employeeName ? `${e.employeeName} · ` : ""}Responsável:{" "}
                    {e.owner} · prazo{" "}
                    {new Date(e.dueAt + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                    )}
                  </small>
                </div>
                <button
                  className="primary-button"
                  onClick={() => resolve.mutate(e.id)}
                >
                  Resolver
                </button>
              </article>
            ))}
        </section>
      )}
      <ExamDetail
        value={detail}
        close={() => setDetail(undefined)}
        done={() => {
          setDetail(undefined);
          refresh();
        }}
      />
      <NewExam
        open={newOpen}
        close={() => setNewOpen(false)}
        done={() => {
          setNewOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
function ExamRows({
  rows,
  open,
}: {
  rows: OccupationalExam[];
  open: (e: OccupationalExam) => void;
}) {
  return (
    <div className="exam-rows">
      {rows.map((e) => (
        <button key={e.id} onClick={() => open(e)}>
          <span className={`exam-symbol ${e.status}`}>
            <Stethoscope />
          </span>
          <div>
            <strong>{e.employeeName}</strong>
            <small>
              {e.registration} · {e.position}
            </small>
          </div>
          <span>
            <small>Exame</small>
            {typeLabel[e.type]}
          </span>
          <span>
            <small>Data</small>
            {new Date(e.scheduledDate + "T12:00:00").toLocaleDateString(
              "pt-BR",
            )}
          </span>
          <StatusBadge
            tone={
              e.result === "fit"
                ? "green"
                : e.result === "unfit" || e.status === "overdue"
                  ? "red"
                  : e.result === "fit_with_restrictions"
                    ? "amber"
                    : "blue"
            }
          >
            {e.status === "overdue" ? "Vencido" : resultLabel[e.result]}
          </StatusBadge>
        </button>
      ))}
    </div>
  );
}
function ExamDetail({
  value,
  close,
  done,
}: {
  value?: OccupationalExam;
  close: () => void;
  done: () => void;
}) {
  const [result, setResult] = useState<
    "fit" | "unfit" | "fit_with_restrictions"
  >("fit");
  const mutation = useMutation({
    mutationFn: () =>
      completeOccupationalExam(value!.id, {
        result,
        responsiblePhysician: "Dra. Helena Costa",
        asoDocumentId: `aso_${value!.id}`,
        validUntil: "2027-08-26",
        functionalRestriction:
          result === "fit_with_restrictions"
            ? "Evitar levantamento de cargas acima de 10 kg por 30 dias."
            : undefined,
      }),
    onSuccess: done,
  });
  return (
    <Modal
      open={Boolean(value)}
      onClose={close}
      title={value?.employeeName ?? "Exame ocupacional"}
      description={
        value ? `${typeLabel[value.type]} · ${value.registration}` : ""
      }
    >
      {value && (
        <div className="exam-detail">
          <div className="privacy-note">
            <ShieldCheck />
            <p>
              Registre apenas aptidão e restrições funcionais. Diagnósticos e
              dados clínicos não fazem parte do prontuário de RH.
            </p>
          </div>
          <dl>
            <div>
              <dt>Cargo</dt>
              <dd>{value.position}</dd>
            </div>
            <div>
              <dt>Departamento</dt>
              <dd>{value.departmentName}</dd>
            </div>
            <div>
              <dt>Agendamento</dt>
              <dd>
                {new Date(value.scheduledDate + "T12:00:00").toLocaleDateString(
                  "pt-BR",
                )}
              </dd>
            </div>
            <div>
              <dt>Validade</dt>
              <dd>
                {value.validUntil
                  ? new Date(value.validUntil + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                    )
                  : "Pendente"}
              </dd>
            </div>
          </dl>
          {value.status !== "completed" && (
            <label>
              Resultado
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as typeof result)}
              >
                <option value="fit">Apto</option>
                <option value="fit_with_restrictions">
                  Apto com restrições
                </option>
                <option value="unfit">Inapto</option>
              </select>
            </label>
          )}
          {value.functionalRestriction && (
            <div className="restriction-box">
              <AlertTriangle />
              <span>
                <strong>Restrição funcional</strong>
                {value.functionalRestriction}
              </span>
            </div>
          )}
          <footer className="form-actions">
            <button className="secondary-button" onClick={close}>
              Fechar
            </button>
            {value.status !== "completed" && (
              <button
                className="primary-button"
                onClick={() => mutation.mutate()}
              >
                <Check /> Validar ASO
              </button>
            )}
          </footer>
        </div>
      )}
    </Modal>
  );
}
function NewExam({
  open,
  close,
  done,
}: {
  open: boolean;
  close: () => void;
  done: () => void;
}) {
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<OccupationalExam["type"]>("periodic");
  const [scheduledDate, setScheduledDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clinicName, setClinicName] = useState("");
  const employee = employees.find((item) => item.id === employeeId);
  const mutation = useMutation({
    mutationFn: () =>
      createOccupationalExam({
        employeeId: employee!.id,
        employeeName: employee!.fullName,
        registration: employee!.registration,
        companyName: employee!.companyName,
        departmentName: employee!.departmentName,
        position: employee!.position,
        type,
        scheduledDate,
        dueDate,
        clinicName: clinicName.trim() || undefined,
      }),
    onSuccess: done,
  });
  return (
    <Modal
      open={open}
      onClose={close}
      title="Agendar exame"
      description="O colaborador será convocado automaticamente pela Central de Comunicação."
    >
      <div className="special-form">
        <label>
          Colaborador
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">Selecione</option>
            {employees.filter((item) => item.status !== "terminated").map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.registration}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Tipo
            <select value={type} onChange={(event) => setType(event.target.value as OccupationalExam["type"])}>
              <option value="admission">Admissional</option>
              <option value="periodic">Periódico</option>
              <option value="return_to_work">Retorno ao trabalho</option>
              <option value="risk_change">Mudança de risco</option>
              <option value="termination">Demissional</option>
            </select>
          </label>
          <label>
            Data
            <BrazilianDateInput value={scheduledDate} onValueChange={setScheduledDate} />
          </label>
          <label>Data limite<BrazilianDateInput value={dueDate} onValueChange={setDueDate} /></label>
        </div>
        <label>
          Unidade de atendimento
          <input value={clinicName} onChange={(event) => setClinicName(event.target.value)} />
        </label>
        <footer className="form-actions">
          <button className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button className="primary-button" disabled={!employee || !scheduledDate || !dueDate || mutation.isPending} onClick={() => mutation.mutate()}>
            <ClipboardPlus /> Agendar e convocar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
