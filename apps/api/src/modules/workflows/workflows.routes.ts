import { advanceWorkflowSchema, createAdmissionSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { InMemoryWorkflowsRepository } from "./workflows.repository.js";

const repository = new InMemoryWorkflowsRepository();
export async function workflowsRoutes(app: FastifyInstance) {
  app.get("/overview", async (_request, reply) => sendData(reply, await repository.overview()));
  app.get("/admissions", async (_request, reply) => sendData(reply, await repository.list()));
  app.get<{ Params: { id: string } }>("/admissions/:id", async (request, reply) => { const value = await repository.find(request.params.id); return value ? sendData(reply, value) : reply.code(404).send({ error: "admission_not_found" }); });
  app.post("/admissions", async (request, reply) => { const parsed = createAdmissionSchema.safeParse(request.body); return parsed.success ? sendData(reply, await repository.create(parsed.data), 201) : reply.code(400).send({ error: "validation_error", issues: parsed.error.issues }); });
  app.post<{ Params: { id: string } }>("/admissions/:id/advance", async (request, reply) => { const parsed = advanceWorkflowSchema.safeParse(request.body ?? {}); if (!parsed.success) return reply.code(400).send({ error: "validation_error" }); const value = await repository.advance(request.params.id, parsed.data.note); return value ? sendData(reply, value) : reply.code(404).send({ error: "admission_not_found" }); });
}
