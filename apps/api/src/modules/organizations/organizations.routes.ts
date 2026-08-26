import { createCompanySchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { InMemoryOrganizationsRepository } from "./organizations.repository.js";

const repository = new InMemoryOrganizationsRepository();

export async function organizationsRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => sendData(reply, await repository.getSnapshot()));
  app.post("/companies", async (request, reply) => {
    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(reply, await repository.createCompany(parsed.data), 201);
  });
}
