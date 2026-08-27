import type { Company, CreateCompanyInput, OrganizationSnapshot, OrganizationUnit } from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";
import type { OrganizationsRepository } from "./organizations.repository.js";

export class SupabaseOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSnapshot(): Promise<OrganizationSnapshot> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const [companiesResult, unitsResult, employeesResult, linksResult] = await Promise.all([
      this.client.from("companies").select("id,legal_name,trade_name,document,status,city,state").eq("organization_id", organizationId).order("trade_name"),
      this.client.from("organization_units").select("id,company_id,parent_id,type,code,name,status").eq("organization_id", organizationId).order("code"),
      this.client.from("employees").select("id,company_id").eq("organization_id", organizationId).neq("status", "terminated"),
      this.client.from("employment_links").select("employee_id,establishment_id,department_id,cost_center_id").eq("organization_id", organizationId).eq("active", true),
    ]);
    for (const result of [companiesResult, unitsResult, employeesResult, linksResult]) if (result.error) throw new Error(`organization_snapshot_failed:${result.error.message}`);

    const employeeRows = employeesResult.data ?? [];
    const linkRows = linksResult.data ?? [];
    const unitRows = unitsResult.data ?? [];
    const companies: Company[] = (companiesResult.data ?? []).map(row => ({
      id: row.id, legalName: row.legal_name, tradeName: row.trade_name, document: row.document,
      status: row.status, city: row.city ?? "", state: row.state ?? "",
      employeesCount: employeeRows.filter(employee => employee.company_id === row.id).length,
      establishmentsCount: unitRows.filter(unit => unit.company_id === row.id && unit.type === "establishment").length,
    }));
    const units: OrganizationUnit[] = unitRows.map(row => ({
      id: row.id, companyId: row.company_id, parentId: row.parent_id, type: row.type,
      code: row.code, name: row.name, status: row.status,
      employeesCount: linkRows.filter(link => link.establishment_id === row.id || link.department_id === row.id || link.cost_center_id === row.id).length,
    }));
    return { summary: { companies: companies.length, establishments: units.filter(unit => unit.type === "establishment").length, departments: units.filter(unit => unit.type === "department").length, costCenters: units.filter(unit => unit.type === "cost_center").length }, companies, units };
  }

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client.from("companies").insert({ organization_id: organizationId, legal_name: input.legalName, trade_name: input.tradeName, document: input.document, city: input.city, state: input.state.toUpperCase() }).select("id,legal_name,trade_name,document,status,city,state").single();
    if (error) throw new Error(`company_create_failed:${error.message}`);
    return { id: data.id, legalName: data.legal_name, tradeName: data.trade_name, document: data.document, status: data.status, city: data.city ?? "", state: data.state ?? "", employeesCount: 0, establishmentsCount: 0 };
  }
}
