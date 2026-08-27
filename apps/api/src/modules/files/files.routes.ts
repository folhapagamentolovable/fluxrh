import {
  completeFileUploadSchema,
  fileAssetFilterSchema,
  fileDownloadQuerySchema,
  prepareFileUploadSchema,
  fileAssetCategorySchema,
  setFileLegalHoldSchema,
  updateFileRetentionPolicySchema,
} from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { createRequestSupabaseClient } from "../../shared/supabase.js";
import { SupabaseFilesRepository } from "./files.repository.js";

const repositoryFor = (authorization?: string) =>
  new SupabaseFilesRepository(createRequestSupabaseClient(authorization));

export async function filesRoutes(app: FastifyInstance) {
  app.get("/retention", async (request, reply) =>
    sendData(
      reply,
      await repositoryFor(request.headers.authorization).retentionPolicies(),
    ),
  );

  app.put<{ Params: { category: string } }>(
    "/retention/:category",
    async (request, reply) => {
      const category = fileAssetCategorySchema.safeParse(
        request.params.category,
      );
      const body = updateFileRetentionPolicySchema.safeParse(request.body);
      if (!category.success || !body.success)
        return reply.code(400).send({ error: "validation_error" });
      return sendData(
        reply,
        await repositoryFor(
          request.headers.authorization,
        ).updateRetentionPolicy(category.data, body.data.retentionDays),
      );
    },
  );

  app.put<{ Params: { id: string } }>(
    "/:id/legal-hold",
    async (request, reply) => {
      const parsed = setFileLegalHoldSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "validation_error", issues: parsed.error.issues });
      const asset = await repositoryFor(
        request.headers.authorization,
      ).setLegalHold(
        request.params.id,
        parsed.data.enabled,
        parsed.data.reason,
      );
      return asset
        ? sendData(reply, asset)
        : reply.code(404).send({ error: "file_asset_not_found" });
    },
  );

  app.get("/", async (request, reply) => {
    const parsed = fileAssetFilterSchema.safeParse(request.query);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(
      reply,
      await repositoryFor(request.headers.authorization).list(parsed.data),
    );
  });

  app.post("/uploads", async (request, reply) => {
    const parsed = prepareFileUploadSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    return sendData(
      reply,
      await repositoryFor(request.headers.authorization).prepare(parsed.data),
      201,
    );
  });

  app.post<{ Params: { id: string } }>(
    "/:id/complete",
    async (request, reply) => {
      const parsed = completeFileUploadSchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "validation_error", issues: parsed.error.issues });
      const asset = await repositoryFor(request.headers.authorization).complete(
        request.params.id,
        parsed.data.checksumSha256,
      );
      return asset
        ? sendData(reply, asset)
        : reply.code(404).send({ error: "file_asset_not_found" });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { expiresIn?: string } }>(
    "/:id/download",
    async (request, reply) => {
      const parsed = fileDownloadQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "validation_error", issues: parsed.error.issues });
      const value = await repositoryFor(
        request.headers.authorization,
      ).signedDownload(request.params.id, parsed.data.expiresIn);
      return value
        ? sendData(reply, value)
        : reply.code(404).send({ error: "file_asset_not_found" });
    },
  );

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const value = await repositoryFor(request.headers.authorization).remove(
      request.params.id,
    );
    return value
      ? sendData(reply, value)
      : reply.code(404).send({ error: "file_asset_not_found" });
  });
}
