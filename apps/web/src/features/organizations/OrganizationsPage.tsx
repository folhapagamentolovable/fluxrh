import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  CircleDollarSign,
  GitBranch,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type {
  Company,
  CreateCompanyInput,
  CreateOrganizationUnitInput,
  OrganizationUnit,
} from "@fluxrh/contracts";
import {
  createCompany,
  createOrganizationUnit,
  deleteCompany,
  deleteOrganizationUnit,
  getOrganizations,
  updateCompany,
  updateOrganizationUnit,
} from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatCnpj,
  formatPhone,
  isValidCnpj,
  isValidPhone,
  normalizeDigits,
} from "@/lib/cnpj";

type CompanyForm = Omit<
  CreateCompanyInput,
  "document" | "phone" | "postalCode"
> & {
  document: string;
  phone: string;
  postalCode: string;
  status: "active" | "inactive";
};
const emptyCompany: CompanyForm = {
  legalName: "",
  tradeName: "",
  document: "",
  responsibleName: "",
  responsibleRole: "",
  phone: "",
  street: "",
  streetNumber: "",
  complement: "",
  district: "",
  city: "",
  state: "SP",
  postalCode: "",
  status: "active" as const,
};
const emptyUnit: CreateOrganizationUnitInput = {
  companyId: "",
  parentId: null,
  type: "establishment",
  code: "",
  name: "",
  status: "active",
  managerName: "",
  document: "",
  phone: "",
  email: "",
  street: "",
  streetNumber: "",
  complement: "",
  district: "",
  city: "",
  state: "SP",
  postalCode: "",
};
const unitLabels = {
  establishment: "Estabelecimento",
  department: "Departamento",
  cost_center: "Centro de custo",
};
const cep = (value: string) => {
  const d = normalizeDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export function OrganizationsPage() {
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });
  const [view, setView] = useState<"companies" | "hierarchy">("companies");
  const [query, setQuery] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company>();
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [unitOpen, setUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrganizationUnit>();
  const [unitForm, setUnitForm] =
    useState<CreateOrganizationUnitInput>(emptyUnit);
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["organizations"] });
  const companyMutation = useMutation({
    mutationFn: async () => {
      const { status, ...createInput } = companyForm;
      const normalized = {
        ...createInput,
        document: normalizeDigits(createInput.document),
        phone: normalizeDigits(createInput.phone),
        postalCode: normalizeDigits(createInput.postalCode),
      };
      return editingCompany
        ? updateCompany(editingCompany.id, { ...normalized, status })
        : createCompany(normalized as CreateCompanyInput);
    },
    onSuccess: () => {
      refresh();
      closeCompany();
    },
  });
  const unitMutation = useMutation({
    mutationFn: () =>
      editingUnit
        ? updateOrganizationUnit(editingUnit.id, unitForm)
        : createOrganizationUnit(unitForm),
    onSuccess: () => {
      refresh();
      closeUnit();
    },
  });
  const remove = useMutation({
    mutationFn: ({ kind, id }: { kind: "company" | "unit"; id: string }) =>
      kind === "company" ? deleteCompany(id) : deleteOrganizationUnit(id),
    onSuccess: refresh,
  });
  const companies = useMemo(
    () =>
      data?.companies.filter((x) =>
        `${x.tradeName} ${x.legalName} ${x.document}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ) ?? [],
    [data, query],
  );
  function closeCompany() {
    setCompanyOpen(false);
    setEditingCompany(undefined);
    setCompanyForm(emptyCompany);
  }
  function openCompany(company?: Company) {
    setEditingCompany(company);
    setCompanyForm(
      company
        ? {
            legalName: company.legalName,
            tradeName: company.tradeName,
            document: formatCnpj(company.document),
            responsibleName: company.responsibleName,
            responsibleRole: company.responsibleRole,
            phone: formatPhone(company.phone),
            street: company.street,
            streetNumber: company.streetNumber,
            complement: company.complement,
            district: company.district,
            city: company.city,
            state: company.state,
            postalCode: cep(company.postalCode),
            status: company.status,
          }
        : emptyCompany,
    );
    setCompanyOpen(true);
  }
  function closeUnit() {
    setUnitOpen(false);
    setEditingUnit(undefined);
    setUnitForm(emptyUnit);
  }
  function openUnit(
    unit?: OrganizationUnit,
    defaults?: Partial<CreateOrganizationUnitInput>,
  ) {
    setEditingUnit(unit);
    setUnitForm(
      unit
        ? {
            companyId: unit.companyId,
            parentId: unit.parentId,
            type: unit.type,
            code: unit.code,
            name: unit.name,
            status: unit.status,
            managerName: unit.managerName ?? "",
            document: unit.document ? formatCnpj(unit.document) : "",
            phone: unit.phone ? formatPhone(unit.phone) : "",
            email: unit.email ?? "",
            street: unit.street ?? "",
            streetNumber: unit.streetNumber ?? "",
            complement: unit.complement ?? "",
            district: unit.district ?? "",
            city: unit.city ?? "",
            state: unit.state ?? "SP",
            postalCode: unit.postalCode ? cep(unit.postalCode) : "",
          }
        : { ...emptyUnit, ...defaults },
    );
    setUnitOpen(true);
  }
  function confirmDelete(kind: "company" | "unit", id: string, name: string) {
    if (
      window.confirm(
        `Excluir ${name}? A ação só será concluída se não houver vínculos dependentes.`,
      )
    )
      remove.mutate({ kind, id });
  }
  if (isLoading)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  if (error || !data)
    return (
      <div className="page">
        <div className="error-state">
          <Building2 />
          <h2>Estrutura indisponível</h2>
        </div>
      </div>
    );
  const parents =
    unitForm.type === "department"
      ? data.units.filter(
          (x) =>
            x.companyId === unitForm.companyId && x.type === "establishment",
        )
      : unitForm.type === "cost_center"
        ? data.units.filter(
            (x) =>
              x.companyId === unitForm.companyId && x.type === "department",
          )
        : [];
  const unitReady = Boolean(
    unitForm.companyId &&
    unitForm.code.trim().length >= 2 &&
    unitForm.name.trim().length >= 2 &&
    (unitForm.type === "establishment" || unitForm.parentId),
  );
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <Building2 size={15} /> Estrutura organizacional
          </span>
          <h1>Empresas e unidades</h1>
          <p>
            Cadastre e mantenha empresas, estabelecimentos, departamentos e
            centros de custo.
          </p>
        </div>
        <div className="row-actions">
          <button className="secondary-button" onClick={() => openUnit()}>
            <Plus /> Nova unidade
          </button>
          <button className="primary-button" onClick={() => openCompany()}>
            <Plus /> Nova empresa
          </button>
        </div>
      </section>
      <section className="org-summary">
        {(
          [
            ["Empresas", data.summary.companies, Building2, "blue"],
            ["Estabelecimentos", data.summary.establishments, MapPin, "green"],
            ["Departamentos", data.summary.departments, GitBranch, "purple"],
            [
              "Centros de custo",
              data.summary.costCenters,
              CircleDollarSign,
              "amber",
            ],
          ] as const
        ).map(([l, v, I, t]) => (
          <div className="org-summary-card" key={l}>
            <span className={`metric-icon ${t}`}>
              <I size={20} />
            </span>
            <div>
              <strong>{v}</strong>
              <small>{l}</small>
            </div>
          </div>
        ))}
      </section>
      <div className="segmented-tabs">
        <button
          className={view === "companies" ? "active" : ""}
          onClick={() => setView("companies")}
        >
          Empresas
        </button>
        <button
          className={view === "hierarchy" ? "active" : ""}
          onClick={() => setView("hierarchy")}
        >
          Hierarquia
        </button>
      </div>
      {view === "companies" ? (
        <section className="panel data-panel">
          <div className="table-toolbar">
            <div className="field">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por empresa ou CNPJ"
              />
            </div>
            <span>{companies.length} empresas</span>
          </div>
          <div className="company-grid">
            {companies.map((company) => (
              <article className="company-card" key={company.id}>
                <div className="company-card-top">
                  <span className="company-logo">
                    {company.tradeName
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${company.tradeName}`}
                      onClick={() => openCompany(company)}
                    >
                      <Pencil />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Excluir ${company.tradeName}`}
                      onClick={() =>
                        confirmDelete("company", company.id, company.tradeName)
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
                <StatusBadge
                  tone={company.status === "active" ? "green" : "gray"}
                >
                  {company.status === "active" ? "Ativa" : "Inativa"}
                </StatusBadge>
                <h2>{company.tradeName}</h2>
                <p>{company.legalName}</p>
                <dl>
                  <div>
                    <dt>CNPJ</dt>
                    <dd>{formatCnpj(company.document)}</dd>
                  </div>
                  <div>
                    <dt>Responsável</dt>
                    <dd>{company.responsibleName || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Contato</dt>
                    <dd>
                      {company.phone
                        ? formatPhone(company.phone)
                        : "Não informado"}
                    </dd>
                  </div>
                  <div>
                    <dt>Endereço</dt>
                    <dd>
                      {company.city}/{company.state}
                    </dd>
                  </div>
                </dl>
                <footer>
                  <span>
                    <UsersRound /> {company.employeesCount} pessoas
                  </span>
                  <span>
                    <MapPin /> {company.establishmentsCount} unidades
                  </span>
                </footer>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <Hierarchy
          data={data}
          editCompany={openCompany}
          editUnit={openUnit}
          addUnit={openUnit}
          remove={confirmDelete}
        />
      )}
      <Modal
        open={companyOpen}
        onClose={closeCompany}
        title={editingCompany ? "Editar empresa" : "Cadastrar empresa"}
        description="Dados jurídicos, responsável e endereço principal."
      >
        <form
          className="form-grid"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            companyMutation.mutate();
          }}
        >
          <label className="span-2">
            Razão social
            <input
              required
              value={companyForm.legalName}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, legalName: e.target.value })
              }
            />
          </label>
          <label>
            Nome fantasia
            <input
              required
              value={companyForm.tradeName}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, tradeName: e.target.value })
              }
            />
          </label>
          <label>
            CNPJ
            <input
              required
              value={companyForm.document}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  document: formatCnpj(e.target.value),
                })
              }
            />
          </label>
          <label>
            Nome do responsável
            <input
              required
              value={companyForm.responsibleName}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  responsibleName: e.target.value,
                })
              }
            />
          </label>
          <label>
            Cargo
            <input
              required
              value={companyForm.responsibleRole}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  responsibleRole: e.target.value,
                })
              }
            />
          </label>
          <label>
            Telefone de contato
            <input
              required
              value={companyForm.phone}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  phone: formatPhone(e.target.value),
                })
              }
            />
          </label>
          <label>
            CEP
            <input
              required
              value={companyForm.postalCode}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  postalCode: cep(e.target.value),
                })
              }
            />
          </label>
          <label className="span-2">
            Rua
            <input
              required
              value={companyForm.street}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, street: e.target.value })
              }
            />
          </label>
          <label>
            Número
            <input
              required
              value={companyForm.streetNumber}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, streetNumber: e.target.value })
              }
            />
          </label>
          <label>
            Complemento
            <input
              value={companyForm.complement}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, complement: e.target.value })
              }
            />
          </label>
          <label>
            Bairro
            <input
              required
              value={companyForm.district}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, district: e.target.value })
              }
            />
          </label>
          <label>
            Cidade
            <input
              required
              value={companyForm.city}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, city: e.target.value })
              }
            />
          </label>
          <label>
            UF
            <input
              required
              maxLength={2}
              value={companyForm.state}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  state: e.target.value.toUpperCase(),
                })
              }
            />
          </label>
          {editingCompany && (
            <label>
              Status
              <select
                value={companyForm.status}
                onChange={(e) =>
                  setCompanyForm({
                    ...companyForm,
                    status: e.target.value as "active" | "inactive",
                  })
                }
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </label>
          )}
          {companyMutation.error && (
            <p className="form-error span-2">
              Não foi possível salvar. Confira os dados e se o CNPJ já existe.
            </p>
          )}
          <footer className="form-actions span-2">
            <button
              type="button"
              className="secondary-button"
              onClick={closeCompany}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                companyMutation.isPending ||
                !isValidCnpj(companyForm.document) ||
                !isValidPhone(companyForm.phone) ||
                normalizeDigits(companyForm.postalCode).length !== 8
              }
            >
              {companyMutation.isPending ? (
                "Salvando..."
              ) : (
                <>
                  Salvar empresa <ChevronRight />
                </>
              )}
            </button>
          </footer>
        </form>
      </Modal>
      <UnitModal
        open={unitOpen}
        close={closeUnit}
        editing={editingUnit}
        form={unitForm}
        setForm={setUnitForm}
        companies={data.companies}
        parents={parents}
        ready={unitReady}
        mutation={unitMutation}
      />
      {remove.error && (
        <p className="form-error">
          Não foi possível excluir: remova primeiro colaboradores ou unidades
          vinculadas.
        </p>
      )}
    </div>
  );
}

function Hierarchy({
  data,
  editCompany,
  editUnit,
  addUnit,
  remove,
}: {
  data: any;
  editCompany: (x: Company) => void;
  editUnit: (x: OrganizationUnit) => void;
  addUnit: (
    x?: OrganizationUnit,
    d?: Partial<CreateOrganizationUnitInput>,
  ) => void;
  remove: (k: "company" | "unit", id: string, n: string) => void;
}) {
  return (
    <section className="panel hierarchy-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Visão estrutural</span>
          <h2>Árvore da organização</h2>
        </div>
        <span className="muted-copy">
          {data.units.length} unidades cadastradas
        </span>
      </div>
      <div className="org-tree">
        {data.companies.map((company: Company) => (
          <div className="tree-company" key={company.id}>
            <div className="tree-node company">
              <Building2 />
              <span>
                <strong>{company.tradeName}</strong>
                <small>{formatCnpj(company.document)}</small>
              </span>
              <div className="tree-actions">
                <button
                  className="icon-button"
                  aria-label={`Adicionar estabelecimento em ${company.tradeName}`}
                  onClick={() =>
                    addUnit(undefined, {
                      companyId: company.id,
                      type: "establishment",
                      parentId: null,
                    })
                  }
                >
                  <Plus />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Editar ${company.tradeName}`}
                  onClick={() => editCompany(company)}
                >
                  <Pencil />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir ${company.tradeName}`}
                  onClick={() =>
                    remove("company", company.id, company.tradeName)
                  }
                >
                  <Trash2 />
                </button>
              </div>
            </div>
            <div className="tree-children">
              {data.units
                .filter(
                  (u: OrganizationUnit) =>
                    u.companyId === company.id && u.type === "establishment",
                )
                .map((est: OrganizationUnit) => (
                  <UnitBranch
                    key={est.id}
                    unit={est}
                    units={data.units}
                    edit={editUnit}
                    add={addUnit}
                    remove={remove}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function UnitBranch({
  unit,
  units,
  edit,
  add,
  remove,
}: {
  unit: OrganizationUnit;
  units: OrganizationUnit[];
  edit: (x: OrganizationUnit) => void;
  add: (x?: OrganizationUnit, d?: Partial<CreateOrganizationUnitInput>) => void;
  remove: (k: "company" | "unit", id: string, n: string) => void;
}) {
  const Icon =
    unit.type === "establishment"
      ? MapPin
      : unit.type === "department"
        ? GitBranch
        : CircleDollarSign;
  const childType =
    unit.type === "establishment"
      ? "department"
      : unit.type === "department"
        ? "cost_center"
        : undefined;
  return (
    <div className="tree-branch">
      <div
        className={`tree-node ${unit.type === "cost_center" ? "subtle" : ""}`}
      >
        <Icon />
        <span>
          <strong>{unit.name}</strong>
          <small>
            {unit.code}
            {unit.managerName ? ` · ${unit.managerName}` : ""} ·{" "}
            {unit.employeesCount} pessoas
          </small>
        </span>
        <div className="tree-actions">
          {childType && (
            <button
              className="icon-button"
              aria-label={`Adicionar em ${unit.name}`}
              onClick={() =>
                add(undefined, {
                  companyId: unit.companyId,
                  parentId: unit.id,
                  type: childType,
                })
              }
            >
              <Plus />
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Editar ${unit.name}`}
            onClick={() => edit(unit)}
          >
            <Pencil />
          </button>
          <button
            className="icon-button danger"
            aria-label={`Excluir ${unit.name}`}
            onClick={() => remove("unit", unit.id, unit.name)}
          >
            <Trash2 />
          </button>
        </div>
      </div>
      {childType && (
        <div className="tree-children compact">
          {units
            .filter((x) => x.parentId === unit.id)
            .map((child) => (
              <UnitBranch
                key={child.id}
                unit={child}
                units={units}
                edit={edit}
                add={add}
                remove={remove}
              />
            ))}
        </div>
      )}
    </div>
  );
}
function UnitModal({
  open,
  close,
  editing,
  form,
  setForm,
  companies,
  parents,
  ready,
  mutation,
}: {
  open: boolean;
  close: () => void;
  editing?: OrganizationUnit;
  form: CreateOrganizationUnitInput;
  setForm: (x: CreateOrganizationUnitInput) => void;
  companies: Company[];
  parents: OrganizationUnit[];
  ready: boolean;
  mutation: any;
}) {
  const establishment = form.type === "establishment";
  return (
    <Modal
      open={open}
      onClose={close}
      title={
        editing
          ? `Editar ${unitLabels[form.type]}`
          : `Cadastrar ${unitLabels[form.type]}`
      }
      description="Os campos exibidos variam conforme o nível da estrutura."
    >
      <form
        className="form-grid"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          Tipo
          <select
            disabled={Boolean(editing)}
            value={form.type}
            onChange={(e) =>
              setForm({
                ...emptyUnit,
                type: e.target.value as CreateOrganizationUnitInput["type"],
                companyId: form.companyId,
              })
            }
          >
            <option value="establishment">Estabelecimento</option>
            <option value="department">Departamento</option>
            <option value="cost_center">Centro de custo</option>
          </select>
        </label>
        <label>
          Empresa
          <select
            required
            value={form.companyId}
            onChange={(e) =>
              setForm({ ...form, companyId: e.target.value, parentId: null })
            }
          >
            <option value="">Selecione</option>
            {companies.map((x) => (
              <option key={x.id} value={x.id}>
                {x.tradeName}
              </option>
            ))}
          </select>
        </label>
        {!establishment && (
          <label className="span-2">
            Vinculado a
            <select
              required
              value={form.parentId ?? ""}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">
                Selecione{" "}
                {form.type === "department"
                  ? "o estabelecimento"
                  : "o departamento"}
              </option>
              {parents.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.code}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Código
          <input
            required
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          Nome
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Responsável/Gestor
          <input
            value={form.managerName ?? ""}
            onChange={(e) => setForm({ ...form, managerName: e.target.value })}
          />
        </label>
        <label>
          Telefone
          <input
            value={form.phone ?? ""}
            onChange={(e) =>
              setForm({ ...form, phone: formatPhone(e.target.value) })
            }
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        {establishment && (
          <>
            <label>
              CNPJ da unidade
              <input
                value={form.document ?? ""}
                onChange={(e) =>
                  setForm({ ...form, document: formatCnpj(e.target.value) })
                }
              />
            </label>
            <label>
              CEP
              <input
                value={form.postalCode ?? ""}
                onChange={(e) =>
                  setForm({ ...form, postalCode: cep(e.target.value) })
                }
              />
            </label>
            <label className="span-2">
              Rua
              <input
                value={form.street ?? ""}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </label>
            <label>
              Número
              <input
                value={form.streetNumber ?? ""}
                onChange={(e) =>
                  setForm({ ...form, streetNumber: e.target.value })
                }
              />
            </label>
            <label>
              Complemento
              <input
                value={form.complement ?? ""}
                onChange={(e) =>
                  setForm({ ...form, complement: e.target.value })
                }
              />
            </label>
            <label>
              Bairro
              <input
                value={form.district ?? ""}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </label>
            <label>
              Cidade
              <input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
            <label>
              UF
              <input
                maxLength={2}
                value={form.state ?? ""}
                onChange={(e) =>
                  setForm({ ...form, state: e.target.value.toUpperCase() })
                }
              />
            </label>
          </>
        )}
        {editing && (
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "active" | "inactive",
                })
              }
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>
        )}
        {mutation.error && (
          <p className="form-error span-2">
            Não foi possível salvar. Confira o código e os vínculos
            selecionados.
          </p>
        )}
        <footer className="form-actions span-2">
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={
              !ready ||
              mutation.isPending ||
              (Boolean(form.phone) && !isValidPhone(form.phone!)) ||
              (Boolean(form.document) && !isValidCnpj(form.document!))
            }
          >
            Salvar {unitLabels[form.type].toLowerCase()}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
