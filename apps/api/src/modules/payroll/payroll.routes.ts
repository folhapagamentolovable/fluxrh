import { resolvePayrollExceptionSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createPersistentModuleRepository } from "../../shared/persistent-module-repository.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryPayrollRepository } from "./payroll.repository.js";
const memoryRepository = new InMemoryPayrollRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase"
  ? createPersistentModuleRepository(createRequestSupabaseClient(authorization), "payroll", () => new InMemoryPayrollRepository())
  : memoryRepository;
export async function payrollRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post<{ Params: { employeeId: string; exceptionId: string } }>(
    "/employees/:employeeId/exceptions/:exceptionId/resolve",
    async (req, reply) => {
      const p = resolvePayrollExceptionSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).resolve(
        req.params.employeeId,
        req.params.exceptionId,
      );
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "exception_not_found" });
    },
  );
  app.post<{ Params: { employeeId: string } }>(
    "/employees/:employeeId/approve",
    async (req, reply) => {
      const value = await repositoryFor(req.headers.authorization).approve(req.params.employeeId);
      return value
        ? sendData(reply, value)
        : reply.code(422).send({ error: "employee_has_open_exceptions" });
    },
  );
  app.post("/close", async (req, reply) => {
    const result = await repositoryFor(req.headers.authorization).close();
    return "error" in result
      ? reply.code(422).send({ error: result.error })
      : sendData(reply, result.data);
  });
}
