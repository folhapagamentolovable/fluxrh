import type { Company, CreateCompanyInput, OrganizationSnapshot, OrganizationUnit } from "@fluxrh/contracts";

export interface OrganizationsRepository {
  getSnapshot(): Promise<OrganizationSnapshot>;
  createCompany(input: CreateCompanyInput): Promise<Company>;
}

const companies: Company[] = [
  { id: "company_flux", legalName: "Flux Serviços Empresariais Ltda.", tradeName: "Grupo Flux", document: "12.345.678/0001-90", status: "active", city: "São Paulo", state: "SP", employeesCount: 96, establishmentsCount: 2 },
  { id: "company_norte", legalName: "Norte Facilities e Serviços Ltda.", tradeName: "Norte Facilities", document: "45.821.930/0001-18", status: "active", city: "Campinas", state: "SP", employeesCount: 52, establishmentsCount: 1 },
];

const units: OrganizationUnit[] = [
  { id: "est_sp", companyId: "company_flux", parentId: null, type: "establishment", code: "EST-001", name: "Matriz São Paulo", city: "São Paulo", state: "SP", managerName: "Marina Alves", employeesCount: 68, status: "active" },
  { id: "est_santos", companyId: "company_flux", parentId: null, type: "establishment", code: "EST-002", name: "Unidade Santos", city: "Santos", state: "SP", managerName: "Rafael Alves", employeesCount: 28, status: "active" },
  { id: "est_campinas", companyId: "company_norte", parentId: null, type: "establishment", code: "EST-003", name: "Operação Campinas", city: "Campinas", state: "SP", managerName: "Luciana Prado", employeesCount: 52, status: "active" },
  { id: "dept_people", companyId: "company_flux", parentId: "est_sp", type: "department", code: "DEP-001", name: "Pessoas e Cultura", managerName: "Marina Alves", employeesCount: 12, status: "active" },
  { id: "dept_ops", companyId: "company_flux", parentId: "est_sp", type: "department", code: "DEP-002", name: "Operações", managerName: "Daniel Costa", employeesCount: 39, status: "active" },
  { id: "dept_fin", companyId: "company_flux", parentId: "est_sp", type: "department", code: "DEP-003", name: "Financeiro", managerName: "Fernanda Lima", employeesCount: 17, status: "active" },
  { id: "dept_field", companyId: "company_norte", parentId: "est_campinas", type: "department", code: "DEP-004", name: "Operação de Campo", managerName: "Luciana Prado", employeesCount: 44, status: "active" },
  { id: "cc_people", companyId: "company_flux", parentId: "dept_people", type: "cost_center", code: "CC-110", name: "RH Corporativo", managerName: "Marina Alves", employeesCount: 8, status: "active" },
  { id: "cc_ops", companyId: "company_flux", parentId: "dept_ops", type: "cost_center", code: "CC-210", name: "Operação Matriz", managerName: "Daniel Costa", employeesCount: 31, status: "active" },
  { id: "cc_field", companyId: "company_norte", parentId: "dept_field", type: "cost_center", code: "CC-310", name: "Facilities Campinas", managerName: "Luciana Prado", employeesCount: 44, status: "active" },
];

export class InMemoryOrganizationsRepository implements OrganizationsRepository {
  async getSnapshot(): Promise<OrganizationSnapshot> {
    return { summary: { companies: companies.length, establishments: units.filter(x => x.type === "establishment").length, departments: units.filter(x => x.type === "department").length, costCenters: units.filter(x => x.type === "cost_center").length }, companies: structuredClone(companies), units: structuredClone(units) };
  }

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const company: Company = { id: `company_${crypto.randomUUID()}`, ...input, state: input.state.toUpperCase(), status: "active", employeesCount: 0, establishmentsCount: 0 };
    companies.push(company);
    return structuredClone(company);
  }
}
