import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ChevronRight,
  Filter,
  Plus,
  Search,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { BrazilianDateInput } from "@/components/ui/BrazilianDateInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createEmployee, getEmployees, getOrganizations } from "@/lib/api";
import {
  formatCpf,
  formatPhone,
  isValidCpf,
  isValidPhone,
  normalizeDigits,
} from "@/lib/cnpj";

const statusMap = {
  active: ["Ativo", "green"],
  vacation: ["Em férias", "blue"],
  leave: ["Afastado", "amber"],
  onboarding: ["Onboarding", "purple"],
  terminated: ["Desligado", "gray"],
} as const;
const initialForm = {
  fullName: "",
  cpf: "",
  email: "",
  phone: "",
  birthDate: "",
  hireDate: "",
  companyId: "",
  establishmentId: "",
  departmentId: "",
  costCenterId: "",
  position: "",
  salary: 0,
  workSchedule: "",
  managerName: "",
};

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });
  const { data: organization } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setModalOpen(false);
      setForm(initialForm);
      navigate(`/pessoas/${employee.id}`);
    },
  });
  const filtered = useMemo(
    () =>
      employees.filter(
        (employee) =>
          (status === "all" || employee.status === status) &&
          `${employee.fullName} ${employee.position} ${employee.registration}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [employees, query, status],
  );
  const activeCompanies =
    organization?.companies.filter((company) => company.status === "active") ??
    [];
  const establishments =
    organization?.units.filter(
      (unit) =>
        unit.status === "active" &&
        unit.companyId === form.companyId &&
        unit.type === "establishment",
    ) ?? [];
  const departments =
    organization?.units.filter(
      (unit) =>
        unit.status === "active" &&
        unit.companyId === form.companyId &&
        unit.type === "department" &&
        unit.parentId === form.establishmentId,
    ) ?? [];
  const costCenters =
    organization?.units.filter(
      (unit) =>
        unit.status === "active" &&
        unit.companyId === form.companyId &&
        unit.type === "cost_center" &&
        unit.parentId === form.departmentId,
    ) ?? [];

  const organizationSelection = (companyId: string) => {
    const establishment = organization?.units.find(
      (unit) =>
        unit.status === "active" &&
        unit.companyId === companyId &&
        unit.type === "establishment",
    );
    const department = organization?.units.find(
      (unit) =>
        unit.status === "active" &&
        unit.companyId === companyId &&
        unit.type === "department" &&
        unit.parentId === establishment?.id,
    );
    const costCenter = organization?.units.find(
      (unit) =>
        unit.status === "active" &&
        unit.companyId === companyId &&
        unit.type === "cost_center" &&
        unit.parentId === department?.id,
    );
    return {
      companyId,
      establishmentId: establishment?.id ?? "",
      departmentId: department?.id ?? "",
      costCenterId: costCenter?.id ?? "",
    };
  };

  useEffect(() => {
    if (!modalOpen || form.companyId || activeCompanies.length === 0) return;
    setForm((current) => ({
      ...current,
      ...organizationSelection(activeCompanies[0].id),
    }));
  }, [activeCompanies, form.companyId, modalOpen, organization]);

  const structureComplete = Boolean(
    form.companyId &&
    form.establishmentId &&
    form.departmentId &&
    form.costCenterId,
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (structureComplete && isValidCpf(form.cpf) && isValidPhone(form.phone))
      mutation.mutate({
        ...form,
        cpf: normalizeDigits(form.cpf),
        phone: normalizeDigits(form.phone),
      });
  };

  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <UsersRound size={15} /> Gestão de pessoas
          </span>
          <h1>Colaboradores</h1>
          <p>Cadastros, vínculos e prontuários em uma única visão.</p>
        </div>
        <button className="primary-button" onClick={() => setModalOpen(true)}>
          <Plus size={17} /> Novo colaborador
        </button>
      </section>
      <section className="people-summary">
        <div>
          <span className="metric-icon blue">
            <UsersRound />
          </span>
          <strong>{employees.length}</strong>
          <small>Total cadastrado</small>
        </div>
        <div>
          <span className="metric-icon green">
            <UserCheck />
          </span>
          <strong>
            {employees.filter((x) => x.status === "active").length}
          </strong>
          <small>Ativos</small>
        </div>
        <div>
          <span className="metric-icon purple">
            <BriefcaseBusiness />
          </span>
          <strong>
            {employees.filter((x) => x.status === "onboarding").length}
          </strong>
          <small>Em onboarding</small>
        </div>
      </section>
      <section className="panel data-panel">
        <div className="table-toolbar people-toolbar">
          <div className="field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome, matrícula ou cargo"
            />
          </div>
          <select
            aria-label="Filtrar pessoas por status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="onboarding">Onboarding</option>
            <option value="vacation">Em férias</option>
            <option value="leave">Afastados</option>
          </select>
          <button
            className="secondary-button"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            <Filter size={16} /> Limpar filtros
          </button>
        </div>
        {isLoading ? (
          <div className="table-loading">Carregando colaboradores...</div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cargo e área</th>
                  <th>Empresa</th>
                  <th>Admissão</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => {
                  const [label, tone] = statusMap[employee.status];
                  return (
                    <tr key={employee.id}>
                      <td>
                        <Link
                          className="person-cell"
                          to={`/pessoas/${employee.id}`}
                        >
                          <span
                            className="person-avatar"
                            style={{ background: employee.avatarColor }}
                          >
                            {employee.fullName
                              .split(" ")
                              .map((x) => x[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <span>
                            <strong>{employee.fullName}</strong>
                            <small>Matrícula {employee.registration}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <strong>{employee.position}</strong>
                        <small>{employee.departmentName}</small>
                      </td>
                      <td>
                        <strong>{employee.companyName}</strong>
                        <small>{employee.establishmentName}</small>
                      </td>
                      <td>
                        {new Date(
                          `${employee.hireDate}T12:00:00`,
                        ).toLocaleDateString("pt-BR")}
                      </td>
                      <td>
                        <StatusBadge tone={tone === "purple" ? "blue" : tone}>
                          {label}
                        </StatusBadge>
                      </td>
                      <td>
                        <Link
                          className="row-arrow"
                          to={`/pessoas/${employee.id}`}
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="table-empty">Nenhum colaborador encontrado.</div>
            )}
          </div>
        )}
      </section>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo colaborador"
        description="Crie o prontuário inicial e prepare o workflow de admissão."
      >
        <form className="form-grid employee-form" onSubmit={submit}>
          <label className="span-2">
            Nome completo
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>
          <label>
            CPF
            <input
              required
              inputMode="numeric"
              maxLength={14}
              value={form.cpf}
              onChange={(e) =>
                setForm({ ...form, cpf: formatCpf(e.target.value) })
              }
              placeholder="000.000.000-00"
            />
          </label>
          <label>
            Data de nascimento
            <BrazilianDateInput
              required
              value={form.birthDate}
              onValueChange={(birthDate) => setForm({ ...form, birthDate })}
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Telefone
            <input
              required
              inputMode="tel"
              maxLength={15}
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: formatPhone(e.target.value) })
              }
              placeholder="(00) 00000-0000"
            />
          </label>
          <div className="form-separator span-2">Vínculo e lotação</div>
          <label>
            Empresa
            <select
              required
              value={form.companyId}
              onChange={(e) =>
                setForm({
                  ...form,
                  ...organizationSelection(e.target.value),
                })
              }
            >
              <option value="">Selecione a empresa</option>
              {activeCompanies.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.tradeName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estabelecimento
            <select
              required
              disabled={!form.companyId || establishments.length === 0}
              value={form.establishmentId}
              onChange={(e) => {
                const establishmentId = e.target.value;
                const department = organization?.units.find(
                  (unit) =>
                    unit.status === "active" &&
                    unit.type === "department" &&
                    unit.parentId === establishmentId,
                );
                const costCenter = organization?.units.find(
                  (unit) =>
                    unit.status === "active" &&
                    unit.type === "cost_center" &&
                    unit.parentId === department?.id,
                );
                setForm({
                  ...form,
                  establishmentId,
                  departmentId: department?.id ?? "",
                  costCenterId: costCenter?.id ?? "",
                });
              }}
            >
              <option value="">
                {form.companyId
                  ? "Nenhum estabelecimento cadastrado"
                  : "Selecione a empresa"}
              </option>
              {establishments.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Departamento
            <select
              required
              disabled={!form.establishmentId || departments.length === 0}
              value={form.departmentId}
              onChange={(e) => {
                const departmentId = e.target.value;
                const costCenter = organization?.units.find(
                  (unit) =>
                    unit.status === "active" &&
                    unit.type === "cost_center" &&
                    unit.parentId === departmentId,
                );
                setForm({
                  ...form,
                  departmentId,
                  costCenterId: costCenter?.id ?? "",
                });
              }}
            >
              <option value="">
                {form.establishmentId
                  ? "Nenhum departamento cadastrado"
                  : "Selecione o estabelecimento"}
              </option>
              {departments.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Centro de custo
            <select
              required
              disabled={!form.departmentId || costCenters.length === 0}
              value={form.costCenterId}
              onChange={(e) =>
                setForm({ ...form, costCenterId: e.target.value })
              }
            >
              <option value="">
                {form.departmentId
                  ? "Nenhum centro de custo cadastrado"
                  : "Selecione o departamento"}
              </option>
              {costCenters.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cargo
            <input
              required
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </label>
          <label>
            Gestor
            <input
              required
              value={form.managerName}
              onChange={(e) =>
                setForm({ ...form, managerName: e.target.value })
              }
            />
          </label>
          <label>
            Salário
            <input
              type="number"
              min="1"
              required
              value={form.salary || ""}
              onChange={(e) =>
                setForm({ ...form, salary: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Data de admissão
            <BrazilianDateInput
              required
              value={form.hireDate}
              onValueChange={(hireDate) => setForm({ ...form, hireDate })}
            />
          </label>
          {mutation.error && (
            <p className="form-error span-2">
              Não foi possível cadastrar. Verifique todos os campos.
            </p>
          )}
          <footer className="form-actions span-2">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                mutation.isPending ||
                !structureComplete ||
                !isValidCpf(form.cpf) ||
                !isValidPhone(form.phone)
              }
            >
              {mutation.isPending
                ? "Criando prontuário..."
                : "Criar e iniciar admissão"}
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}
