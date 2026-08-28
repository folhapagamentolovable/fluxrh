import { createEmployeeSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { normalizePersonalData } from "../../shared/personal-data.js";
import { InMemoryEmployeesRepository, type EmployeesRepository } from "./employees.repository.js";
import { SupabaseEmployeesRepository } from "./employees.supabase-repository.js";

const memoryRepository = new InMemoryEmployeesRepository();

function repositoryFor(authorization?: string): EmployeesRepository {
  return getPersistenceMode() === "supabase"
    ? new SupabaseEmployeesRepository(createRequestSupabaseClient(authorization))
    : memoryRepository;
}

export async function employeesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; status?: string; limit?: string; offset?: string } }>("/", async (request, reply) => {
    const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50)));
    const offset = Math.max(0, Number(request.query.offset ?? 0));
    const statuses = ["active", "vacation", "leave", "onboarding", "terminated"] as const;
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || (request.query.status && !statuses.includes(request.query.status as typeof statuses[number]))) return reply.code(400).send({ error: "validation_error" });
    const status = request.query.status as typeof statuses[number] | undefined;
    return sendData(reply, await repositoryFor(request.headers.authorization).list({ query: request.query.q?.slice(0, 100), status, limit, offset }));
  });
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const employee = await repositoryFor(request.headers.authorization).findById(request.params.id);
    if (!employee) return reply.code(404).send({ error: "employee_not_found" });
    return sendData(reply, employee);
  });
  app.post("/", async (request, reply) => {
    const parsed = createEmployeeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(reply, await repositoryFor(request.headers.authorization).create(normalizePersonalData(parsed.data)), 201);
  });
}


