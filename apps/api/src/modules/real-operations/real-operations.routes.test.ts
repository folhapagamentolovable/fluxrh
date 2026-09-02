import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { presentCycle } from "./real-operations.routes.js";

describe("controlled real cycle routes", () => {
  it("presents persisted cycles and evidence using the public camelCase contract", () => {
    expect(presentCycle({
      id: "11111111-1111-4111-8111-111111111111",
      competence: "2026-09-01",
      title: "Ciclo setembro",
      status: "prepared",
      scope: ["employees"],
      checklist: { termsApproved: true },
      human_reviewer: "Neozinho",
      rollback_plan: "Restaurar checkpoint validado.",
      approval_note: null,
      approved_at: null,
      created_at: "2026-09-01T12:00:00Z",
      updated_at: "2026-09-01T12:00:00Z",
      controlled_real_cycle_evidence: [{ id: "22222222-2222-4222-8222-222222222222", kind: "audit", label: "Conferência", reference: "storage://evidence", sha256: null, recorded_at: "2026-09-01T13:00:00Z" }],
    })).toMatchObject({ humanReviewer: "Neozinho", rollbackPlan: "Restaurar checkpoint validado.", evidence: [{ label: "Conferência", recordedAt: "2026-09-01T13:00:00Z" }] });
  });

  it("keeps real-cycle preparation unavailable in local persistence", async () => {
    const previous = process.env.FLUXRH_PERSISTENCE;
    process.env.FLUXRH_PERSISTENCE = "memory";
    const app = buildApp();
    const response = await app.inject({ method: "POST", url: "/api/v1/real-operations/cycles", payload: {} });
    await app.close();
    if (previous === undefined) delete process.env.FLUXRH_PERSISTENCE; else process.env.FLUXRH_PERSISTENCE = previous;
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "real_cycle_requires_supabase_persistence" });
  });
});
