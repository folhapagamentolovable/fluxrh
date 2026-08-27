import {
  createSpecialCalculationSchema,
  resolveSpecialCalculationSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemorySpecialRepository } from "./special.repository.js";
const memoryRepository = new InMemorySpecialRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "special_calculations", () => new InMemorySpecialRepository()) : memoryRepository;
export async function specialCalculationRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/calculations", async (req, reply) => {
    const p = createSpecialCalculationSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).create(p.data), 201);
  });
  app.post<{ Params: { id: string; exceptionId: string } }>(
    "/calculations/:id/exceptions/:exceptionId/resolve",
    async (req, reply) => {
      const p = resolveSpecialCalculationSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).resolve(
        req.params.id,
        req.params.exceptionId,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "exception_not_found" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/calculations/:id/approve",
    async (req, reply) => {
      const value = await repositoryFor(req.headers.authorization).approve(req.params.id);
      return value
        ? sendData(reply, value)
        : reply.code(422).send({ error: "open_exceptions" });
    },
  );
}
