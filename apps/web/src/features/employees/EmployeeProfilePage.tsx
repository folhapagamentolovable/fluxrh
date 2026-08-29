import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import {
  createDocumentRequest,
  createEmployeeDependent,
  getEmployee,
  getEmployeeDependents,
  updateEmployee,
} from "@/lib/api";
import { formatCpf, formatPhone, normalizeDigits } from "@/lib/cnpj";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const tabs = [
  "Visão geral",
  "Dados pessoais",
  "Vínculo",
  "Documentos",
  "Dependentes",
  "Histórico",
];

export function EmployeeProfilePage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const [tab, setTab] = useState("Visão geral");
  const [documentOpen, setDocumentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
  });
  const [dependentOpen, setDependentOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(
    "Comprovante de residência",
  );
  const [dependent, setDependent] = useState({
    fullName: "",
    birthDate: "",
    relationship: "Filho(a)",
    eligibleForBenefits: true,
  });
  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({ queryKey: ["employee", id], queryFn: () => getEmployee(id) });
  const { data: persistedDependents = [] } = useQuery({
    queryKey: ["employee-dependents", id],
    queryFn: () => getEmployeeDependents(id),
    enabled: Boolean(id),
  });
  const documentMutation = useMutation({
    mutationFn: () =>
      createDocumentRequest({
        subjectName: employee!.fullName,
        subjectDocument: employee!.cpf,
        companyName: employee!.companyName,
        title: documentTitle,
        category: "personal",
        required: true,
      }),
    onSuccess: () => {
      setDocumentOpen(false);
      client.invalidateQueries({ queryKey: ["employee", id] });
    },
  });
  const dependentMutation = useMutation({
    mutationFn: () =>
      createEmployeeDependent(id, { employeeId: id, ...dependent }),
    onSuccess: () => {
      setDependentOpen(false);
      setDependent({
        fullName: "",
        birthDate: "",
        relationship: "Filho(a)",
        eligibleForBenefits: true,
      });
      client.invalidateQueries({ queryKey: ["employee-dependents", id] });
    },
  });
  const editMutation = useMutation({
    mutationFn: () => updateEmployee(id, editForm),
    onSuccess: () => {
      setEditOpen(false);
      client.invalidateQueries({ queryKey: ["employee", id] });
      client.invalidateQueries({ queryKey: ["employees"] });
    },
  });
  if (isLoading)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  if (error)
    return (
      <div className="page">
        <div className="error-state">
          <UserRound />
          <h2>
            {error instanceof Error && error.message.includes("(404)")
              ? "Colaborador não encontrado"
              : "Não foi possível carregar o colaborador"}
          </h2>
          <p>
            {error instanceof Error && error.message.includes("(404)")
              ? "O cadastro solicitado não existe ou não está disponível nesta organização."
              : "O cadastro existe, mas ocorreu uma falha ao carregar o prontuário. Tente novamente em instantes."}
          </p>
          <Link to="/pessoas">Voltar para pessoas</Link>
        </div>
      </div>
    );
  if (!employee)
    return (
      <div className="page">
        <div className="error-state">
          <UserRound />
          <h2>Colaborador não encontrado</h2>
          <Link to="/pessoas">Voltar para pessoas</Link>
        </div>
      </div>
    );
  const initials = employee.fullName
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="page profile-page">
      <Link className="back-link" to="/pessoas">
        <ArrowLeft size={16} /> Voltar para colaboradores
      </Link>
      <section className="profile-hero panel">
        <div className="profile-main">
          <span
            className="large-avatar"
            style={{ background: employee.avatarColor }}
          >
            {initials}
          </span>
          <div>
            <div className="profile-title">
              <h1>{employee.fullName}</h1>
              <StatusBadge
                tone={employee.status === "active" ? "green" : "blue"}
              >
                {employee.status === "onboarding"
                  ? "Onboarding"
                  : employee.status === "vacation"
                    ? "Em férias"
                    : "Ativo"}
              </StatusBadge>
            </div>
            <p>
              {employee.position} · {employee.departmentName}
            </p>
            <div className="profile-contacts">
              <span>
                <Mail />
                {employee.email}
              </span>
              <span>
                <Phone />
                {[10, 11].includes(normalizeDigits(employee.phone).length)
                  ? formatPhone(employee.phone)
                  : employee.phone}
              </span>
              <span>
                <MapPin />
                {employee.establishmentName}
              </span>
            </div>
          </div>
        </div>
        <button
          className="secondary-button"
          onClick={() => {
            setEditForm({
              fullName: employee.fullName,
              email: employee.email,
              phone: employee.phone,
              birthDate: employee.birthDate,
            });
            setEditOpen(true);
          }}
        >
          <Pencil size={16} /> Editar cadastro
        </button>
      </section>
      <div className="profile-tabs">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={tab === item ? "active" : ""}
          >
            {item}
            {item === "Documentos" && <span>{employee.documents.length}</span>}
          </button>
        ))}
      </div>
      {tab === "Visão geral" && (
        <div className="profile-grid">
          <section className="profile-column">
            <article className="panel info-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Contrato atual</span>
                  <h2>Vínculo profissional</h2>
                </div>
                <BriefcaseBusiness />
              </div>
              <div className="info-grid">
                <Info label="Matrícula" value={employee.registration} />
                <Info
                  label="Admissão"
                  value={new Date(
                    `${employee.hireDate}T12:00:00`,
                  ).toLocaleDateString("pt-BR")}
                />
                <Info label="Tipo de contrato" value={employee.contractType} />
                <Info label="Cargo" value={employee.position} />
                <Info
                  label="Salário-base"
                  value={money.format(employee.salary)}
                />
                <Info label="Gestor" value={employee.managerName} />
              </div>
            </article>
            <article className="panel info-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Lotação</span>
                  <h2>Estrutura organizacional</h2>
                </div>
                <MapPin />
              </div>
              <div className="org-path">
                <span>{employee.companyName}</span>
                <i>›</i>
                <span>{employee.establishmentName}</span>
                <i>›</i>
                <span>{employee.departmentName}</span>
                <i>›</i>
                <strong>{employee.costCenterName}</strong>
              </div>
            </article>
            <article className="panel timeline-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Rastreabilidade</span>
                  <h2>Atividades recentes</h2>
                </div>
                <Clock3 />
              </div>
              {employee.timeline.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <i />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <small>
                      {item.category} ·{" "}
                      {new Date(item.occurredAt).toLocaleDateString("pt-BR")}
                    </small>
                  </div>
                </div>
              ))}
            </article>
          </section>
          <aside className="profile-aside">
            <article className="panel health-card">
              <div className="health-score">
                <ShieldCheck />
                <strong>92%</strong>
              </div>
              <h2>Prontuário saudável</h2>
              <p>Uma pendência documental impede a conclusão do onboarding.</p>
              <div className="progress">
                <i style={{ width: "92%" }} />
              </div>
            </article>
            <article className="panel quick-info">
              <h2>Resumo operacional</h2>
              <div>
                <CalendarDays />
                <span>
                  <small>Próximas férias</small>
                  <strong>A programar</strong>
                </span>
              </div>
              <div>
                <Clock3 />
                <span>
                  <small>Jornada</small>
                  <strong>{employee.workSchedule}</strong>
                </span>
              </div>
              <div>
                <FileText />
                <span>
                  <small>Documentos válidos</small>
                  <strong>
                    {
                      employee.documents.filter((x) => x.status === "valid")
                        .length
                    }{" "}
                    de {employee.documents.length}
                  </strong>
                </span>
              </div>
              <div>
                <UsersRound />
                <span>
                  <small>Dependentes</small>
                  <strong>{employee.dependents.length}</strong>
                </span>
              </div>
            </article>
          </aside>
        </div>
      )}
      {tab === "Dados pessoais" && (
        <section className="panel info-panel tab-content">
          <h2>Dados pessoais e contato</h2>
          <div className="info-grid">
            <Info label="Nome completo" value={employee.fullName} />
            <Info
              label="CPF"
              value={
                normalizeDigits(employee.cpf).length === 11
                  ? formatCpf(employee.cpf)
                  : employee.cpf
              }
            />
            <Info
              label="Nascimento"
              value={new Date(
                `${employee.birthDate}T12:00:00`,
              ).toLocaleDateString("pt-BR")}
            />
            <Info label="E-mail" value={employee.email} />
            <Info
              label="Telefone"
              value={
                [10, 11].includes(normalizeDigits(employee.phone).length)
                  ? formatPhone(employee.phone)
                  : employee.phone
              }
            />
          </div>
        </section>
      )}
      {tab === "Vínculo" && (
        <section className="panel info-panel tab-content">
          <h2>Vínculo e remuneração</h2>
          <div className="info-grid">
            <Info label="Empresa" value={employee.companyName} />
            <Info label="Estabelecimento" value={employee.establishmentName} />
            <Info label="Departamento" value={employee.departmentName} />
            <Info label="Centro de custo" value={employee.costCenterName} />
            <Info label="Cargo" value={employee.position} />
            <Info label="Salário-base" value={money.format(employee.salary)} />
            <Info label="Jornada" value={employee.workSchedule} />
            <Info label="Gestor" value={employee.managerName} />
          </div>
        </section>
      )}
      {tab === "Documentos" && (
        <section className="panel tab-content">
          <div className="panel-heading">
            <h2>Documentos do colaborador</h2>
            <button
              className="primary-button"
              onClick={() => setDocumentOpen(true)}
            >
              Solicitar documento
            </button>
          </div>
          <div className="document-list">
            {employee.documents.map((doc) => (
              <div key={doc.id}>
                <span className="doc-icon">
                  <FileText />
                </span>
                <span>
                  <strong>{doc.name}</strong>
                  <small>
                    {doc.expiresAt
                      ? `Validade: ${new Date(`${doc.expiresAt}T12:00:00`).toLocaleDateString("pt-BR")}`
                      : "Sem vencimento"}
                  </small>
                </span>
                <StatusBadge
                  tone={
                    doc.status === "valid"
                      ? "green"
                      : doc.status === "expired"
                        ? "red"
                        : "amber"
                  }
                >
                  {doc.status === "valid"
                    ? "Válido"
                    : doc.status === "expired"
                      ? "Vencido"
                      : "Pendente"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Dependentes" && (
        <section className="panel tab-content">
          <div className="panel-heading">
            <h2>Dependentes</h2>
            <button
              className="primary-button"
              onClick={() => setDependentOpen(true)}
            >
              Adicionar dependente
            </button>
          </div>
          {persistedDependents.length || employee.dependents.length ? (
            <div className="document-list">
              {persistedDependents.map((dep) => (
                <div key={dep.id}>
                  <span className="doc-icon">
                    <UserRound />
                  </span>
                  <span>
                    <strong>{dep.fullName}</strong>
                    <small>
                      {dep.relationship} ·{" "}
                      {new Date(`${dep.birthDate}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </small>
                  </span>
                </div>
              ))}
              {employee.dependents.map((dep) => (
                <div key={dep.id}>
                  <span className="doc-icon">
                    <UserRound />
                  </span>
                  <span>
                    <strong>{dep.name}</strong>
                    <small>
                      {dep.relationship} ·{" "}
                      {new Date(`${dep.birthDate}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-empty">Nenhum dependente cadastrado.</div>
          )}
        </section>
      )}
      {tab === "Histórico" && (
        <section className="panel timeline-panel tab-content">
          <h2>Linha do tempo completa</h2>
          {employee.timeline.map((item) => (
            <div className="timeline-item" key={item.id}>
              <i />
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <small>
                  {new Date(item.occurredAt).toLocaleString("pt-BR")}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cadastro" description="Atualize os dados pessoais do colaborador.">
        <form className="special-form" onSubmit={(event) => { event.preventDefault(); editMutation.mutate(); }}>
          <label>Nome completo<input required minLength={3} value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} /></label>
          <div className="form-grid">
            <label>E-mail<input required type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
            <label>Telefone<input required value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label>
            <label>Data de nascimento<input required type="date" value={editForm.birthDate} onChange={(event) => setEditForm({ ...editForm, birthDate: event.target.value })} /></label>
          </div>
          <footer className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditOpen(false)}>Cancelar</button><button className="primary-button" disabled={editMutation.isPending}>{editMutation.isPending ? "Salvando..." : "Salvar alterações"}</button></footer>
        </form>
      </Modal>
      <Modal
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        title="Solicitar documento"
        description="A solicitação ficará disponível para acompanhamento."
      >
        <div className="special-form">
          <label>
            Documento
            <input
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
            />
          </label>
          <footer className="form-actions">
            <button
              className="secondary-button"
              onClick={() => setDocumentOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                documentMutation.isPending || documentTitle.trim().length < 3
              }
              onClick={() => documentMutation.mutate()}
            >
              Enviar solicitação
            </button>
          </footer>
        </div>
      </Modal>
      <Modal
        open={dependentOpen}
        onClose={() => setDependentOpen(false)}
        title="Adicionar dependente"
        description="O cadastro será vinculado ao colaborador."
      >
        <div className="special-form">
          <label>
            Nome completo
            <input
              value={dependent.fullName}
              onChange={(event) =>
                setDependent({ ...dependent, fullName: event.target.value })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              Nascimento
              <input
                type="date"
                value={dependent.birthDate}
                onChange={(event) =>
                  setDependent({ ...dependent, birthDate: event.target.value })
                }
              />
            </label>
            <label>
              Parentesco
              <select
                value={dependent.relationship}
                onChange={(event) =>
                  setDependent({
                    ...dependent,
                    relationship: event.target.value,
                  })
                }
              >
                <option>Filho(a)</option>
                <option>Cônjuge</option>
                <option>Enteado(a)</option>
                <option>Outro</option>
              </select>
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={dependent.eligibleForBenefits}
              onChange={(event) =>
                setDependent({
                  ...dependent,
                  eligibleForBenefits: event.target.checked,
                })
              }
            />{" "}
            Elegível para benefícios
          </label>
          <footer className="form-actions">
            <button
              className="secondary-button"
              onClick={() => setDependentOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                dependentMutation.isPending ||
                dependent.fullName.trim().length < 3 ||
                !dependent.birthDate
              }
              onClick={() => dependentMutation.mutate()}
            >
              Cadastrar dependente
            </button>
          </footer>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
