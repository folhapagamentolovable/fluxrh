import { describe, expect, it } from "vitest";
import { InMemoryAnalyticsRepository } from "./analytics.repository.js";
describe("management analytics", () => {
  it("filters department data and recalculates totals", async () => {
    const repo = new InMemoryAnalyticsRepository();
    const all = await repo.overview(),
      filtered = await repo.overview({ departmentId: "dept_ops" });
    expect(filtered.departments).toHaveLength(1);
    expect(filtered.summary.headcount).toBeLessThan(all.summary.headcount);
  });
  it("queues and completes a traceable report run in background", async () => {
    const repo = new InMemoryAnalyticsRepository();
    const run = await repo.generate({
      reportId: "rep_headcount",
      format: "csv",
      period: "6m",
    });
    expect(run?.status).toBe("processing");
    expect(run?.completedAt).toBeUndefined();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const overview = await repo.overview();
    expect(overview.runs[0]?.status).toBe("ready");
    expect(overview.runs[0]?.fileName).toMatch(/\.csv$/);
  });
});
