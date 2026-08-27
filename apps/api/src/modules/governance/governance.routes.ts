import {
  inviteGovernanceUserSchema,
  revokeSessionSchema,
  updateRolePermissionsSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryGovernanceRepository } from "./governance.repository.js";
const memoryRepository = new InMemoryGovernanceRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "governance", () => new InMemoryGovernanceRepository()) : memoryRepository;
export async function governanceRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/users/invite", async (req, reply) => {
    const p = inviteGovernanceUserSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).invite(p.data), 201);
  });
  app.put<{ Params: { role: string } }>(
    "/roles/:role/permissions",
    async (req, reply) => {
      const p = updateRolePermissionsSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).updatePermission(req.params.role, p.data);
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/sessions/:id/revoke",
    async (req, reply) => {
      const p = revokeSessionSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).revokeSession(
        req.params.id,
        p.data.justification,
      );
      return value
        ? sendData(reply, value)
        : reply.code(422).send({ error: "current_or_missing_session" });
    },
  );
}
