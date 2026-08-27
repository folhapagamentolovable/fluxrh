import {
  createBenefitEnrollmentSchema,
  createEmployeeMovementSchema,
  decideEmployeeMovementSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryBenefitsRepository } from "./benefits.repository.js";
const memoryRepository = new InMemoryBenefitsRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase"
  ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "benefits", () => new InMemoryBenefitsRepository())
  : memoryRepository;
export async function benefitsRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/enrollments", async (req, reply) => {
    const p = createBenefitEnrollmentSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    const value = await repositoryFor(req.headers.authorization).enroll(p.data);
    return value
      ? sendData(reply, value, 201)
      : reply.code(404).send({ error: "plan_not_found" });
  });
  app.post("/movements", async (req, reply) => {
    const p = createEmployeeMovementSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).createMovement(p.data), 201);
  });
  app.post<{ Params: { id: string } }>(
    "/movements/:id/decision",
    async (req, reply) => {
      const p = decideEmployeeMovementSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).decideMovement(
        req.params.id,
        p.data.decision,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "movement_not_found" });
    },
  );
}
