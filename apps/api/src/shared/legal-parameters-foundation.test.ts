import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../../../../supabase/migrations/20260901013620_version_legal_parameter_sets.sql",
  import.meta.url,
)), "utf8");

describe("versioned legal parameters", () => {
  it("is tenant scoped, immutable to application roles and protected by RLS", () => {
    expect(migration).toContain("organization_id uuid not null references public.organizations(id)");
    expect(migration).toContain("alter table public.legal_parameter_sets enable row level security");
    expect(migration).toContain("revoke all on public.legal_parameter_sets from anon, authenticated");
    expect(migration).toContain("grant select on public.legal_parameter_sets to authenticated");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^;]*legal_parameter_sets[^;]*authenticated/i);
  });

  it("versions each source with vigency, parameters and a SHA-256 fingerprint", () => {
    expect(migration).toContain("unique (organization_id, code, version)");
    expect(migration).toContain("effective_from date not null");
    expect(migration).toContain("source_hash text not null");
    expect(migration).toContain("extensions.digest");
    expect(migration).toContain("'inss','inss_employee','INSS empregado',2");
    expect(migration).toContain("'irrf','irrf_monthly','IRRF mensal',2");
    expect(migration).toContain("'collective_agreement','sindeepres_aud0001'");
  });
});
