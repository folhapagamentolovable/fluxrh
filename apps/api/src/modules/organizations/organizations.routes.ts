import {
  createCompanySchema,
  createOrganizationUnitSchema,
  updateCompanySchema,
  updateOrganizationUnitSchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import {
  createRequestSupabaseClient,
  getPersistenceMode,
} from "../../shared/supabase.js";
import { normalizePersonalData } from "../../shared/personal-data.js";
import {
  InMemoryOrganizationsRepository,
  type OrganizationsRepository,
} from "./organizations.repository.js";
import { SupabaseOrganizationsRepository } from "./organizations.supabase-repository.js";

const memoryRepository = new InMemoryOrganizationsRepository();

function repositoryFor(authorization?: string): OrganizationsRepository {
  return getPersistenceMode() === "supabase"
    ? new SupabaseOrganizationsRepository(
        createRequestSupabaseClient(authorization),
      )
    : memoryRepository;
}

export async function organizationsRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) =>
    sendData(
      reply,
      await repositoryFor(request.headers.authorization).getSnapshot(),
    ),
  );
  app.post("/companies", async (request, reply) => {
    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(
      reply,
      await repositoryFor(request.headers.authorization).createCompany(
        normalizePersonalData(parsed.data),
      ),
      201,
    );
  });
  app.put<{ Params: { id: string } }>(
    "/companies/:id",
    async (request, reply) => {
      const parsed = updateCompanySchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "validation_error", issues: parsed.error.issues });
      const item = await repositoryFor(
        request.headers.authorization,
      ).updateCompany(request.params.id, normalizePersonalData(parsed.data));
      return item
        ? sendData(reply, item)
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.delete<{ Params: { id: string } }>(
    "/companies/:id",
    async (request, reply) => {
      const deleted = await repositoryFor(
        request.headers.authorization,
      ).deleteCompany(request.params.id);
      return deleted
        ? reply.code(204).send()
        : reply.code(404).send({ error: "not_found" });
    },
  );
  app.post("/units", async (request, reply) => {
    const parsed = createOrganizationUnitSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(
      reply,
      await repositoryFor(request.headers.authorization).createUnit(
        normalizePersonalData(parsed.data),
      ),
      201,
    );
  });
  app.put<{ Params: { id: string } }>("/units/:id", async (request, reply) => {
    const parsed = updateOrganizationUnitSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    const item = await repositoryFor(request.headers.authorization).updateUnit(
      request.params.id,
      normalizePersonalData(parsed.data),
    );
    return item
      ? sendData(reply, item)
      : reply.code(404).send({ error: "not_found" });
  });
  app.delete<{ Params: { id: string } }>(
    "/units/:id",
    async (request, reply) => {
      const deleted = await repositoryFor(
        request.headers.authorization,
      ).deleteUnit(request.params.id);
      return deleted
        ? reply.code(204).send()
        : reply.code(404).send({ error: "not_found" });
    },
  );
}
