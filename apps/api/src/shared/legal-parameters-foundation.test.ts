import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../../../../supabase/migrations/20260901013620_version_legal_parameter_sets.sql",
  import.meta.url,
)), "utf8");
const collectiveAddendumMigration = readFileSync(fileURLToPath(new URL(
  "../../../../supabase/migrations/20260901034935_import_sindeepres_2026_addendum.sql",
  import.meta.url,
)), "utf8");
const companyMappingsMigration = readFileSync(fileURLToPath(new URL(
  "../../../../supabase/migrations/20260901040303_confirm_company_cct_job_mappings.sql",
  import.meta.url,
)), "utf8");
const principalCctMigration = readFileSync(fileURLToPath(new URL(
  "../../../../supabase/migrations/20260901040739_import_principal_cct_shift_rules.sql",
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

  it("imports the registered 2026 addendum without silently applying it to excluded activities", () => {
    expect(collectiveAddendumMigration).toContain("SP002405/2026");
    expect(collectiveAddendumMigration).toContain("bfd4cfd54e8661d72ae286a21894653fe0d49019953cd46477c4e554fa35a1ac");
    expect(collectiveAddendumMigration).toContain("vigilância e segurança patrimonial");
    expect(collectiveAddendumMigration).toContain("blocked_pending_applicability_confirmation");
    expect(collectiveAddendumMigration).toContain("schedule12x36ClauseNotPresentInUploadedAddendum");
  });

  it("records the company job mappings and the authoritative AUD-0001 salary", () => {
    expect(companyMappingsMigration).toContain("'companyRole','Vigia'");
    expect(companyMappingsMigration).toContain("'collectiveRole','Fiscal de Piso / Fiscal de Loja'");
    expect(companyMappingsMigration).toContain("'companySalary',2091.57");
    expect(companyMappingsMigration).toContain("'effectivePremium',60.00");
    expect(companyMappingsMigration).toContain("'companyRole','Auxiliar de Limpeza'");
    expect(companyMappingsMigration).toContain("'companyRole','Zelador'");
    expect(companyMappingsMigration).toContain("active_for_confirmed_company_mappings");
  });

  it("imports the principal CCT references and authorizes 12x36 and 5x2", () => {
    expect(principalCctMigration).toContain("SP003052/2025");
    expect(principalCctMigration).toContain("MR002706/2025");
    expect(principalCctMigration).toContain("10260.202420/2025-88");
    expect(principalCctMigration).toContain("'code','12x36','authorized',true,'sourceClause',52");
    expect(principalCctMigration).toContain("'code','5x2','authorized',true,'sourceClause',53");
    expect(principalCctMigration.match(/'salaryDivisor',220/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
