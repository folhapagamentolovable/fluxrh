import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL(
  "../../../../supabase/migrations/20260826143000_foundation_auth_tenancy.sql",
  import.meta.url,
));
const migration = readFileSync(migrationPath, "utf8");

const tenantTables = [
  "organizations",
  "organization_members",
  "companies",
  "organization_units",
  "employees",
  "employment_links",
  "workflow_definitions",
  "workflow_instances",
  "workflow_tasks",
  "operational_exceptions",
  "domain_events",
  "audit_events",
];

describe("local database foundation", () => {
  it.each(tenantTables)("enables RLS on %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it("keeps authorization helpers private and pins their search path", () => {
    expect(migration).toContain("create or replace function private.is_active_member");
    expect(migration).toContain("create or replace function private.has_organization_role");
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("revoke all on schema private from public, anon, authenticated");
  });

  it("does not grant anonymous table access", () => {
    expect(migration).toContain("from anon, authenticated;");
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete)[^;]+\s+to\s+anon/i);
  });

  it("keeps the audit trail append-only for authenticated users", () => {
    expect(migration).toContain("grant select on public.audit_events to authenticated;");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^;]*audit_events[^;]*authenticated/i);
  });

  it("contains no command that can target a remote Supabase project", () => {
    expect(migration).not.toMatch(/supabase\s+(link|db\s+push|db\s+reset\s+--linked)/i);
  });
});
