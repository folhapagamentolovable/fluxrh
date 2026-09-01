import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Flag,
  MapPin,
  MapPinned,
  Navigation,
  Play,
  Printer,
  QrCode,
  Radio,
  Route,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type { CreatePatrolOccurrenceInput, Patrol } from "@fluxrh/contracts";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createPatrolOccurrence,
  getEmployees,
  getPatrols,
  registerPatrolVisit,
  resolvePatrolOccurrence,
  startPatrol,
} from "@/lib/api";
type Tab =
  "overview" | "live" | "routes" | "occurrences" | "qrcodes" | "history";
const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  exception: "Exceção",
  completed: "Concluída",
  cancelled: "Cancelada",
};
export function PatrolsPage() {
  const client = useQueryClient(),
    [tab, setTab] = useState<Tab>("overview"),
    [detail, setDetail] = useState<Patrol>(),
    [scanner, setScanner] = useState<Patrol>(),
    [startRoute, setStartRoute] = useState<{ id: string; name: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["patrols"],
    queryFn: getPatrols,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["patrols"] });
  const resolve = useMutation({
    mutationFn: (id: string) =>
      resolvePatrolOccurrence(
        id,
        "Ocorrência verificada e direcionada para manutenção.",
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
    ["live", "Operação ao vivo"],
    ["routes", "Rotas e postos"],
    ["occurrences", "Ocorrências"],
    ["qrcodes", "QR Codes"],
    ["history", "Histórico"],
  ];
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <MapPinned /> Operação em campo
          </span>
          <h1>Rondas e postos</h1>
          <p>
            Acompanhe rotas, leituras e ocorrências com evidência cronológica em
            cada ponto.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            setScanner(data.patrols.find((x) => x.status === "in_progress"))
          }
        >
          <ScanLine /> Ler QR Code
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
            {k === "occurrences" && data.summary.openOccurrences > 0 && (
              <span>{data.summary.openOccurrences}</span>
            )}
          </button>
        ))}
      </div>
      <section className="patrol-metrics">
        {(
          [
            ["Rondas hoje", data.summary.scheduledToday, Route, "blue"],
            ["Em andamento", data.summary.inProgress, Radio, "purple"],
            ["Concluídas", data.summary.completedToday, CheckCircle2, "green"],
            [
              "Cobertura",
              `${data.summary.coverageRate}%`,
              ShieldCheck,
              "amber",
            ],
            ["Ocorrências", data.summary.openOccurrences, FileWarning, "red"],
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
        <section className="patrol-layout">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-label">Turno atual</span>
                <h2>Rondas programadas</h2>
              </div>
            </div>
            <PatrolRows rows={data.patrols} open={setDetail} />
          </div>
          <aside className="panel live-feed">
            <span className="section-label">Últimas leituras</span>
            <h2>Atividade em campo</h2>
            {data.recentVisits.map((v) => (
              <article key={v.id}>
                <span className={`visit-status ${v.status}`}>
                  <MapPin />
                </span>
                <div>
                  <strong>{v.pointName}</strong>
                  <small>
                    {v.employeeName} · {v.siteName}
                  </small>
                </div>
                <time>
                  {new Date(v.scannedAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </article>
            ))}
          </aside>
        </section>
      )}
      {tab === "live" && (
        <section className="live-patrol-grid">
          {data.patrols
            .filter((x) => ["in_progress", "exception"].includes(x.status))
            .map((p) => (
              <article className="panel live-patrol" key={p.id}>
                <header>
                  <div>
                    <span className="live-pulse" />
                    <small>AO VIVO</small>
                    <h2>{p.employeeName}</h2>
                    <p>
                      {p.routeName} · {p.siteName}
                    </p>
                  </div>
                  <StatusBadge tone={p.status === "exception" ? "red" : "blue"}>
                    {statusLabel[p.status]}
                  </StatusBadge>
                </header>
                <div className="route-progress">
                  <div className="progress">
                    <i style={{ width: `${p.progress}%` }} />
                  </div>
                  <strong>{p.progress}%</strong>
                </div>
                <div className="point-timeline">
                  {data.routes
                    .find((r) => r.id === p.routeId)
                    ?.points.map((pt) => {
                      const visit = p.visits.find((v) => v.pointId === pt.id);
                      return (
                        <div
                          className={visit ? visit.status : "pending"}
                          key={pt.id}
                        >
                          <span>{visit ? <CheckCircle2 /> : <MapPin />}</span>
                          <div>
                            <strong>
                              {pt.sequence}. {pt.name}
                            </strong>
                            <small>
                              {visit
                                ? new Date(visit.scannedAt).toLocaleTimeString(
                                    "pt-BR",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "Aguardando visita"}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <footer>
                  <button
                    className="secondary-button"
                    onClick={() => setDetail(p)}
                  >
                    Detalhes
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => setScanner(p)}
                  >
                    <QrCode /> Registrar ponto
                  </button>
                </footer>
              </article>
            ))}
        </section>
      )}
      {tab === "routes" && (
        <section className="route-grid">
          {data.routes.map((r) => (
            <article className="panel" key={r.id}>
              <header>
                <span className="route-icon">
                  <Navigation />
                </span>
                <StatusBadge tone="green">Ativa</StatusBadge>
              </header>
              <h2>{r.name}</h2>
              <p>
                {r.siteName} · {r.shift}
              </p>
              <dl>
                <div>
                  <dt>Pontos</dt>
                  <dd>{r.points.length}</dd>
                </div>
                <div>
                  <dt>Duração</dt>
                  <dd>{r.estimatedMinutes} min</dd>
                </div>
                <div>
                  <dt>Tolerância</dt>
                  <dd>{r.toleranceMinutes} min</dd>
                </div>
              </dl>
              <div className="route-assignees">
                <UsersRound />
                <span>{r.assignedEmployees.join(" · ")}</span>
              </div>
              <button
                className="secondary-button"
                onClick={() => setStartRoute({ id: r.id, name: r.name })}
              >
                <Play /> Iniciar ronda avulsa
              </button>
            </article>
          ))}
        </section>
      )}
      {tab === "occurrences" && (
        <section className="panel patrol-occurrences">
          <div className="panel-heading">
            <div>
              <span className="section-label">Registro de campo</span>
              <h2>Ocorrências abertas</h2>
            </div>
          </div>
          {data.occurrences
            .filter((x) => x.status !== "resolved")
            .map((o) => (
              <article key={o.id}>
                <span className={`occurrence-symbol ${o.severity}`}>
                  <AlertTriangle />
                </span>
                <div>
                  <strong>{o.title}</strong>
                  <p>{o.description}</p>
                  <small>
                    {o.reportedBy} ·{" "}
                    {new Date(o.reportedAt).toLocaleString("pt-BR")} ·{" "}
                    {o.evidenceCount} evidência(s)
                  </small>
                </div>
                <StatusBadge tone={o.severity === "critical" ? "red" : "amber"}>
                  {o.severity === "critical" ? "Crítica" : "Atenção"}
                </StatusBadge>
                <button
                  className="primary-button"
                  onClick={() => resolve.mutate(o.id)}
                >
                  Resolver
                </button>
              </article>
            ))}
        </section>
      )}
      {tab === "qrcodes" && (
        <section className="qr-sheet">
          <div className="qr-print-heading">
            <div>
              <span className="section-label">Identificação dos pontos</span>
              <h2>QR Codes para impressão</h2>
            </div>
            <button className="secondary-button" onClick={() => window.print()}>
              <Printer /> Imprimir folha
            </button>
          </div>
          {data.routes.flatMap((r) =>
            r.points.map((p) => (
              <article className="panel" key={`${r.id}_${p.id}`}>
                <div className="fake-qr" aria-label={`QR Code ${p.qrToken}`}>
                  {Array.from({ length: 49 }, (_, i) => (
                    <i
                      key={i}
                      className={
                        (i * 7 + (i % 5) + p.sequence) % 3 === 0 ||
                        [
                          0, 1, 2, 7, 9, 14, 15, 16, 32, 33, 34, 39, 41, 46, 47,
                          48,
                        ].includes(i)
                          ? "dark"
                          : ""
                      }
                    />
                  ))}
                </div>
                <div>
                  <small>{r.siteName}</small>
                  <h2>
                    {p.sequence}. {p.name}
                  </h2>
                  <p>{p.locationName}</p>
                  <code>{p.qrToken}</code>
                </div>
              </article>
            )),
          )}
        </section>
      )}
      {tab === "history" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-label">Auditoria operacional</span>
              <h2>Histórico de rondas</h2>
            </div>
          </div>
          <PatrolRows
            rows={data.patrols.filter((x) => x.status === "completed")}
            open={setDetail}
          />
        </section>
      )}
      <PatrolDetail value={detail} close={() => setDetail(undefined)} />
      <Scanner
        value={scanner}
        route={data.routes.find((r) => r.id === scanner?.routeId)}
        close={() => setScanner(undefined)}
        done={() => {
          setScanner(undefined);
          refresh();
        }}
      />
      <StartPatrolModal
        route={startRoute}
        close={() => setStartRoute(undefined)}
        done={() => {
          setStartRoute(undefined);
          refresh();
        }}
      />
    </div>
  );
}
function StartPatrolModal({
  route,
  close,
  done,
}: {
  route?: { id: string; name: string };
  close: () => void;
  done: () => void;
}) {
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });
  const [employeeId, setEmployeeId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const employee = employees.find((item) => item.id === employeeId);
  const mutation = useMutation({
    mutationFn: () =>
      startPatrol(route!.id, {
        employeeId: employee!.id,
        employeeName: employee!.fullName,
        deviceId,
      }),
    onSuccess: done,
  });
  return (
    <Modal
      open={Boolean(route)}
      onClose={close}
      title="Iniciar ronda avulsa"
      description={route?.name ?? "Selecione a rota."}
    >
      <div className="special-form">
        <label>
          Colaborador
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            <option value="">Selecione</option>
            {employees
              .filter((item) => item.status !== "terminated")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} · {item.registration}
                </option>
              ))}
          </select>
        </label>
        <label>
          Identificação do dispositivo
          <input
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            placeholder="Ex.: CEL-RONDA-01"
          />
        </label>
        <footer className="form-actions">
          <button className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={
              !employee || deviceId.trim().length < 3 || mutation.isPending
            }
            onClick={() => mutation.mutate()}
          >
            <Play /> Iniciar ronda
          </button>
        </footer>
      </div>
    </Modal>
  );
}
function PatrolRows({
  rows,
  open,
}: {
  rows: Patrol[];
  open: (p: Patrol) => void;
}) {
  return (
    <div className="patrol-rows">
      {rows.map((p) => (
        <button key={p.id} onClick={() => open(p)}>
          <span className={`patrol-symbol ${p.status}`}>
            <ShieldCheck />
          </span>
          <div>
            <strong>{p.routeName}</strong>
            <small>
              {p.siteName} · {p.employeeName}
            </small>
          </div>
          <span>
            <small>Início previsto</small>
            {new Date(p.scheduledStart).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <div className="progress-cell">
            <div className="progress">
              <i style={{ width: `${p.progress}%` }} />
            </div>
            <small>{p.progress}%</small>
          </div>
          <StatusBadge
            tone={
              p.status === "completed"
                ? "green"
                : p.status === "exception"
                  ? "red"
                  : p.status === "in_progress"
                    ? "blue"
                    : "gray"
            }
          >
            {statusLabel[p.status]}
          </StatusBadge>
        </button>
      ))}
    </div>
  );
}
function PatrolDetail({ value, close }: { value?: Patrol; close: () => void }) {
  return (
    <Modal
      open={Boolean(value)}
      onClose={close}
      title={value?.routeName ?? "Ronda"}
      description={value ? `${value.employeeName} · ${value.siteName}` : ""}
    >
      {value && (
        <div className="patrol-detail">
          <div className="route-progress">
            <div className="progress">
              <i style={{ width: `${value.progress}%` }} />
            </div>
            <strong>{value.progress}%</strong>
          </div>
          <h3>Linha do tempo</h3>
          {value.visits.map((v) => (
            <article key={v.id}>
              <span className={`visit-status ${v.status}`}>
                <MapPin />
              </span>
              <div>
                <strong>
                  {v.sequence}. {v.pointName}
                </strong>
                <small>
                  {new Date(v.scannedAt).toLocaleString("pt-BR")} ·{" "}
                  {v.source === "offline_sync"
                    ? "Sincronização offline"
                    : "QR Code"}{" "}
                  · {v.deviceId}
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
function Scanner({
  value,
  route,
  close,
  done,
}: {
  value?: Patrol;
  route?: { points: { sequence: number; qrToken: string; name: string }[] };
  close: () => void;
  done: () => void;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [offline, setOffline] = useState(false);
  const [locationValid, setLocationValid] = useState(true);
  const [occurrenceOpen, setOccurrenceOpen] = useState(false);
  const [occurrenceForm, setOccurrenceForm] =
    useState<CreatePatrolOccurrenceInput>({
      type: "identified_risk",
      title: "",
      description: "",
      severity: "medium",
      reportedBy: value?.employeeName ?? "",
      evidenceCount: 0,
    });
  const next =
    route?.points.find(
      (x) => x.sequence === (value?.currentPointSequence ?? 0) + 1,
    ) ?? route?.points[0];
  const visit = useMutation({
    mutationFn: () =>
      registerPatrolVisit(value!.id, {
        token: next!.qrToken,
        deviceId,
        offline,
        locationValid,
      }),
    onSuccess: done,
  });
  const occurrence = useMutation({
    mutationFn: () =>
      createPatrolOccurrence(value!.id, {
        ...occurrenceForm,
        pointId: next?.qrToken,
      }),
    onSuccess: done,
  });
  return (
    <Modal
      open={Boolean(value)}
      onClose={close}
      title="Leitura de QR Code"
      description={
        next
          ? `Próximo ponto: ${next.name}`
          : "Selecione uma ronda em andamento."
      }
    >
      {value && next && (
        <div className="scanner-panel">
          <div className="scanner-frame">
            <ScanLine />
            <span />
            <small>Câmera simulada no modo local</small>
          </div>
          <div className="scanner-info">
            <Smartphone />
            <span>
              <strong>{next.qrToken}</strong>Dispositivo e localização serão
              registrados como evidência.
            </span>
          </div>
          <div className="special-form">
            <label>
              Identificação do dispositivo
              <input
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                placeholder="Ex.: CEL-RONDA-01"
              />
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={offline}
                onChange={(event) => setOffline(event.target.checked)}
              />
              <span>Leitura coletada offline</span>
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={locationValid}
                onChange={(event) => setLocationValid(event.target.checked)}
              />
              <span>Localização conferida</span>
            </label>
          </div>
          <footer className="form-actions">
            <button
              className="secondary-button"
              onClick={() => setOccurrenceOpen(true)}
            >
              <Flag /> Registrar ocorrência
            </button>
            <button
              className="primary-button"
              disabled={deviceId.trim().length < 3 || visit.isPending}
              onClick={() => visit.mutate()}
            >
              <QrCode /> Simular leitura
            </button>
          </footer>
          <Modal
            open={occurrenceOpen}
            onClose={() => setOccurrenceOpen(false)}
            title="Registrar ocorrência"
            description={`Ponto: ${next.name}`}
          >
            <div className="special-form">
              <div className="form-grid">
                <label>
                  Tipo
                  <select
                    value={occurrenceForm.type}
                    onChange={(event) =>
                      setOccurrenceForm({
                        ...occurrenceForm,
                        type: event.target
                          .value as CreatePatrolOccurrenceInput["type"],
                      })
                    }
                  >
                    <option value="open_door">Porta aberta</option>
                    <option value="lighting">Iluminação</option>
                    <option value="damaged_equipment">
                      Equipamento danificado
                    </option>
                    <option value="unauthorized_access">
                      Acesso não autorizado
                    </option>
                    <option value="identified_risk">Risco identificado</option>
                    <option value="critical_incident">Incidente crítico</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label>
                  Severidade
                  <select
                    value={occurrenceForm.severity}
                    onChange={(event) =>
                      setOccurrenceForm({
                        ...occurrenceForm,
                        severity: event.target
                          .value as CreatePatrolOccurrenceInput["severity"],
                      })
                    }
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </label>
              </div>
              <label>
                Título
                <input
                  value={occurrenceForm.title}
                  onChange={(event) =>
                    setOccurrenceForm({
                      ...occurrenceForm,
                      title: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Descrição
                <textarea
                  rows={4}
                  value={occurrenceForm.description}
                  onChange={(event) =>
                    setOccurrenceForm({
                      ...occurrenceForm,
                      description: event.target.value,
                    })
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Reportado por
                  <input
                    value={occurrenceForm.reportedBy}
                    onChange={(event) =>
                      setOccurrenceForm({
                        ...occurrenceForm,
                        reportedBy: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Quantidade de evidências
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={occurrenceForm.evidenceCount}
                    onChange={(event) =>
                      setOccurrenceForm({
                        ...occurrenceForm,
                        evidenceCount: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <footer className="form-actions">
                <button
                  className="secondary-button"
                  onClick={() => setOccurrenceOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  disabled={
                    occurrenceForm.title.trim().length < 3 ||
                    occurrenceForm.description.trim().length < 5 ||
                    occurrenceForm.reportedBy.trim().length < 2 ||
                    occurrence.isPending
                  }
                  onClick={() => occurrence.mutate()}
                >
                  <Flag /> Registrar
                </button>
              </footer>
            </div>
          </Modal>
        </div>
      )}
    </Modal>
  );
}
