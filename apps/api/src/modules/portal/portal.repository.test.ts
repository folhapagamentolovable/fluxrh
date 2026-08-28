import { describe, expect, it } from "vitest";
import { InMemoryPortalRepository } from "./portal.repository.js";
describe("employee portal", () => {
  it("creates a traceable service request", async () => {
    const repo = new InMemoryPortalRepository();
    const value = await repo.create({
      employeeId: "emp_test",
      employeeName: "Pessoa Teste",
      type: "other",
      title: "Dúvida ao RH",
      description: "Preciso de uma orientação",
      priority: "medium",
    });
    expect(value.protocol).toMatch(/^FLX-2026-/);
    expect(value.timeline).toHaveLength(1);
    expect(value.status).toBe("submitted");
  });
  it("records a manager decision", async () => {
    const repo = new InMemoryPortalRepository();
    const value = await repo.decide("apr_1", "approve", "Cobertura confirmada");
    expect(value?.status).toBe("approved");
  });
});
