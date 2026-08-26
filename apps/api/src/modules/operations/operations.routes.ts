import type { FastifyInstance } from "fastify";
import { InMemoryOperationsRepository } from "./operations.repository.js";

const repository = new InMemoryOperationsRepository();

export async function operationsRoutes(app: FastifyInstance) {
  app.get("/dashboard", async (_request, reply) => {
    const data = await repository.getDashboard();
    return reply.send({ data, meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() } });
  });
}
