import type { CreateEmployeeInput, Employee, EmployeeListItem } from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";
import type { EmployeesRepository } from "./employees.repository.js";

type EmployeeRow = { id:string; registration:string; full_name:string; social_name:string|null; cpf:string; email:string|null; phone:string|null; birth_date:string|null; status:Employee["status"]; company_id:string };
type LinkRow = { employee_id:string; establishment_id:string|null; department_id:string|null; cost_center_id:string|null; position:string; contract_type:string; salary:number|string; work_schedule:string|null; manager_employee_id:string|null; hire_date:string };

export class SupabaseEmployeesRepository implements EmployeesRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async load(id?: string): Promise<Employee[]> {
    const organizationId = await getCurrentOrganizationId(this.client);
    let employeeQuery = this.client.from("employees").select("id,registration,full_name,social_name,cpf,email,phone,birth_date,status,company_id").eq("organization_id", organizationId).order("full_name");
    if (id) employeeQuery = employeeQuery.eq("id", id);
    const [employeesResult, linksResult, companiesResult, unitsResult] = await Promise.all([
      employeeQuery,
      this.client.from("employment_links").select("employee_id,establishment_id,department_id,cost_center_id,position,contract_type,salary,work_schedule,manager_employee_id,hire_date").eq("organization_id", organizationId).eq("active", true),
      this.client.from("companies").select("id,trade_name").eq("organization_id", organizationId),
      this.client.from("organization_units").select("id,name").eq("organization_id", organizationId),
    ]);
    for (const result of [employeesResult, linksResult, companiesResult, unitsResult]) if (result.error) throw new Error(`employees_load_failed:${result.error.message}`);
    const rows = (employeesResult.data ?? []) as EmployeeRow[];
    const links = (linksResult.data ?? []) as LinkRow[];
    const companyNames = new Map((companiesResult.data ?? []).map(row => [row.id, row.trade_name]));
    const unitNames = new Map((unitsResult.data ?? []).map(row => [row.id, row.name]));
    const employeeNames = new Map(rows.map(row => [row.id, row.full_name]));
    return rows.flatMap(row => {
      const link = links.find(value => value.employee_id === row.id);
      if (!link?.establishment_id || !link.department_id || !link.cost_center_id) return [];
      return [{
        id: row.id, registration: row.registration, fullName: row.full_name, ...(row.social_name ? { socialName: row.social_name } : {}),
        cpf: row.cpf, email: row.email ?? "sem-email@fluxrh.local", phone: row.phone ?? "Não informado", birthDate: row.birth_date ?? "1900-01-01", hireDate: link.hire_date, status: row.status,
        companyId: row.company_id, companyName: companyNames.get(row.company_id) ?? "Empresa",
        establishmentId: link.establishment_id, establishmentName: unitNames.get(link.establishment_id) ?? "Estabelecimento",
        departmentId: link.department_id, departmentName: unitNames.get(link.department_id) ?? "Departamento",
        costCenterId: link.cost_center_id, costCenterName: unitNames.get(link.cost_center_id) ?? "Centro de custo",
        position: link.position, contractType: link.contract_type, salary: Number(link.salary), workSchedule: link.work_schedule ?? "Não informada",
        managerName: link.manager_employee_id ? employeeNames.get(link.manager_employee_id) ?? "Não informado" : "Não informado",
        avatarColor: "#155eef", documents: [], dependents: [], timeline: [],
      } satisfies Employee];
    });
  }

  async list(): Promise<EmployeeListItem[]> {
    return (await this.load()).map(({ documents: _documents, dependents: _dependents, timeline: _timeline, ...employee }) => employee);
  }
  async findById(id: string): Promise<Employee | undefined> { return (await this.load(id))[0]; }
  async create(input: CreateEmployeeInput): Promise<Employee> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client.rpc("create_employee", {
      target_organization_id: organizationId, target_company_id: input.companyId,
      target_establishment_id: input.establishmentId, target_department_id: input.departmentId, target_cost_center_id: input.costCenterId,
      employee_full_name: input.fullName, employee_cpf: input.cpf, employee_email: input.email, employee_phone: input.phone,
      employee_birth_date: input.birthDate, employment_hire_date: input.hireDate, employment_position: input.position,
      employment_salary: input.salary, employment_work_schedule: input.workSchedule, manager_name: input.managerName,
    });
    if (error) throw new Error(`employee_create_failed:${error.message}`);
    const employee = await this.findById(data as string);
    if (!employee) throw new Error("employee_create_failed:record_not_found");
    return employee;
  }
}
