import type {
  Company,
  CreateCompanyInput,
  CreateOrganizationUnitInput,
  OrganizationSnapshot,
  OrganizationUnit,
  UpdateCompanyInput,
  UpdateOrganizationUnitInput,
} from "@fluxrh/contracts";
import { pilotScenario } from "../../pilot/pilot-scenario.js";

export interface OrganizationsRepository {
  getSnapshot(): Promise<OrganizationSnapshot>;
  createCompany(input: CreateCompanyInput): Promise<Company>;
  updateCompany(
    id: string,
    input: UpdateCompanyInput,
  ): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;
  createUnit(input: CreateOrganizationUnitInput): Promise<OrganizationUnit>;
  updateUnit(
    id: string,
    input: UpdateOrganizationUnitInput,
  ): Promise<OrganizationUnit | undefined>;
  deleteUnit(id: string): Promise<boolean>;
}

const companies: Company[] = [
  {
    id: pilotScenario.company.id,
    legalName: pilotScenario.company.legalName,
    tradeName: pilotScenario.company.tradeName,
    document: "12.345.678/0001-90",
    status: "active",
    city: "São Paulo",
    state: "SP",
    responsibleName: "Marina Alves",
    responsibleRole: "Diretora de RH",
    phone: "11999990000",
    street: "Avenida Paulista",
    streetNumber: "1000",
    complement: "10º andar",
    district: "Bela Vista",
    postalCode: "01310100",
    employeesCount: pilotScenario.company.employeeTarget,
    establishmentsCount: pilotScenario.establishments.length,
  },
  {
    id: "company_norte",
    legalName: "Norte Facilities e Serviços Ltda.",
    tradeName: "Norte Facilities",
    document: "45.821.930/0001-18",
    status: "active",
    city: "Campinas",
    state: "SP",
    responsibleName: "Luciana Prado",
    responsibleRole: "Gerente administrativa",
    phone: "19999990000",
    street: "Rua das Flores",
    streetNumber: "250",
    complement: "",
    district: "Centro",
    postalCode: "13010000",
    employeesCount: 52,
    establishmentsCount: 1,
  },
];

const units: OrganizationUnit[] = [
  {
    id: "est_sp",
    companyId: "company_flux",
    parentId: null,
    type: "establishment",
    code: "EST-001",
    name: "Matriz São Paulo",
    city: "São Paulo",
    state: "SP",
    managerName: "Marina Alves",
    employeesCount: pilotScenario.establishments.find(
      (value) => value.id === "est_sp",
    )!.employeeTarget,
    status: "active",
  },
  {
    id: "est_santos",
    companyId: "company_flux",
    parentId: null,
    type: "establishment",
    code: "EST-002",
    name: "Unidade Santos",
    city: "Santos",
    state: "SP",
    managerName: "Rafael Alves",
    employeesCount: pilotScenario.establishments.find(
      (value) => value.id === "est_santos",
    )!.employeeTarget,
    status: "active",
  },
  {
    id: "est_campinas",
    companyId: "company_norte",
    parentId: null,
    type: "establishment",
    code: "EST-003",
    name: "Operação Campinas",
    city: "Campinas",
    state: "SP",
    managerName: "Luciana Prado",
    employeesCount: 52,
    status: "active",
  },
  {
    id: "dept_people",
    companyId: "company_flux",
    parentId: "est_sp",
    type: "department",
    code: "DEP-001",
    name: "Pessoas e Cultura",
    managerName: "Marina Alves",
    employeesCount: 12,
    status: "active",
  },
  {
    id: "dept_ops",
    companyId: "company_flux",
    parentId: "est_sp",
    type: "department",
    code: "DEP-002",
    name: "Operações",
    managerName: "Daniel Costa",
    employeesCount: 39,
    status: "active",
  },
  {
    id: "dept_fin",
    companyId: "company_flux",
    parentId: "est_sp",
    type: "department",
    code: "DEP-003",
    name: "Financeiro",
    managerName: "Fernanda Lima",
    employeesCount: 17,
    status: "active",
  },
  {
    id: "dept_field",
    companyId: "company_norte",
    parentId: "est_campinas",
    type: "department",
    code: "DEP-004",
    name: "Operação de Campo",
    managerName: "Luciana Prado",
    employeesCount: 44,
    status: "active",
  },
  {
    id: "cc_people",
    companyId: "company_flux",
    parentId: "dept_people",
    type: "cost_center",
    code: "CC-110",
    name: "RH Corporativo",
    managerName: "Marina Alves",
    employeesCount: 8,
    status: "active",
  },
  {
    id: "cc_ops",
    companyId: "company_flux",
    parentId: "dept_ops",
    type: "cost_center",
    code: "CC-210",
    name: "Operação Matriz",
    managerName: "Daniel Costa",
    employeesCount: 31,
    status: "active",
  },
  {
    id: "cc_field",
    companyId: "company_norte",
    parentId: "dept_field",
    type: "cost_center",
    code: "CC-310",
    name: "Facilities Campinas",
    managerName: "Luciana Prado",
    employeesCount: 44,
    status: "active",
  },
];

export class InMemoryOrganizationsRepository implements OrganizationsRepository {
  async getSnapshot(): Promise<OrganizationSnapshot> {
    return {
      summary: {
        companies: companies.length,
        establishments: units.filter((x) => x.type === "establishment").length,
        departments: units.filter((x) => x.type === "department").length,
        costCenters: units.filter((x) => x.type === "cost_center").length,
      },
      companies: structuredClone(companies),
      units: structuredClone(units),
    };
  }

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const company: Company = {
      id: `company_${crypto.randomUUID()}`,
      ...input,
      state: input.state.toUpperCase(),
      status: "active",
      employeesCount: 0,
      establishmentsCount: 0,
    };
    companies.push(company);
    return structuredClone(company);
  }
  async updateCompany(id: string, input: UpdateCompanyInput) {
    const index = companies.findIndex((x) => x.id === id);
    if (index < 0) return undefined;
    companies[index] = {
      ...companies[index],
      ...input,
      state: input.state.toUpperCase(),
    };
    return structuredClone(companies[index]);
  }
  async deleteCompany(id: string) {
    if (units.some((x) => x.companyId === id))
      throw new Error("company_has_units");
    const index = companies.findIndex((x) => x.id === id);
    if (index < 0) return false;
    companies.splice(index, 1);
    return true;
  }
  async createUnit(input: CreateOrganizationUnitInput) {
    const unit: OrganizationUnit = {
      id: `unit_${crypto.randomUUID()}`,
      ...input,
      managerName: input.managerName || undefined,
      employeesCount: 0,
    };
    units.push(unit);
    return structuredClone(unit);
  }
  async updateUnit(id: string, input: UpdateOrganizationUnitInput) {
    const index = units.findIndex((x) => x.id === id);
    if (index < 0) return undefined;
    units[index] = {
      ...units[index],
      ...input,
      managerName: input.managerName || undefined,
      employeesCount: units[index].employeesCount,
    };
    return structuredClone(units[index]);
  }
  async deleteUnit(id: string) {
    if (units.some((x) => x.parentId === id))
      throw new Error("unit_has_children");
    const index = units.findIndex((x) => x.id === id);
    if (index < 0) return false;
    if (units[index].employeesCount > 0) throw new Error("unit_has_employees");
    units.splice(index, 1);
    return true;
  }
}
