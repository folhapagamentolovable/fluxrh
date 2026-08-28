import { describe, expect, it } from "vitest";
import { InMemoryPatrolsRepository } from "./patrols.repository.js";
describe("QR patrols", () => {
  it("validates route sequence and completes coverage", async () => {
    const repo = new InMemoryPatrolsRepository(),
      patrol = await repo.start("route_1", {
        employeeId: "emp_test",
        employeeName: "Pessoa Teste",
        deviceId: "device-test",
      });
    expect(patrol).toBeTruthy();
    for (let i = 1; i <= 4; i++)
      await repo.visit(patrol!.id, {
        token: `FLXRH-RONDA-MTZ-00${i}`,
        deviceId: "device-test",
        offline: false,
        locationValid: true,
      });
    const overview = await repo.overview(),
      updated = overview.patrols.find((x) => x.id === patrol!.id);
    expect(updated?.status).toBe("completed");
    expect(updated?.progress).toBe(100);
  });
  it("rejects an invalid QR code and creates an exception", async () => {
    const repo = new InMemoryPatrolsRepository(),
      patrol = await repo.start("route_1", {
        employeeId: "emp_test2",
        employeeName: "Pessoa Teste",
        deviceId: "device-test",
      });
    const result = await repo.visit(patrol!.id, {
      token: "INVALID-QR",
      deviceId: "device-test",
      offline: false,
      locationValid: true,
    });
    expect("error" in result && result.error).toBe("invalid_token");
    const overview = await repo.overview();
    expect(
      overview.patrols.find((x) => x.id === patrol!.id)?.exceptions,
    ).toHaveLength(1);
  });
  it("keeps offline scan evidence", async () => {
    const repo = new InMemoryPatrolsRepository(),
      patrol = await repo.start("route_1", {
        employeeId: "emp_test3",
        employeeName: "Pessoa Teste",
        deviceId: "device-offline",
      });
    const result = await repo.visit(patrol!.id, {
      token: "FLXRH-RONDA-MTZ-001",
      deviceId: "device-offline",
      offline: true,
      locationValid: true,
    });
    if (!("data" in result) || !result.data)
      throw new Error("visit_not_created");
    expect(result.data.source).toBe("offline_sync");
  });
});
