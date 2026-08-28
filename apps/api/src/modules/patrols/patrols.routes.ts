import {
  createPatrolOccurrenceSchema,
  registerPatrolVisitSchema,
  resolvePatrolOccurrenceSchema,
  startPatrolSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryPatrolsRepository } from "./patrols.repository.js";
const memoryRepository = new InMemoryPatrolsRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "patrols", () => new InMemoryPatrolsRepository()) : memoryRepository;
export async function patrolsRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post<{ Params: { routeId: string } }>(
    "/routes/:routeId/start",
    async (req, reply) => {
      const p = startPatrolSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).start(req.params.routeId, p.data);
      return value
        ? sendData(reply, value, 201)
        : reply.code(404).send({ error: "route_not_found" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/patrols/:id/visits",
    async (req, reply) => {
      const p = registerPatrolVisitSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const result = await repositoryFor(req.headers.authorization).visit(req.params.id, p.data);
      return "error" in result
        ? reply
            .code(result.error === "invalid_token" ? 422 : 404)
            .send({ error: result.error })
        : sendData(reply, result.data, 201);
    },
  );
  app.post<{ Params: { id: string } }>(
    "/patrols/:id/occurrences",
    async (req, reply) => {
      const p = createPatrolOccurrenceSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).occurrence(req.params.id, p.data);
      return value
        ? sendData(reply, value, 201)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/occurrences/:id/resolve",
    async (req, reply) => {
      const p = resolvePatrolOccurrenceSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).resolveOccurrence(
        req.params.id,
        p.data.note,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
}
