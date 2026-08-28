import {
  createServiceRequestSchema,
  decidePortalApprovalSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryPortalRepository } from "./portal.repository.js";
const memoryRepository = new InMemoryPortalRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "portal", () => new InMemoryPortalRepository()) : memoryRepository;
export async function portalRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/requests", async (req, reply) => {
    const p = createServiceRequestSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).create(p.data), 201);
  });
  app.post<{ Params: { id: string } }>(
    "/approvals/:id/decision",
    async (req, reply) => {
      const p = decidePortalApprovalSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).decide(
        req.params.id,
        p.data.decision,
        p.data.note,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
}
