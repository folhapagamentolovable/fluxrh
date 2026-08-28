import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPilotLoadPayload, MAIN_PROJECT_ID, MAIN_SUPABASE_URL } from "./pilot-loader.js";

describe("authenticated pilot loader", () => {
  it("builds the complete deterministic payload", async () => {
    const first = await buildPilotLoadPayload();
    const second = await buildPilotLoadPayload();
    expect(second).toEqual(first);
    expect(first.employees).toHaveLength(120);
    expect(new Set(first.employees.map((item) => item.registration)).size).toBe(120);
    expect(first.units.filter((item) => item.type === "establishment")).toHaveLength(2);
    expect(first.schedules).toHaveLength(3);
    expect(first.patrolState.assignments).toHaveLength(120);
  });

  it("is pinned to the authorized main project", () => {
    expect(MAIN_PROJECT_ID).toBe("akdmobvbombhqvvglayn");
    expect(MAIN_SUPABASE_URL).toBe("https://akdmobvbombhqvvglayn.supabase.co");
  });

  it("keeps the database entry point authenticated, tenant-scoped and idempotent", () => {
    const migration = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20260828224348_create_authenticated_pilot_loader.sql"), "utf8");
    expect(migration).toContain("private.is_current_session_active()");
    expect(migration).toContain("private.has_organization_role(");
    expect(migration).toContain("on conflict (organization_id, registration) do update");
    expect(migration).toContain("revoke all on function public.load_internal_pilot(uuid, jsonb)");
    expect(migration).toContain("grant execute on function public.load_internal_pilot(uuid, jsonb) to authenticated");
  });

  it("keeps the competence executor authenticated and uniquely scoped", () => {
    const migration = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20260828230615_execute_internal_pilot_competence.sql"), "utf8");
    expect(migration).toContain("private.is_current_session_active()");
    expect(migration).toContain("unique (organization_id, scenario_id, competence)");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("grant execute on function public.execute_internal_pilot_competence(uuid) to authenticated");
  });
});
