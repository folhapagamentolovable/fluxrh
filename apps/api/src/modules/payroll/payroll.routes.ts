import { processPayrollSchema, resolvePayrollExceptionSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryPayrollRepository } from "./payroll.repository.js";
import { SupabasePayrollRepository } from "./payroll.supabase-repository.js";
const memoryRepository = new InMemoryPayrollRepository();
const repositoryFor = (authorization?: string) => getPersistenceMode() === "supabase"
  ? new SupabasePayrollRepository(createRequestSupabaseClient(authorization))
  : memoryRepository;
export async function payrollRoutes(app: FastifyInstance) {
  app.get("/overview", async (req, reply) =>
    sendData(reply, await repositoryFor(req.headers.authorization).overview()),
  );
  app.post("/process", async (req, reply) => {
    const parsed = processPayrollSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    const repository = repositoryFor(req.headers.authorization);
    if (!(repository instanceof SupabasePayrollRepository)) return sendData(reply, await repository.overview());
    try { return sendData(reply, await repository.process(parsed.data.competence)); }
    catch (error) {
      const message = error instanceof Error ? error.message : "payroll_process_failed";
      const status = message.includes("not_closed") ? 409 : 422;
      return reply.code(status).send({ error: message });
    }
  });
  app.post<{ Params: { employeeId: string; exceptionId: string } }>(
    "/employees/:employeeId/exceptions/:exceptionId/resolve",
    async (req, reply) => {
      const p = resolvePayrollExceptionSchema.safeParse(req.body);
      if (!p.success)
        return reply.code(400).send({ error: "validation_error" });
      const value = await repositoryFor(req.headers.authorization).resolve(
        req.params.employeeId,
        req.params.exceptionId,
        p.data.note,
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
