import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

describe("controlled real cycle routes", () => {
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
