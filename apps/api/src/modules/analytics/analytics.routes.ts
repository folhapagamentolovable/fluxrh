import { analyticsFilterSchema, generateReportSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryAnalyticsRepository } from "./analytics.repository.js";
const memoryRepository = new InMemoryAnalyticsRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "analytics", () => new InMemoryAnalyticsRepository()) : memoryRepository;
export async function analyticsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { companyId?: string; departmentId?: string; period?: string };
  }>("/overview", async (req, reply) => {
    const p = analyticsFilterSchema.safeParse(req.query);
    if (!p.success) return reply.code(400).send({ error: "validation_error" });
    return sendData(reply, await repositoryFor(req.headers.authorization).overview(p.data));
  });
  app.post("/reports/generate", async (req, reply) => {
    const p = generateReportSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    const value = await repositoryFor(req.headers.authorization).generate(p.data);
    return value
      ? sendData(reply, value, 201)
      : reply.code(404).send({ error: "report_not_found" });
  });
}
