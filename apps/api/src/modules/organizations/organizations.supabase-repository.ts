import type {
  Company,
  CreateCompanyInput,
  CreateOrganizationUnitInput,
  OrganizationSnapshot,
  OrganizationUnit,
  UpdateCompanyInput,
  UpdateOrganizationUnitInput,
} from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";
import type { OrganizationsRepository } from "./organizations.repository.js";

export class SupabaseOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSnapshot(): Promise<OrganizationSnapshot> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const [companiesResult, unitsResult, employeesResult, linksResult] =
      await Promise.all([
        this.client
          .from("companies")
          .select(
            "id,legal_name,trade_name,document,status,responsible_name,responsible_role,phone,street,street_number,complement,district,city,state,postal_code",
          )
          .eq("organization_id", organizationId)
          .order("trade_name"),
        this.client
          .from("organization_units")
          .select(
            "id,company_id,parent_id,type,code,name,status,manager_name,document,phone,email,street,street_number,complement,district,city,state,postal_code",
          )
          .eq("organization_id", organizationId)
          .order("code"),
        this.client
          .from("employees")
          .select("id,company_id")
          .eq("organization_id", organizationId)
          .neq("status", "terminated"),
        this.client
          .from("employment_links")
          .select("employee_id,establishment_id,department_id,cost_center_id")
          .eq("organization_id", organizationId)
          .eq("active", true),
      ]);
    for (const result of [
      companiesResult,
      unitsResult,
      employeesResult,
      linksResult,
    ])
      if (result.error)
        throw new Error(`organization_snapshot_failed:${result.error.message}`);

    const employeeRows = employeesResult.data ?? [];
    const linkRows = linksResult.data ?? [];
    const unitRows = unitsResult.data ?? [];
    const companies: Company[] = (companiesResult.data ?? []).map((row) => ({
      id: row.id,
      legalName: row.legal_name,
      tradeName: row.trade_name,
      document: row.document,
      status: row.status,
      city: row.city ?? "",
      state: row.state ?? "",
      responsibleName: row.responsible_name ?? "",
      responsibleRole: row.responsible_role ?? "",
      phone: row.phone ?? "",
      street: row.street ?? "",
      streetNumber: row.street_number ?? "",
      complement: row.complement ?? "",
      district: row.district ?? "",
      postalCode: row.postal_code ?? "",
      employeesCount: employeeRows.filter(
        (employee) => employee.company_id === row.id,
      ).length,
      establishmentsCount: unitRows.filter(
        (unit) => unit.company_id === row.id && unit.type === "establishment",
      ).length,
    }));
    const units: OrganizationUnit[] = unitRows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      parentId: row.parent_id,
      type: row.type,
      code: row.code,
      name: row.name,
      status: row.status,
      managerName: row.manager_name ?? undefined,
      document: row.document ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      street: row.street ?? undefined,
      streetNumber: row.street_number ?? undefined,
      complement: row.complement ?? undefined,
      district: row.district ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      postalCode: row.postal_code ?? undefined,
      employeesCount: linkRows.filter(
        (link) =>
          link.establishment_id === row.id ||
          link.department_id === row.id ||
          link.cost_center_id === row.id,
      ).length,
    }));
    return {
      summary: {
        companies: companies.length,
        establishments: units.filter((unit) => unit.type === "establishment")
          .length,
        departments: units.filter((unit) => unit.type === "department").length,
        costCenters: units.filter((unit) => unit.type === "cost_center").length,
      },
      companies,
      units,
    };
  }

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("companies")
      .insert({ organization_id: organizationId, ...companyRow(input) })
      .select(
        "id,legal_name,trade_name,document,status,responsible_name,responsible_role,phone,street,street_number,complement,district,city,state,postal_code",
      )
      .single();
    if (error) throw new Error(`company_create_failed:${error.message}`);
    return mapCompany(data);
  }
  async updateCompany(id: string, input: UpdateCompanyInput) {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("companies")
      .update({ ...companyRow(input), status: input.status })
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select(
        "id,legal_name,trade_name,document,status,responsible_name,responsible_role,phone,street,street_number,complement,district,city,state,postal_code",
      )
      .maybeSingle();
    if (error) throw new Error(`company_update_failed:${error.message}`);
    return data ? mapCompany(data) : undefined;
  }
  async deleteCompany(id: string) {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("companies")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`company_delete_failed:${error.message}`);
    return Boolean(data);
  }
  async createUnit(input: CreateOrganizationUnitInput) {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("organization_units")
      .insert({ organization_id: organizationId, ...unitRow(input) })
      .select(
        "id,company_id,parent_id,type,code,name,status,manager_name,document,phone,email,street,street_number,complement,district,city,state,postal_code",
      )
      .single();
    if (error) throw new Error(`unit_create_failed:${error.message}`);
    return mapUnit(data);
  }
  async updateUnit(id: string, input: UpdateOrganizationUnitInput) {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("organization_units")
      .update(unitRow(input))
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select(
        "id,company_id,parent_id,type,code,name,status,manager_name,document,phone,email,street,street_number,complement,district,city,state,postal_code",
      )
      .maybeSingle();
    if (error) throw new Error(`unit_update_failed:${error.message}`);
    return data ? mapUnit(data) : undefined;
  }
  async deleteUnit(id: string) {
    const organizationId = await getCurrentOrganizationId(this.client);
    const { data, error } = await this.client
      .from("organization_units")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`unit_delete_failed:${error.message}`);
    return Boolean(data);
  }
}

const companyRow = (input: CreateCompanyInput | UpdateCompanyInput) => ({
  legal_name: input.legalName,
  trade_name: input.tradeName,
  document: input.document,
  responsible_name: input.responsibleName,
  responsible_role: input.responsibleRole,
  phone: input.phone,
  street: input.street,
  street_number: input.streetNumber,
  complement: input.complement,
  district: input.district,
  city: input.city,
  state: input.state.toUpperCase(),
  postal_code: input.postalCode,
});
const mapCompany = (row: any): Company => ({
  id: row.id,
  legalName: row.legal_name,
  tradeName: row.trade_name,
  document: row.document,
  status: row.status,
  responsibleName: row.responsible_name ?? "",
  responsibleRole: row.responsible_role ?? "",
  phone: row.phone ?? "",
  street: row.street ?? "",
  streetNumber: row.street_number ?? "",
  complement: row.complement ?? "",
  district: row.district ?? "",
  city: row.city ?? "",
  state: row.state ?? "",
  postalCode: row.postal_code ?? "",
  employeesCount: 0,
  establishmentsCount: 0,
});
const unitRow = (
  input: CreateOrganizationUnitInput | UpdateOrganizationUnitInput,
) => ({
  company_id: input.companyId,
  parent_id: input.parentId,
  type: input.type,
  code: input.code,
  name: input.name,
  status: input.status,
  manager_name: input.managerName || null,
  document: input.document || null,
  phone: input.phone || null,
  email: input.email || null,
  street: input.street || null,
  street_number: input.streetNumber || null,
  complement: input.complement || null,
  district: input.district || null,
  city: input.city || null,
  state: input.state?.toUpperCase() || null,
  postal_code: input.postalCode || null,
});
const mapUnit = (row: any): OrganizationUnit => ({
  id: row.id,
  companyId: row.company_id,
  parentId: row.parent_id,
  type: row.type,
  code: row.code,
  name: row.name,
  status: row.status,
  managerName: row.manager_name ?? undefined,
  document: row.document ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  street: row.street ?? undefined,
  streetNumber: row.street_number ?? undefined,
  complement: row.complement ?? undefined,
  district: row.district ?? undefined,
  city: row.city ?? undefined,
  state: row.state ?? undefined,
  postalCode: row.postal_code ?? undefined,
  employeesCount: 0,
});
