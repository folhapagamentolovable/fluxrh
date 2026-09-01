import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileText,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Scale,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  approvePayrollEmployee,
  closePayroll,
  getPayrollOverview,
  processPayroll,
  resolvePayrollException,
} from "@/lib/api";
import type { PayrollEmployee } from "@fluxrh/contracts";
type Tab =
  | "overview"
  | "employees"
  | "exceptions"
  | "parameters"
  | "catalog"
  | "history";
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const competence = (v: string) =>
  new Date(`${v}-02T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
export function PayrollPage() {
  const client = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payroll"],
    queryFn: getPayrollOverview,
  });
  const [tab, setTab] = useState<Tab>("overview");
  const [detail, setDetail] = useState<PayrollEmployee>();
  const [resolve, setResolve] = useState<{
    employeeId: string;
    exceptionId: string;
  }>();
  const refresh = () => client.invalidateQueries({ queryKey: ["payroll"] });
  const resolveMutation = useMutation({
    mutationFn: () =>
      resolvePayrollException(
        resolve!.employeeId,
        resolve!.exceptionId,
        "Ocorrência conferida com os dados de jornada e ausência.",
      ),
    onSuccess: () => {
      setResolve(undefined);
      refresh();
    },
  });
  const approve = useMutation({
    mutationFn: approvePayrollEmployee,
    onSuccess: refresh,
  });
  const close = useMutation({ mutationFn: closePayroll, onSuccess: refresh });
  const process = useMutation({ mutationFn: () => processPayroll(), onSuccess: refresh });
  if (isLoading)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="page">
        <section className="panel empty-state" role="alert">
          <Calculator />
          <h1>Folha ainda não processada</h1>
          <p>{error instanceof Error && error.message.includes("time_competence_not_closed") ? "Feche e aprove a competência de ponto antes de calcular a folha." : "Consolide ponto, ausências e benefícios para criar a competência."}</p>
          <button className="primary-button" disabled={process.isPending} onClick={() => process.mutate()}>
            <RefreshCw /> {process.isPending ? "Processando…" : "Processar competência"}
          </button>
          {process.isError && <small role="alert">{process.error instanceof Error && process.error.message.includes("time_competence_not_closed") ? "A competência de ponto ainda não foi fechada." : "Não foi possível processar. Confira as fontes e tente novamente."}</small>}
        </section>
      </div>
    );
  const tabs: [Tab, string][] = [
    ["overview", "Visão geral"],
    ["employees", "Colaboradores"],
    ["exceptions", "Exceções"],
    ["parameters", "Tabelas legais"],
    ["catalog", "Eventos"],
    ["history", "Histórico"],
  ];
  return (
    <div className="page">
      <section className="simple-heading payroll-heading">
        <div>
          <span className="eyebrow">
            <CircleDollarSign /> Folha de pagamento
          </span>
          <h1>Competência {competence(data.run.competence)}</h1>
          <p>Cálculo versionado e conferência orientada por exceções.</p>
        </div>
        <div>
          <StatusBadge tone={data.run.status === "closed" ? "green" : "amber"}>
            {data.run.status === "closed" ? "Fechada" : "Em conferência"}
          </StatusBadge>
          <button
            className="secondary-button"
            disabled={data.run.status === "closed" || process.isPending}
            onClick={() => process.mutate()}
          >
            <RefreshCw /> Reprocessar
          </button>
          <button
            className="primary-button"
            disabled={data.summary.closingProgress < 100 || close.isPending}
            onClick={() => close.mutate()}
          >
            <LockKeyhole /> Fechar folha
          </button>
        </div>
      </section>
      <div className="module-tabs">
        {tabs.map(([k, l]) => (
          <button
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
            key={k}
          >
            {l}
            {k === "exceptions" && data.summary.openExceptions > 0 && (
              <span>{data.summary.openExceptions}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <>
          <section className="payroll-metrics">
            {(
              [
                ["Colaboradores", data.summary.employees, UsersRound, "blue"],
                [
                  "Total bruto",
                  money(data.summary.grossTotal),
                  CircleDollarSign,
                  "green",
                ],
                [
                  "Total líquido",
                  money(data.summary.netTotal),
                  ReceiptText,
                  "purple",
                ],
                [
                  "Exceções abertas",
                  data.summary.openExceptions,
                  AlertTriangle,
                  "red",
                ],
                [
                  "Conferência",
                  `${data.summary.closingProgress}%`,
                  FileCheck2,
                  "amber",
                ],
              ] as const
            ).map(([l, v, I, t]) => (
              <article key={l}>
                <span className={`metric-icon ${t}`}>
                  <I />
                </span>
                <div>
                  <strong>{v}</strong>
                  <small>{l}</small>
                </div>
              </article>
            ))}
          </section>
          <section className="payroll-flow panel">
            <div>
              <span className="flow-step done">
                <Check />
              </span>
              <strong>Dados consolidados</strong>
              <small>Ponto, férias e ausências</small>
            </div>
            <i />
            <div>
              <span className="flow-step done">
                <Calculator />
              </span>
              <strong>Cálculo realizado</strong>
              <small>{data.run.processedCount} colaboradores</small>
            </div>
            <i />
            <div>
              <span className="flow-step current">
                <ShieldCheck />
              </span>
              <strong>Conferência</strong>
              <small>{data.summary.openExceptions} exceção(ões)</small>
            </div>
            <i />
            <div>
              <span className="flow-step">
                <LockKeyhole />
              </span>
              <strong>Fechamento</strong>
              <small>Aguardando aprovação</small>
            </div>
          </section>
          <div className="payroll-dashboard">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Conferência</span>
                  <h2>Resumo por colaborador</h2>
                </div>
                <button
                  className="ghost-action"
                  onClick={() => setTab("employees")}
                >
                  Ver todos <ChevronRight />
                </button>
              </div>
              <PayrollRows
                employees={data.run.employees}
                onDetail={setDetail}
              />
            </section>
            <aside className="panel payroll-total">
              <span className="section-label">Totais da competência</span>
              <h2>Resumo financeiro</h2>
              <dl>
                <div>
                  <dt>Proventos</dt>
                  <dd>{money(data.run.grossTotal)}</dd>
                </div>
                <div>
                  <dt>Descontos</dt>
                  <dd className="negative">
                    − {money(data.run.deductionsTotal)}
                  </dd>
                </div>
                <div>
                  <dt>Encargos empresa</dt>
                  <dd>{money(data.run.employerChargesTotal)}</dd>
                </div>
                <div className="net">
                  <dt>Líquido a pagar</dt>
                  <dd>{money(data.run.netTotal)}</dd>
                </div>
              </dl>
              <div className="closing-card">
                <header>
                  <span>Progresso da aprovação</span>
                  <strong>{data.summary.closingProgress}%</strong>
                </header>
                <div className="progress">
                  <i style={{ width: `${data.summary.closingProgress}%` }} />
                </div>
                <small>
                  {
                    data.run.employees.filter((e) => e.status === "approved")
                      .length
                  }{" "}
                  de {data.run.employeesCount} aprovados
                </small>
              </div>
            </aside>
          </div>
        </>
      )}
      {tab === "employees" && (
        <section className="panel payroll-table">
          <div className="panel-heading">
            <div>
              <span className="section-label">Cálculo individual</span>
              <h2>Colaboradores processados</h2>
            </div>
          </div>
          <PayrollRows
            employees={data.run.employees}
            onDetail={setDetail}
            full
          />
        </section>
      )}
      {tab === "exceptions" && (
        <section className="panel payroll-exceptions">
          <div className="panel-heading">
            <div>
              <span className="section-label">Requer decisão</span>
              <h2>Exceções do cálculo</h2>
            </div>
          </div>
          {data.run.employees.flatMap((e) =>
            e.exceptions
              .filter((x) => x.status === "open")
              .map((x) => (
                <article key={x.id}>
                  <span className={`exception-icon ${x.severity}`}>
                    <AlertTriangle />
                  </span>
                  <div>
                    <header>
                      <strong>{x.title}</strong>
                      <StatusBadge
                        tone={x.severity === "critical" ? "red" : "amber"}
                      >
                        {x.severity === "critical" ? "Crítica" : "Alta"}
                      </StatusBadge>
                    </header>
                    <p>{x.description}</p>
                    <small>
                      {e.employeeName} · {e.departmentName}
                    </small>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() =>
                      setResolve({
                        employeeId: e.employeeId,
                        exceptionId: x.id,
                      })
                    }
                  >
                    Analisar
                  </button>
                </article>
              )),
          )}
          {data.summary.openExceptions === 0 && (
            <div className="empty-state">
              <ShieldCheck />
              <h2>Nenhuma exceção aberta</h2>
              <p>Todos os cálculos estão prontos para aprovação.</p>
            </div>
          )}
        </section>
      )}
      {tab === "parameters" && (
        <section className="legal-grid">
          {data.legalTables.map((table) => (
            <article className="panel legal-card" key={table.id}>
              <header>
                <span className="metric-icon blue">
                  <Scale />
                </span>
                <div>
                  <h2>{table.name}</h2>
                  <small>
                    Vigência{" "}
                    {new Date(
                      `${table.effectiveFrom}T12:00:00`,
                    ).toLocaleDateString("pt-BR")}{" "}
                    · versão {table.version}
                  </small>
                </div>
                <StatusBadge tone={table.status === "active" ? "green" : table.status === "scheduled" ? "blue" : "gray"}>
                  {table.status === "active" ? "Ativa" : table.status === "scheduled" ? "Programada" : "Expirada"}
                </StatusBadge>
              </header>
              <table>
                <thead>
                  <tr>
                    <th>De</th>
                    <th>Até</th>
                    <th>Alíquota</th>
                    <th>Dedução</th>
                  </tr>
                </thead>
                <tbody>
                  {table.brackets.map((b, i) => (
                    <tr key={i}>
                      <td>{money(b.from)}</td>
                      <td>{b.to ? money(b.to) : "Sem limite"}</td>
                      <td>{b.rate}%</td>
                      <td>{money(b.deduction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(table.sourceName || table.sourceHash || table.changes?.length) && (
                <div className="legal-audit">
                  {table.sourceName && (
                    <p><strong>Fonte:</strong>{" "}{table.sourceUrl ? <a href={table.sourceUrl} target="_blank" rel="noreferrer">{table.sourceName}</a> : table.sourceName}</p>
                  )}
                  {table.sourceHash && <p><strong>Hash:</strong> <code>{table.sourceHash.slice(0, 16)}…</code></p>}
                  {table.changes?.length ? <div><strong>Comparação com a versão anterior</strong><ul>{table.changes.map((change) => <li key={change}>{change}</li>)}</ul></div> : null}
                </div>
              )}
              <footer>
                Atualizada em{" "}
                {new Date(`${table.updatedAt}T12:00:00`).toLocaleDateString(
                  "pt-BR",
                )}
              </footer>
            </article>
          ))}
        </section>
      )}
      {tab === "catalog" && (
        <section className="panel event-catalog">
          <div className="panel-heading">
            <div>
              <span className="section-label">Rubricas</span>
              <h2>Catálogo de eventos</h2>
            </div>
          </div>
          {data.catalog.map((e) => (
            <article key={e.code}>
              <code>{e.code}</code>
              <div>
                <strong>{e.name}</strong>
                <small>{e.calculation}</small>
              </div>
              <StatusBadge tone={e.kind === "earning" ? "green" : "red"}>
                {e.kind === "earning" ? "Provento" : "Desconto"}
              </StatusBadge>
              <span>
                {e.incidences.length
                  ? e.incidences.join(" · ")
                  : "Sem incidências"}
              </span>
            </article>
          ))}
        </section>
      )}
      {tab === "history" && (
        <section className="panel payroll-history">
          <div className="panel-heading">
            <div>
              <span className="section-label">Competências anteriores</span>
              <h2>Histórico de folhas</h2>
            </div>
          </div>
          {data.history.map((h) => (
            <article key={h.id}>
              <span className="metric-icon green">
                <LockKeyhole />
              </span>
              <div>
                <strong>{competence(h.competence)}</strong>
                <small>
                  {h.employeesCount} colaboradores · fechada em{" "}
                  {new Date(h.updatedAt).toLocaleDateString("pt-BR")}
                </small>
              </div>
              <strong>{money(h.netTotal)}</strong>
              <StatusBadge tone="green">Fechada</StatusBadge>
            </article>
          ))}
        </section>
      )}
      <EmployeePayrollModal
        employee={detail}
        close={() => setDetail(undefined)}
        onApprove={(id) => {
          approve.mutate(id);
          setDetail(undefined);
        }}
      />
      <Modal
        open={Boolean(resolve)}
        onClose={() => setResolve(undefined)}
        title="Resolver exceção da folha"
        description="A resolução fica vinculada ao cálculo desta competência."
      >
        <div className="validation-modal">
          <label>
            Decisão
            <textarea defaultValue="Ocorrência conferida com os dados de jornada e ausência." />
          </label>
          <footer className="form-actions">
            <button
              className="secondary-button"
              onClick={() => setResolve(undefined)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              onClick={() => resolveMutation.mutate()}
            >
              Confirmar resolução
            </button>
          </footer>
        </div>
      </Modal>
    </div>
  );
}
function PayrollRows({
  employees,
  onDetail,
  full = false,
}: {
  employees: PayrollEmployee[];
  onDetail: (e: PayrollEmployee) => void;
  full?: boolean;
}) {
  return (
    <div className={`payroll-rows ${full ? "full" : ""}`}>
      {employees.map((e) => (
        <button key={e.id} onClick={() => onDetail(e)}>
          <span className="payroll-avatar">
            {e.employeeName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)}
          </span>
          <div>
            <strong>{e.employeeName}</strong>
            <small>
              {e.position} · {e.registration}
            </small>
          </div>
          {full && (
            <span>
              {money(e.baseSalary)}
              <small>Salário-base</small>
            </span>
          )}
          <span>
            {money(e.grossPay)}
            <small>Bruto</small>
          </span>
          <span className="negative">
            − {money(e.deductions)}
            <small>Descontos</small>
          </span>
          <strong className="net-value">{money(e.netPay)}</strong>
          <StatusBadge
            tone={
              e.status === "approved"
                ? "green"
                : e.status === "exception"
                  ? "red"
                  : "amber"
            }
          >
            {e.status === "approved"
              ? "Aprovado"
              : e.status === "exception"
                ? "Exceção"
                : "Pendente"}
          </StatusBadge>
          <ChevronRight />
        </button>
      ))}
    </div>
  );
}
function EmployeePayrollModal({
  employee,
  close,
  onApprove,
}: {
  employee?: PayrollEmployee;
  close: () => void;
  onApprove: (id: string) => void;
}) {
  return (
    <Modal
      open={Boolean(employee)}
      onClose={close}
      title={employee?.employeeName ?? "Detalhe da folha"}
      description={`${employee?.position ?? ""} · competência agosto/2026`}
    >
      {employee && (
        <div className="payroll-detail">
          <div className="payroll-detail-summary">
            <span>
              <small>Salário-base</small>
              <strong>{money(employee.baseSalary)}</strong>
            </span>
            <span>
              <small>Total bruto</small>
              <strong>{money(employee.grossPay)}</strong>
            </span>
            <span>
              <small>Descontos</small>
              <strong className="negative">
                − {money(employee.deductions)}
              </strong>
            </span>
            <span>
              <small>Líquido</small>
              <strong className="positive">{money(employee.netPay)}</strong>
            </span>
          </div>
          <div className="event-lines">
            <header>
              <strong>Eventos do cálculo</strong>
              <span>Referência</span>
              <span>Valor</span>
            </header>
            {employee.events
              .filter((e) => e.kind !== "informational")
              .map((e) => (
                <div key={e.id}>
                  <code>{e.code}</code>
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {e.automatic
                        ? "Calculado automaticamente"
                        : "Lançamento manual"}
                    </small>
                  </span>
                  <span>{e.reference}</span>
                  <strong
                    className={e.kind === "deduction" ? "negative" : "positive"}
                  >
                    {e.kind === "deduction" ? "− " : "+ "}
                    {money(e.amount)}
                  </strong>
                </div>
              ))}
          </div>
          <div className="payroll-detail-actions">
            <button className="secondary-button" onClick={() => window.print()}>
            <FileText /> Imprimir holerite
            </button>
            <button
              className="primary-button"
              disabled={
                employee.exceptions.some((e) => e.status === "open") ||
                employee.status === "approved"
              }
              onClick={() => onApprove(employee.employeeId)}
            >
              <Check />{" "}
              {employee.status === "approved" ? "Aprovado" : "Aprovar cálculo"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
