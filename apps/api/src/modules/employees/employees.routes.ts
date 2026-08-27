import { createEmployeeSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryEmployeesRepository, type EmployeesRepository } from "./employees.repository.js";
import { SupabaseEmployeesRepository } from "./employees.supabase-repository.js";

const memoryRepository = new InMemoryEmployeesRepository();

function repositoryFor(authorization?: string): EmployeesRepository {
  return getPersistenceMode() === "supabase"
    ? new SupabaseEmployeesRepository(createRequestSupabaseClient(authorization))
    : memoryRepository;
}

export async function employeesRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => sendData(reply, await repositoryFor(request.headers.authorization).list()));
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const employee = await repositoryFor(request.headers.authorization).findById(request.params.id);
    if (!employee) return reply.code(404).send({ error: "employee_not_found" });
    return sendData(reply, employee);
  });
  app.post("/", async (request, reply) => {
    const parsed = createEmployeeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(reply, await repositoryFor(request.headers.authorization).create(parsed.data), 201);
  });
}
