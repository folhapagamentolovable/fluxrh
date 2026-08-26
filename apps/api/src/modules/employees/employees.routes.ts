import { createEmployeeSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { InMemoryEmployeesRepository } from "./employees.repository.js";

const repository = new InMemoryEmployeesRepository();

export async function employeesRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => sendData(reply, await repository.list()));
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const employee = await repository.findById(request.params.id);
    if (!employee) return reply.code(404).send({ error: "employee_not_found" });
    return sendData(reply, employee);
  });
  app.post("/", async (request, reply) => {
    const parsed = createEmployeeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(reply, await repository.create(parsed.data), 201);
  });
}
