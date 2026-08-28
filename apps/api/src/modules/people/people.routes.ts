import { createEmployeeDependentSchema, closeTimeCompetenceSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import crypto from "node:crypto";

const dependents = new Map<string, any[]>();
const closures = new Map<string, any>();
export async function peopleRoutes(app: FastifyInstance) {
  app.get<{ Params: { employeeId: string } }>("/:employeeId/dependents", async (req, reply) => sendData(reply, dependents.get(req.params.employeeId) ?? []));
  app.post<{ Params: { employeeId: string } }>("/:employeeId/dependents", async (req, reply) => {
    const parsed = createEmployeeDependentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    const now = new Date().toISOString();
    const value = { id: crypto.randomUUID(), organizationId: "org_flux", ...parsed.data, status: "active", createdAt: now, updatedAt: now };
    dependents.set(req.params.employeeId, [...(dependents.get(req.params.employeeId) ?? []), value]);
    return reply.code(201).send({ data: value });
  });
  app.get("/competences/current", async (_req, reply) => sendData(reply, closures.get("current") ?? { id: "current", organizationId: "org_flux", competence: "2026-08", status: "open", closingProgress: 100, openedAt: new Date().toISOString() }));
  app.post("/competences/close", async (req, reply) => {
    const parsed = closeTimeCompetenceSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    const current = { id: parsed.data.id, organizationId: "org_flux", competence: "2026-08", status: "closed", closingProgress: 100, openedAt: new Date().toISOString(), closedAt: new Date().toISOString(), closedBy: "api", notes: parsed.data.notes };
    closures.set("current", current); return sendData(reply, current);
  });
}
