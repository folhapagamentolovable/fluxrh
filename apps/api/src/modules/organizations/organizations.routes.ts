import { createCompanySchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createRequestSupabaseClient, getPersistenceMode } from "../../shared/supabase.js";
import { InMemoryOrganizationsRepository, type OrganizationsRepository } from "./organizations.repository.js";
import { SupabaseOrganizationsRepository } from "./organizations.supabase-repository.js";

const memoryRepository = new InMemoryOrganizationsRepository();

function repositoryFor(authorization?: string): OrganizationsRepository {
  return getPersistenceMode() === "supabase"
    ? new SupabaseOrganizationsRepository(createRequestSupabaseClient(authorization))
    : memoryRepository;
}

export async function organizationsRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => sendData(reply, await repositoryFor(request.headers.authorization).getSnapshot()));
  app.post("/companies", async (request, reply) => {
    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(reply, await repositoryFor(request.headers.authorization).createCompany(parsed.data), 201);
  });
}
