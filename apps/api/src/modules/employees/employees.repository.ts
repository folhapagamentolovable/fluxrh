import type {
  CreateEmployeeInput,
  Employee,
  EmployeeListItem,
  UpdateEmployeeInput,
} from "@fluxrh/contracts";
import { createPilotEmployees } from "../../pilot/pilot-scenario.js";

export interface EmployeesRepository {
  list(filter?: EmployeeListFilter): Promise<EmployeeListItem[]>;
  findById(id: string): Promise<Employee | undefined>;
  create(input: CreateEmployeeInput): Promise<Employee>;
  update(id: string, input: UpdateEmployeeInput): Promise<Employee | undefined>;
}

export type EmployeeListFilter = {
  query?: string;
  status?: Employee["status"];
  limit?: number;
  offset?: number;
};

export function filterEmployeeList(
  values: Employee[],
  filter: EmployeeListFilter = {},
): EmployeeListItem[] {
  const query = filter.query?.trim().toLocaleLowerCase("pt-BR");
  return values
    .filter(
      (employee) =>
        (!filter.status || employee.status === filter.status) &&
        (!query ||
          `${employee.fullName} ${employee.position} ${employee.registration}`
            .toLocaleLowerCase("pt-BR")
            .includes(query)),
    )
    .slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50))
    .map(
      ({
        documents: _documents,
        dependents: _dependents,
        timeline: _timeline,
        ...employee
      }) => employee,
    );
}

const employees: Employee[] = [
  {
    id: "emp_marina",
    registration: "000148",
    fullName: "Marina Souza",
    cpf: "***.482.***-09",
    email: "marina.souza@fluxrh.local",
    phone: "(11) 98742-1020",
    birthDate: "1993-04-18",
    hireDate: "2026-08-19",
    status: "onboarding",
    companyId: "company_flux",
    companyName: "Grupo Flux",
    establishmentId: "est_sp",
    establishmentName: "Matriz São Paulo",
    departmentId: "dept_people",
    departmentName: "Pessoas e Cultura",
    costCenterId: "cc_people",
    costCenterName: "RH Corporativo",
    position: "Analista de RH",
    contractType: "CLT",
    salary: 4850,
    workSchedule: "Seg–Sex · 08:00–17:48",
    managerName: "Marina Alves",
    avatarColor: "#6c5ce7",
    documents: [
      { id: "doc_1", name: "CPF", status: "valid" },
      { id: "doc_2", name: "Comprovante de residência", status: "pending" },
      { id: "doc_3", name: "Contrato de trabalho", status: "valid" },
    ],
    dependents: [],
    timeline: [
      {
        id: "tl_1",
        title: "Admissão iniciada",
        description: "Workflow iniciado automaticamente.",
        occurredAt: "2026-08-19T12:00:00.000Z",
        category: "Admissão",
      },
      {
        id: "tl_2",
        title: "Contrato aceito",
        description: "Aceite eletrônico registrado.",
        occurredAt: "2026-08-22T15:30:00.000Z",
        category: "Documentos",
      },
    ],
  },
  {
    id: "emp_carlos",
    registration: "000104",
    fullName: "Carlos Mendes",
    cpf: "***.193.***-42",
    email: "carlos.mendes@fluxrh.local",
    phone: "(11) 97735-4602",
    birthDate: "1988-11-02",
    hireDate: "2023-02-06",
    status: "active",
    companyId: "company_flux",
    companyName: "Grupo Flux",
    establishmentId: "est_sp",
    establishmentName: "Matriz São Paulo",
    departmentId: "dept_ops",
    departmentName: "Operações",
    costCenterId: "cc_ops",
    costCenterName: "Operação Matriz",
    position: "Supervisor Operacional",
    contractType: "CLT",
    salary: 6200,
    workSchedule: "12×36 · 07:00–19:00",
    managerName: "Daniel Costa",
    avatarColor: "#2473e8",
    documents: [
      { id: "doc_4", name: "CNH", status: "valid", expiresAt: "2028-04-20" },
      {
        id: "doc_5",
        name: "ASO periódico",
        status: "valid",
        expiresAt: "2027-02-15",
      },
    ],
    dependents: [
      {
        id: "dep_1",
        name: "Luiza Mendes",
        relationship: "Filha",
        birthDate: "2018-07-12",
      },
    ],
    timeline: [
      {
        id: "tl_3",
        title: "Alteração salarial",
        description: "Reajuste anual aplicado.",
        occurredAt: "2026-05-01T12:00:00.000Z",
        category: "Remuneração",
      },
    ],
  },
  {
    id: "emp_beatriz",
    registration: "000087",
    fullName: "Beatriz Lima",
    cpf: "***.702.***-18",
    email: "beatriz.lima@fluxrh.local",
    phone: "(13) 98810-5541",
    birthDate: "1990-06-27",
    hireDate: "2022-01-12",
    status: "active",
    companyId: "company_flux",
    companyName: "Grupo Flux",
    establishmentId: "est_santos",
    establishmentName: "Unidade Santos",
    departmentId: "dept_ops",
    departmentName: "Operações",
    costCenterId: "cc_ops",
    costCenterName: "Operação Matriz",
    position: "Assistente Administrativa",
    contractType: "CLT",
    salary: 3250,
    workSchedule: "Seg–Sex · 08:00–17:48",
    managerName: "Rafael Alves",
    avatarColor: "#e76f51",
    documents: [
      { id: "doc_6", name: "RG", status: "valid" },
      {
        id: "doc_7",
        name: "ASO periódico",
        status: "valid",
        expiresAt: "2027-01-08",
      },
    ],
    dependents: [],
    timeline: [
      {
        id: "tl_4",
        title: "Férias sugeridas",
        description: "Sistema identificou proximidade do limite concessivo.",
        occurredAt: "2026-08-24T12:00:00.000Z",
        category: "Férias",
      },
    ],
  },
  {
    id: "emp_camila",
    registration: "000147",
    fullName: "Camila Rocha",
    cpf: "***.315.***-55",
    email: "camila.rocha@nortefacilities.local",
    phone: "(19) 99118-7734",
    birthDate: "1997-09-15",
    hireDate: "2026-08-11",
    status: "onboarding",
    companyId: "company_norte",
    companyName: "Norte Facilities",
    establishmentId: "est_campinas",
    establishmentName: "Operação Campinas",
    departmentId: "dept_field",
    departmentName: "Operação de Campo",
    costCenterId: "cc_field",
    costCenterName: "Facilities Campinas",
    position: "Agente de Facilities",
    contractType: "CLT",
    salary: 2480,
    workSchedule: "6×1 · 13:40–22:00",
    managerName: "Luciana Prado",
    avatarColor: "#17a673",
    documents: [
      { id: "doc_8", name: "Contrato de trabalho", status: "valid" },
      { id: "doc_9", name: "Certificado de treinamento", status: "pending" },
    ],
    dependents: [],
    timeline: [
      {
        id: "tl_5",
        title: "Onboarding iniciado",
        description: "Treinamentos e tarefas atribuídos.",
        occurredAt: "2026-08-11T12:00:00.000Z",
        category: "Onboarding",
      },
    ],
  },
  {
    id: "emp_rafael",
    registration: "000063",
    fullName: "Rafael Alves",
    cpf: "***.908.***-31",
    email: "rafael.alves@fluxrh.local",
    phone: "(13) 99710-1140",
    birthDate: "1985-01-31",
    hireDate: "2020-03-02",
    status: "vacation",
    companyId: "company_flux",
    companyName: "Grupo Flux",
    establishmentId: "est_santos",
    establishmentName: "Unidade Santos",
    departmentId: "dept_ops",
    departmentName: "Operações",
    costCenterId: "cc_ops",
    costCenterName: "Operação Matriz",
    position: "Gerente de Unidade",
    contractType: "CLT",
    salary: 9400,
    workSchedule: "Seg–Sex · 08:00–17:48",
    managerName: "Daniel Costa",
    avatarColor: "#d28b16",
    documents: [
      {
        id: "doc_10",
        name: "ASO periódico",
        status: "valid",
        expiresAt: "2027-03-21",
      },
    ],
    dependents: [],
    timeline: [
      {
        id: "tl_6",
        title: "Férias iniciadas",
        description: "Período de 15 dias iniciado.",
        occurredAt: "2026-08-18T12:00:00.000Z",
        category: "Férias",
      },
    ],
  },
  ...createPilotEmployees(),
];

export class InMemoryEmployeesRepository implements EmployeesRepository {
  async list(filter: EmployeeListFilter = {}): Promise<EmployeeListItem[]> {
    return structuredClone(filterEmployeeList(employees, filter));
  }
  async findById(id: string): Promise<Employee | undefined> {
    const value = employees.find((employee) => employee.id === id);
    return value ? structuredClone(value) : undefined;
  }
  async create(input: CreateEmployeeInput): Promise<Employee> {
    const employee: Employee = {
      id: `emp_${crypto.randomUUID()}`,
      registration: String(149 + employees.length).padStart(6, "0"),
      ...input,
      status: "onboarding",
      companyName:
        input.companyId === "company_norte" ? "Norte Facilities" : "Grupo Flux",
      establishmentName:
        input.establishmentId === "est_campinas"
          ? "Operação Campinas"
          : input.establishmentId === "est_santos"
            ? "Unidade Santos"
            : "Matriz São Paulo",
      departmentName:
        input.departmentId === "dept_people"
          ? "Pessoas e Cultura"
          : input.departmentId === "dept_field"
            ? "Operação de Campo"
            : "Operações",
      costCenterName:
        input.costCenterId === "cc_people"
          ? "RH Corporativo"
          : input.costCenterId === "cc_field"
            ? "Facilities Campinas"
            : "Operação Matriz",
      contractType: "CLT",
      avatarColor: "#155eef",
      documents: [],
      dependents: [],
      timeline: [
        {
          id: crypto.randomUUID(),
          title: "Cadastro criado",
          description: "Prontuário criado e onboarding preparado.",
          occurredAt: new Date().toISOString(),
          category: "Admissão",
        },
      ],
    };
    employees.unshift(employee);
    return structuredClone(employee);
  }
  async update(id: string, input: UpdateEmployeeInput) {
    const employee = employees.find((value) => value.id === id);
    if (!employee) return;
    Object.assign(employee, input);
    return structuredClone(employee);
  }
}
