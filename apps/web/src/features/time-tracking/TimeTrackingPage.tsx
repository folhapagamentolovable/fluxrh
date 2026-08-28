import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  MapPin,
  MoreHorizontal,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  TimerReset,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  approveEmployeeTimesheet,
  closeTimeCompetence,
  getCurrentTimeCompetence,
  getTimeOverview,
  registerTimePunch,
  resolveTimeException,
} from "@/lib/api";
import { exceptionLabels, formatMinutes, punchLabels } from "./time-ui";

type Tab = "overview" | "schedules" | "punch" | "exceptions" | "closing";
function exportPunches(punches: Array<{recordedAt:string;employeeName:string;type:string;locationName:string;deviceId:string}>) {
  const header = "data_hora,colaborador,tipo,local,dispositivo";
  const lines = punches.map((item)=>[item.recordedAt,item.employeeName,item.type,item.locationName,item.deviceId].map((value)=>`"${String(value).replaceAll('"','""')}"`).join(","));
  const url=URL.createObjectURL(new Blob([[header,...lines].join("\n")],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="marcacoes-ponto.csv";link.click();URL.revokeObjectURL(url);
}
export function TimeTrackingPage() {
  const client = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["time-overview"],
    queryFn: getTimeOverview,
  });
  const { data: competence } = useQuery({ queryKey: ["time-competence"], queryFn: getCurrentTimeCompetence });
  const [tab, setTab] = useState<Tab>("overview");
  const [resolveId, setResolveId] = useState<string>();
  const [note, setNote] = useState(
    "Ocorrência conferida e ajustada conforme justificativa do colaborador.",
  );
  const [punchOpen, setPunchOpen] = useState(false);
  const [punchType, setPunchType] = useState<
    "clock_in" | "break_start" | "break_end" | "clock_out"
  >("clock_in");
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["time-overview"] });
  const resolveMutation = useMutation({
    mutationFn: () => resolveTimeException(resolveId!, note),
    onSuccess: () => {
      refresh();
      setResolveId(undefined);
    },
  });
  const punchMutation = useMutation({
    mutationFn: () =>
      registerTimePunch({
        employeeId: "emp_marina",
        employeeName: "Marina Souza",
        type: punchType,
        token: data!.qrStation.token,
        deviceId: "browser-demo-01",
        locationName: data!.qrStation.name,
      }),
    onSuccess: () => {
      refresh();
      setPunchOpen(false);
    },
  });
  const approveMutation = useMutation({
    mutationFn: approveEmployeeTimesheet,
    onSuccess: refresh,
  });
  const closeMutation = useMutation({
    mutationFn: () => closeTimeCompetence(competence!.id, "Competência conferida e fechada pelo RH."),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["time-competence"] }); refresh(); },
  });
  if (isLoading || !data)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  const tabs: [Tab, string][] = [
    ["overview", "Visão geral"],
    ["schedules", "Escalas"],
    ["punch", "Ponto QR"],
    ["exceptions", "Exceções"],
    ["closing", "Fechamento"],
  ];
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <Clock3 /> Jornada e ponto
          </span>
          <h1>Operação de jornada</h1>
          <p>
            Planejamento, marcações e apuração automática com tratamento somente
            por exceção.
          </p>
        </div>
        <button className="primary-button" onClick={() => setPunchOpen(true)}>
          <ScanLine /> Registrar ponto
        </button>
      </section>
      <div className="module-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
            {key === "exceptions" && <span>{data.summary.openExceptions}</span>}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview data={data} onTab={setTab} />}{" "}
      {tab === "schedules" && <Schedules data={data} />}{" "}
      {tab === "punch" && (
        <PunchStation data={data} onPunch={() => setPunchOpen(true)} />
      )}{" "}
      {tab === "exceptions" && (
        <Exceptions data={data} onResolve={setResolveId} />
      )}{" "}
      {tab === "closing" && (
        <Closing data={data} competence={competence} closing={closeMutation.isPending} onClose={()=>closeMutation.mutate()} onApprove={(id) => approveMutation.mutate(id)} />
      )}
      <Modal
        open={Boolean(resolveId)}
        onClose={() => setResolveId(undefined)}
        title="Resolver exceção"
        description="A decisão será registrada na apuração e na trilha de auditoria."
      >
        <div className="validation-modal">
          <label>
            Justificativa
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <footer className="form-actions">
            <button
              className="secondary-button"
              onClick={() => setResolveId(undefined)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={resolveMutation.isPending || note.length < 3}
              onClick={() => resolveMutation.mutate()}
            >
              {resolveMutation.isPending
                ? "Resolvendo..."
                : "Confirmar resolução"}
            </button>
          </footer>
        </div>
      </Modal>
      <Modal
        open={punchOpen}
        onClose={() => setPunchOpen(false)}
        title="Registrar ponto por QR Code"
        description="Simulação autenticada da estação Matriz São Paulo."
      >
        <div className="punch-modal">
          <MiniQr token={data.qrStation.token} />
          <div>
            <label>
              Tipo de marcação
              <select
                value={punchType}
                onChange={(e) =>
                  setPunchType(e.target.value as typeof punchType)
                }
              >
                <option value="clock_in">Entrada</option>
                <option value="break_start">Início do intervalo</option>
                <option value="break_end">Fim do intervalo</option>
                <option value="clock_out">Saída</option>
              </select>
            </label>
            <div className="punch-identity">
              <span>MS</span>
              <div>
                <small>Colaboradora autenticada</small>
                <strong>Marina Souza</strong>
                <p>{data.qrStation.name}</p>
              </div>
            </div>
          </div>
          <footer className="form-actions span-2">
            <button
              className="secondary-button"
              onClick={() => setPunchOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={punchMutation.isPending}
              onClick={() => punchMutation.mutate()}
            >
              {punchMutation.isPending
                ? "Registrando..."
                : "Confirmar marcação"}
            </button>
          </footer>
        </div>
      </Modal>
    </div>
  );
}

function Overview({
  data,
  onTab,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getTimeOverview>>>;
  onTab: (tab: Tab) => void;
}) {
  const metrics = [
    [
      "Presentes agora",
      `${data.summary.presentToday}/${data.summary.expectedToday}`,
      UsersRound,
      "green",
    ],
    ["Exceções abertas", data.summary.openExceptions, AlertTriangle, "red"],
    ["Horas extras no mês", `${data.summary.overtimeHours}h`, Clock3, "purple"],
    [
      "Saldo positivo",
      formatMinutes(data.summary.positiveBankMinutes),
      TimerReset,
      "blue",
    ],
    ["Fechamento", `${data.summary.closingProgress}%`, FileCheck2, "amber"],
  ] as const;
  return (
    <>
      <section className="document-metrics time-metrics">
        {metrics.map(([label, value, Icon, tone]) => (
          <div key={label}>
            <span className={`metric-icon ${tone}`}>
              <Icon />
            </span>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </section>
      <div className="time-dashboard">
        <section className="panel live-punches">
          <div className="panel-heading">
            <div>
              <span className="section-label">Hoje · ao vivo</span>
              <h2>Últimas marcações</h2>
            </div>
            <button className="ghost-action" onClick={() => onTab("punch")}>
              Ver estação <ArrowRight />
            </button>
          </div>
          {data.punches.slice(0, 8).map((p) => (
            <div className="live-punch" key={p.id}>
              <span className={`punch-dot ${p.type}`} />
              <div>
                <strong>{p.employeeName}</strong>
                <small>
                  {punchLabels[p.type]} · {p.locationName}
                </small>
              </div>
              <time>
                {new Date(p.recordedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <StatusBadge tone="green">QR validado</StatusBadge>
            </div>
          ))}
        </section>
        <aside className="panel exception-snapshot">
          <div className="panel-heading">
            <div>
              <span className="section-label">Requer atenção</span>
              <h2>Exceções recentes</h2>
            </div>
            <span className="count-pill">{data.summary.openExceptions}</span>
          </div>
          {data.exceptions
            .filter((x) => x.status !== "resolved")
            .slice(0, 4)
            .map((ex) => (
              <button key={ex.id} onClick={() => onTab("exceptions")}>
                <span className={`exception-icon ${ex.severity}`}>
                  <AlertTriangle />
                </span>
                <div>
                  <strong>{ex.title}</strong>
                  <small>
                    {ex.employeeName} ·{" "}
                    {new Date(`${ex.date}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </small>
                </div>
                <ArrowRight />
              </button>
            ))}
        </aside>
      </div>
    </>
  );
}
function Schedules({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getTimeOverview>>>;
}) {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const employees = scheduleFilter === "all" ? data.employees : data.employees.filter((employee) => employee.scheduleName === scheduleFilter);
  return (
    <>
      <section className="schedule-grid">
        {data.schedules.map((schedule) => (
          <article className="panel schedule-card" key={schedule.id}>
            <header>
              <span style={{ background: schedule.color }}>
                <CalendarDays />
              </span>
              <button className="icon-button" aria-label={`Filtrar pela escala ${schedule.name}`} onClick={() => setScheduleFilter(schedule.name)}>
                <MoreHorizontal />
              </button>
            </header>
            <StatusBadge tone={schedule.nightShift ? "blue" : "green"}>
              {schedule.pattern.toUpperCase()}
            </StatusBadge>
            <h2>{schedule.name}</h2>
            <p>
              {schedule.startTime}–{schedule.endTime} · {schedule.breakMinutes}
              min de intervalo
            </p>
            <div className="week-pattern">
              {days.map((day, index) => (
                <i
                  className={
                    schedule.pattern === "5x2" && index > 4
                      ? "off"
                      : schedule.pattern === "6x1" && index === 6
                        ? "off"
                        : "on"
                  }
                  key={day}
                >
                  {day}
                </i>
              ))}
            </div>
            <footer>
              <span>
                <UsersRound /> {schedule.employeesCount} colaboradores
              </span>
              <strong>{schedule.weeklyHours}h semanais</strong>
            </footer>
          </article>
        ))}
      </section>
      <section className="panel schedule-calendar">
        <div className="panel-heading">
          <div>
            <span className="section-label">Planejamento</span>
            <h2>Escala da semana · 24–30 de agosto</h2>
          </div>
          <label className="secondary-button"><Filter />
            <select aria-label="Filtrar equipe por escala" value={scheduleFilter} onChange={(event)=>setScheduleFilter(event.target.value)}>
              <option value="all">Todas as escalas</option>
              {[...new Set(data.employees.map((employee)=>employee.scheduleName))].map((name)=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="calendar-table">
          <div className="calendar-head">
            <strong>Colaborador</strong>
            {days.map((d, i) => (
              <span key={d}>
                {d}
                <small>{24 + i}</small>
              </span>
            ))}
          </div>
          {employees.map((employee) => (
            <div className="calendar-row" key={employee.employeeId}>
              <strong>
                {employee.employeeName}
                <small>{employee.scheduleName}</small>
              </strong>
              {days.map((day, index) => (
                <span
                  className={
                    (employee.scheduleName.includes("5×2") && index > 4) ||
                    (employee.scheduleName.includes("6×1") && index === 6)
                      ? "day-off"
                      : "shift-day"
                  }
                  key={day}
                >
                  {employee.scheduleName.includes("12×36") && index % 2
                    ? "Folga"
                    : index > 4 && employee.scheduleName.includes("5×2")
                      ? "Folga"
                      : "08:00"}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function PunchStation({
  data,
  onPunch,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getTimeOverview>>>;
  onPunch: () => void;
}) {
  return (
    <div className="punch-station-layout">
      <section className="panel qr-station">
        <span className="section-label">
          <QrCode /> Estação de ponto
        </span>
        <h2>{data.qrStation.name}</h2>
        <p>O código é rotativo e vinculado a esta estação.</p>
        <MiniQr token={data.qrStation.token} />
        <div className="qr-token">
          <small>Token atual</small>
          <code>{data.qrStation.token}</code>
        </div>
        <div className="station-status">
          <i />
          <span>
            <strong>Estação ativa</strong>
            <small>Renovação automática em até 5 minutos</small>
          </span>
        </div>
        <button className="primary-button" onClick={onPunch}>
          <ScanLine /> Simular leitura
        </button>
      </section>
      <section className="panel punch-audit">
        <div className="panel-heading">
          <div>
            <span className="section-label">Evidências</span>
            <h2>Marcações de hoje</h2>
          </div>
          <button className="secondary-button" onClick={() => exportPunches(data.punches)}>
            <Download /> Exportar
          </button>
        </div>
        {data.punches.map((p) => (
          <div className="audit-punch" key={p.id}>
            <time>
              {new Date(p.recordedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <div>
              <strong>{p.employeeName}</strong>
              <small>{punchLabels[p.type]}</small>
            </div>
            <span>
              <MapPin /> {p.locationName}
            </span>
            <code>{p.deviceId}</code>
            <StatusBadge tone="green">Íntegra</StatusBadge>
          </div>
        ))}
      </section>
    </div>
  );
}
function Exceptions({
  data,
  onResolve,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getTimeOverview>>>;
  onResolve: (id: string) => void;
}) {
  const [query,setQuery]=useState("");
  const [pendingOnly,setPendingOnly]=useState(false);
  const rows=data.exceptions.filter((item)=>(!pendingOnly||item.status!=="resolved")&&`${item.employeeName} ${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="panel data-panel">
      <div className="table-toolbar people-toolbar">
        <div className="field">
          <Search />
          <input placeholder="Buscar colaborador ou ocorrência" value={query} onChange={(event)=>setQuery(event.target.value)} />
        </div>
        <button className="secondary-button" aria-pressed={pendingOnly} onClick={()=>setPendingOnly((value)=>!value)}>
          <Filter /> {pendingOnly?"Mostrar todas":"Somente pendentes"}
        </button>
        <span>
          {data.exceptions.filter((x) => x.status !== "resolved").length}{" "}
          pendentes
        </span>
      </div>
      <div className="exception-management">
        {rows.map((ex) => (
          <article
            key={ex.id}
            className={ex.status === "resolved" ? "resolved" : ""}
          >
            <span className={`exception-icon ${ex.severity}`}>
              <AlertTriangle />
            </span>
            <div>
              <header>
                <strong>{ex.title}</strong>
                <StatusBadge
                  tone={
                    ex.status === "resolved"
                      ? "green"
                      : ex.severity === "high"
                        ? "red"
                        : "amber"
                  }
                >
                  {ex.status === "resolved"
                    ? "Resolvida"
                    : ex.severity === "high"
                      ? "Alta"
                      : "Média"}
                </StatusBadge>
              </header>
              <p>{ex.description}</p>
              <small>
                {ex.employeeName} ·{" "}
                {new Date(`${ex.date}T12:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                {exceptionLabels[ex.type]}
              </small>
              {ex.resolutionNote && (
                <blockquote>{ex.resolutionNote}</blockquote>
              )}
            </div>
            {ex.status !== "resolved" && (
              <button
                className="primary-button"
                onClick={() => onResolve(ex.id)}
              >
                Analisar
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
function Closing({
  data,
  competence,
  closing,
  onClose,
  onApprove,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getTimeOverview>>>;
  competence: Awaited<ReturnType<typeof getCurrentTimeCompetence>> | undefined;
  closing: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
}) {
  return (
    <>
      <section className="closing-header panel">
        <div>
          <span className="metric-icon blue">
            <FileCheck2 />
          </span>
          <div>
            <span className="section-label">Competência 08/2026</span>
            <h2>Fechamento de ponto</h2>
            <p>
              {data.summary.closingProgress}% da equipe conferida e pronta para
              a folha.
            </p>
          </div>
        </div>
        <div className="closing-progress">
          <strong>{data.summary.closingProgress}%</strong>
          <div className="progress">
            <i style={{ width: `${data.summary.closingProgress}%` }} />
          </div>
        </div>
        <button className="primary-button" disabled={!competence || competence.status === "closed" || data.summary.closingProgress < 100 || closing} onClick={onClose}>
          <ShieldCheck /> {competence?.status === "closed" ? "Competência fechada" : closing ? "Fechando..." : "Fechar competência"}
        </button>
      </section>
      <section className="panel data-panel">
        <div className="data-table-wrap">
          <table className="data-table closing-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Jornada prevista</th>
                <th>Trabalhado</th>
                <th>Banco de horas</th>
                <th>Horas extras</th>
                <th>Exceções</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp) => (
                <tr key={emp.employeeId}>
                  <td>
                    <strong>{emp.employeeName}</strong>
                    <small>{emp.position}</small>
                  </td>
                  <td>{formatMinutes(emp.expectedMinutes)}</td>
                  <td>{formatMinutes(emp.workedMinutes)}</td>
                  <td
                    className={emp.balanceMinutes < 0 ? "negative" : "positive"}
                  >
                    {formatMinutes(emp.balanceMinutes)}
                  </td>
                  <td>{formatMinutes(emp.overtimeMinutes)}</td>
                  <td>{emp.exceptionCount}</td>
                  <td>
                    <StatusBadge
                      tone={emp.status === "approved" ? "green" : "amber"}
                    >
                      {emp.status === "approved" ? "Aprovado" : "Revisar"}
                    </StatusBadge>
                  </td>
                  <td>
                    {emp.status !== "approved" && (
                      <button
                        className="ghost-action"
                        onClick={() => onApprove(emp.employeeId)}
                      >
                        Aprovar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function MiniQr({ token }: { token: string }) {
  const bits = useMemo(
    () =>
      Array.from(
        { length: 121 },
        (_, i) =>
          (token.charCodeAt(i % token.length) * (i + 7) + i * 13) % 7 < 3,
      ),
    [token],
  );
  return (
    <div className="qr-visual" aria-label="QR Code demonstrativo">
      {bits.map((on, i) => (
        <i className={on ? "on" : ""} key={i} />
      ))}
    </div>
  );
}
