import { advanceWorkflowSchema, createAdmissionSchema, createOperationalExceptionSchema, resolveOperationalExceptionSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { normalizePersonalData } from "../../shared/personal-data.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryWorkflowsRepository, type WorkflowsRepository } from "./workflows.repository.js";
import { SupabaseWorkflowsRepository } from "./workflows.supabase-repository.js";

const memoryRepository = new InMemoryWorkflowsRepository();
const repositoryFor = (authorization?: string): WorkflowsRepository => getPersistenceMode() === "supabase"
  ? new SupabaseWorkflowsRepository(createRequestSupabaseClient(authorization))
  : memoryRepository;

export async function workflowsRoutes(app: FastifyInstance) {
  app.get("/exceptions", async (request, reply) => sendData(reply, await repositoryFor(request.headers.authorization).exceptions()));
  app.post<{ Params: { id: string } }>("/admissions/:id/exceptions", async (request, reply) => {const parsed=createOperationalExceptionSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"validation_error",issues:parsed.error.issues});const value=await repositoryFor(request.headers.authorization).createException(request.params.id,parsed.data.title,parsed.data.description,parsed.data.priority);return value?sendData(reply,value,201):reply.code(404).send({error:"admission_not_found"});});
  app.post<{ Params: { id: string } }>("/exceptions/:id/resolve", async (request, reply) => { const parsed=resolveOperationalExceptionSchema.safeParse(request.body); if(!parsed.success)return reply.code(400).send({error:"validation_error",issues:parsed.error.issues}); const value=await repositoryFor(request.headers.authorization).resolveException(request.params.id,parsed.data.note); return value?sendData(reply,value):reply.code(404).send({error:"exception_not_found"}); });
  app.get<{ Querystring: { workflowId?: string } }>("/audit", async (request, reply) => sendData(reply, await repositoryFor(request.headers.authorization).audit(request.query.workflowId)));
  app.get("/overview", async (request, reply) => sendData(reply, await repositoryFor(request.headers.authorization).overview()));
  app.get("/admissions", async (request, reply) => sendData(reply, await repositoryFor(request.headers.authorization).list()));
  app.get<{ Params: { id: string } }>("/admissions/:id", async (request, reply) => {
    const value = await repositoryFor(request.headers.authorization).find(request.params.id);
    return value ? sendData(reply, value) : reply.code(404).send({ error: "admission_not_found" });
  });
  app.post("/admissions", async (request, reply) => {
    const parsed = createAdmissionSchema.safeParse(request.body);
    return parsed.success
      ? sendData(reply, await repositoryFor(request.headers.authorization).create(normalizePersonalData(parsed.data)), 201)
      : reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
  });
  app.post<{ Params: { id: string } }>("/admissions/:id/advance", async (request, reply) => {
    const parsed = advanceWorkflowSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    const value = await repositoryFor(request.headers.authorization).advance(request.params.id, parsed.data.note);
    return value ? sendData(reply, value) : reply.code(404).send({ error: "admission_not_found" });
  });
}
