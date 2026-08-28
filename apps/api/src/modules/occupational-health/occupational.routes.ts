import {
  completeOccupationalExamSchema,
  createOccupationalExamSchema,
  resolveOccupationalExceptionSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryOccupationalRepository } from "./occupational.repository.js";
const memoryRepository = new InMemoryOccupationalRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "occupational_health", () => new InMemoryOccupationalRepository()) : memoryRepository;
export async function occupationalHealthRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/exams", async (req, reply) => {
    const p = createOccupationalExamSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).create(p.data), 201);
  });
  app.post<{ Params: { id: string } }>(
    "/exams/:id/complete",
    async (req, reply) => {
      const p = completeOccupationalExamSchema.safeParse(req.body);
      if (!p.success)
        return reply
          .code(400)
          .send({ error: "validation_error", issues: p.error.issues });
      const value = await repositoryFor(req.headers.authorization).complete(req.params.id, p.data);
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/exceptions/:id/resolve",
    async (req, reply) => {
      const p = resolveOccupationalExceptionSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).resolveException(
        req.params.id,
        p.data.note,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
}
