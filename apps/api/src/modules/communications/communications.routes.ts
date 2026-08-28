import {
  createAnnouncementSchema,
  emitNotificationSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryCommunicationsRepository } from "./communications.repository.js";
const memoryRepository = new InMemoryCommunicationsRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase" ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "communications", () => new InMemoryCommunicationsRepository()) : memoryRepository;
export async function communicationsRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post<{ Params: { id: string } }>(
    "/notifications/:id/read",
    async (req, reply) => {
      const value = await repositoryFor(req.headers.authorization).markRead(req.params.id);
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/notifications/:id/acknowledge",
    async (req, reply) => {
      const value = await repositoryFor(req.headers.authorization).acknowledge(req.params.id);
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post("/announcements", async (req, reply) => {
    const p = createAnnouncementSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    return sendData(reply, await repositoryFor(req.headers.authorization).createAnnouncement(p.data), 201);
  });
  app.post("/events", async (req, reply) => {
    const p = emitNotificationSchema.safeParse(req.body);
    if (!p.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: p.error.issues });
    const result = await repositoryFor(req.headers.authorization).emit(p.data);
    return sendData(reply, result.data, result.duplicate ? 200 : 201);
  });
  app.post("/escalations/run", async (req, reply) => {
    const value = await repositoryFor(req.headers.authorization).escalate();
    return value
      ? sendData(reply, value.data, value.duplicate ? 200 : 201)
      : reply.code(204).send();
  });
}
