import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";
export class SupabasePeopleRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listDependents(employeeId:string){const org=await getCurrentOrganizationId(this.client);const {data,error}=await this.client.from("employee_dependents").select("*").eq("organization_id",org).eq("employee_id",employeeId);if(error)throw new Error(error.message);return (data??[]).map(this.map);}
  async createDependent(employeeId:string,input:any){const org=await getCurrentOrganizationId(this.client);const {data,error}=await this.client.from("employee_dependents").insert({organization_id:org,employee_id:employeeId,full_name:input.fullName,document:input.document,birth_date:input.birthDate,relationship:input.relationship,eligible_for_benefits:input.eligibleForBenefits}).select().single();if(error)throw new Error(error.message);return this.map(data);}
  async current(){const org=await getCurrentOrganizationId(this.client);const {data,error}=await this.client.from("time_competence_closures").select("*").eq("organization_id",org).order("competence",{ascending:false}).limit(1).maybeSingle();if(error)throw new Error(error.message);return data?this.mapClosure(data):null;}
  async close(id:string,notes?:string){const {data,error}=await this.client.rpc("close_time_competence",{p_id:id,p_notes:notes??null});if(error)throw new Error(error.message);return this.mapClosure(data);}
  private map=(r:any)=>({id:r.id,organizationId:r.organization_id,employeeId:r.employee_id,fullName:r.full_name,document:r.document??undefined,birthDate:r.birth_date,relationship:r.relationship,eligibleForBenefits:r.eligible_for_benefits,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
  private mapClosure=(r:any)=>({id:r.id,organizationId:r.organization_id,competence:r.competence,status:r.status,closingProgress:r.closing_progress,openedAt:r.opened_at,closedAt:r.closed_at,closedBy:r.closed_by,notes:r.notes});
}
