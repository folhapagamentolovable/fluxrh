import type { DashboardSnapshot } from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "../../shared/supabase.js";
import { InMemoryOperationsRepository, type OperationsRepository } from "./operations.repository.js";

export class SupabaseOperationsRepository implements OperationsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getDashboard(): Promise<DashboardSnapshot> {
    const organizationId = await getCurrentOrganizationId(this.client);
    const fallback = await new InMemoryOperationsRepository().getDashboard();
    const [organization, activeEmployees, openExceptions, runningWorkflows] = await Promise.all([
      this.client.from("organizations").select("id,name,document").eq("id", organizationId).single(),
      this.client.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
      this.client.from("operational_exceptions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["open", "in_review"]),
      this.client.from("workflow_instances").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["running", "waiting", "exception"]),
    ]);
    for (const result of [organization, activeEmployees, openExceptions, runningWorkflows]) {
      if (result.error) throw new Error(`dashboard_load_failed:${result.error.message}`);
    }
    return {
      ...fallback,
      organization: organization.data as DashboardSnapshot["organization"],
      metrics: {
        ...fallback.metrics,
        activeEmployees: activeEmployees.count ?? 0,
        openExceptions: openExceptions.count ?? 0,
        workflowsRunning: runningWorkflows.count ?? 0,
      },
    };
  }
}
