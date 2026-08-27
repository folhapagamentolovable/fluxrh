import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, CircleDollarSign, GitBranch, MapPin, MoreHorizontal, Plus, Search, UsersRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { createCompany, getOrganizations } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCnpj, isValidCnpj, normalizeDigits } from "@/lib/cnpj";

const initialForm = { legalName: "", tradeName: "", document: "", city: "", state: "SP" };

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });
  const [view, setView] = useState<"companies" | "hierarchy">("companies");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const mutation = useMutation({ mutationFn: createCompany, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organizations"] }); setModalOpen(false); setForm(initialForm); } });
  const companies = useMemo(() => data?.companies.filter(company => `${company.tradeName} ${company.legalName} ${company.document}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (isValidCnpj(form.document)) mutation.mutate({ ...form, document: normalizeDigits(form.document) }); };

  if (isLoading) return <div className="page"><div className="page-skeleton" /></div>;
  if (error || !data) return <div className="page"><div className="error-state"><Building2 /><h2>Estrutura indisponível</h2></div></div>;
  const summary = [
    ["Empresas", data.summary.companies, Building2, "blue"], ["Estabelecimentos", data.summary.establishments, MapPin, "green"], ["Departamentos", data.summary.departments, GitBranch, "purple"], ["Centros de custo", data.summary.costCenters, CircleDollarSign, "amber"]
  ] as const;

  return <div className="page">
    <section className="simple-heading"><div><span className="eyebrow"><Building2 size={15} /> Estrutura organizacional</span><h1>Empresas e unidades</h1><p>Organize os vínculos que contextualizam colaboradores, regras, custos e permissões.</p></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={17} /> Nova empresa</button></section>
    <section className="org-summary">{summary.map(([label, value, Icon, tone]) => <div className="org-summary-card" key={label}><span className={`metric-icon ${tone}`}><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div></div>)}</section>
    <div className="segmented-tabs"><button className={view === "companies" ? "active" : ""} onClick={() => setView("companies")}>Empresas</button><button className={view === "hierarchy" ? "active" : ""} onClick={() => setView("hierarchy")}>Hierarquia</button></div>
    {view === "companies" ? <section className="panel data-panel">
      <div className="table-toolbar"><div className="field"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por empresa ou CNPJ" /></div><span>{companies.length} empresas</span></div>
      <div className="company-grid">{companies.map(company => <article className="company-card" key={company.id}>
        <div className="company-card-top"><span className="company-logo">{company.tradeName.split(" ").map(word => word[0]).join("").slice(0,2)}</span><button className="icon-button"><MoreHorizontal size={18} /></button></div>
        <StatusBadge tone="green">Ativa</StatusBadge><h2>{company.tradeName}</h2><p>{company.legalName}</p><dl><div><dt>CNPJ</dt><dd>{formatCnpj(company.document)}</dd></div><div><dt>Sede</dt><dd>{company.city}/{company.state}</dd></div></dl>
        <footer><span><UsersRound size={15} /> {company.employeesCount} pessoas</span><span><MapPin size={15} /> {company.establishmentsCount} unidades</span></footer>
      </article>)}</div>
    </section> : <section className="panel hierarchy-panel">
      <div className="panel-heading"><div><span className="section-label">Visão estrutural</span><h2>Árvore da organização</h2></div><span className="muted-copy">{data.units.length} unidades cadastradas</span></div>
      <div className="org-tree">{data.companies.map(company => <div className="tree-company" key={company.id}>
          <div className="tree-node company"><Building2 /><span><strong>{company.tradeName}</strong><small>{formatCnpj(company.document)}</small></span><StatusBadge tone="green">Ativa</StatusBadge></div>
        <div className="tree-children">{data.units.filter(unit => unit.companyId === company.id && unit.type === "establishment").map(establishment => <div className="tree-branch" key={establishment.id}>
          <div className="tree-node"><MapPin /><span><strong>{establishment.name}</strong><small>{establishment.city}/{establishment.state} · {establishment.employeesCount} pessoas</small></span></div>
          <div className="tree-children compact">{data.units.filter(unit => unit.parentId === establishment.id).map(department => <div key={department.id}>
            <div className="tree-node"><GitBranch /><span><strong>{department.name}</strong><small>{department.managerName} · {department.employeesCount} pessoas</small></span></div>
            <div className="tree-children compact">{data.units.filter(unit => unit.parentId === department.id).map(center => <div className="tree-node subtle" key={center.id}><CircleDollarSign /><span><strong>{center.name}</strong><small>{center.code}</small></span></div>)}</div>
          </div>)}</div>
        </div>)}</div>
      </div>)}</div>
    </section>}
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar empresa" description="Inclua a pessoa jurídica principal. Unidades e departamentos poderão ser adicionados em seguida.">
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">Razão social<input required value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} /></label>
        <label>Nome fantasia<input required value={form.tradeName} onChange={e => setForm({ ...form, tradeName: e.target.value })} /></label>
        <label>CNPJ<input required inputMode="numeric" maxLength={18} value={form.document} onChange={e => setForm({ ...form, document: formatCnpj(e.target.value) })} placeholder="00.000.000/0000-00" /></label>
        <label>Cidade<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
        <label>UF<input required maxLength={2} value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} /></label>
        {mutation.error && <p className="form-error span-2">Não foi possível cadastrar. Revise os dados.</p>}
        <footer className="form-actions span-2"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary-button" disabled={mutation.isPending || !isValidCnpj(form.document)}>{mutation.isPending ? "Salvando..." : <>Cadastrar empresa <ChevronRight size={16} /></>}</button></footer>
      </form>
    </Modal>
  </div>;
}

