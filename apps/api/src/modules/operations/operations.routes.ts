import type { FastifyInstance } from "fastify";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryOperationsRepository } from "./operations.repository.js";
import { SupabaseOperationsRepository } from "./operations.supabase-repository.js";

const repository = new InMemoryOperationsRepository();

export async function operationsRoutes(app: FastifyInstance) {
  app.get("/dashboard", async (request, reply) => {
    const selectedRepository = getPersistenceMode() === "supabase"
      ? new SupabaseOperationsRepository(createRequestSupabaseClient(request.headers.authorization))
      : repository;
    const data = await selectedRepository.getDashboard();
    return reply.send({ data, meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() } });
  });
}
