import {
  createTerminationSchema,
  resolveTerminationExceptionSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryTerminationsRepository } from "./termination.repository.js";
const memoryRepository = new InMemoryTerminationsRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "terminations", () => new InMemoryTerminationsRepository()) : memoryRepository;
export async function terminationRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/processes", async (req, reply) => {
    const p = createTerminationSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).create(p.data), 201);
  });
  app.post<{ Params: { id: string; exceptionId: string } }>(
    "/processes/:id/exceptions/:exceptionId/resolve",
    async (req, reply) => {
      const parsed = resolveTerminationExceptionSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).resolve(
        req.params.id,
        req.params.exceptionId,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post<{ Params: { id: string; taskId: string } }>(
    "/processes/:id/tasks/:taskId/toggle",
    async (req, reply) => {
      const value = await repositoryFor(req.headers.authorization).toggleTask(
        req.params.id,
        req.params.taskId,
      );
      return value
        ? sendData(reply, value)
        : reply.code(422).send({ error: "blocked_task" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/processes/:id/approve",
    async (req, reply) => {
      const value = await repositoryFor(req.headers.authorization).approve(req.params.id);
      return value
        ? sendData(reply, value)
        : reply.code(422).send({ error: "pending_requirements" });
    },
  );
}
