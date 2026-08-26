import { describe, expect, it } from "vitest";
import { localDataRequest } from "./local-data";

const getRoutes = [
  "/api/v1/operations/dashboard",
  "/api/v1/organizations",
  "/api/v1/employees",
  "/api/v1/workflows/overview",
  "/api/v1/workflows/admissions",
  "/api/v1/documents/overview",
  "/api/v1/time/overview",
  "/api/v1/absences/overview",
  "/api/v1/payroll/overview",
  "/api/v1/benefits/overview",
  "/api/v1/special-calculations/overview",
];

describe("local data layer", () => {
  it.each(getRoutes)("serves %s without the Fastify API", async route => {
    await expect(localDataRequest(route)).resolves.toBeTruthy();
  });

  it("persists workflow mutations for the current preview session", async () => {
    const before = await localDataRequest("/api/v1/workflows/admissions/adm_marina") as { progress: number };
    const after = await localDataRequest("/api/v1/workflows/admissions/adm_marina/advance", {
      method: "POST",
      body: JSON.stringify({ note: "Validação do modo local" }),
    }) as { progress: number };

    expect(after.progress).toBeGreaterThan(before.progress);
  });

  it("generates a browser-compatible acceptance hash", async () => {
    const accepted = await localDataRequest("/api/v1/documents/doc_contract_camila/accept", {
      method: "POST",
      body: JSON.stringify({ signerName: "Camila Rocha", signerDocument: "123.456.789-00" }),
    }) as { acceptance?: { documentHash: string } };

    expect(accepted.acceptance?.documentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
