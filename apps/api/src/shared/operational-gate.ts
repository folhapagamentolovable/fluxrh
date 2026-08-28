import type { FastifyInstance } from "fastify";
import { createRequestSupabaseClient, getPersistenceMode } from "./supabase.js";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function registerOperationalGate(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (
      getPersistenceMode() !== "supabase" ||
      !request.url.startsWith("/api/") ||
      !mutatingMethods.has(request.method)
    ) {
      return;
    }

    try {
      const client = createRequestSupabaseClient(request.headers.authorization);
      const { data, error } = await client.rpc("can_execute_real_operations");

      if (error) {
        request.log.error({ err: error }, "operational_gate_lookup_failed");
        return reply.code(503).send({ error: "operational_gate_unavailable" });
      }

      if (data !== true) {
        return reply.code(403).send({ error: "super_admin_required_for_real_operations" });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "authentication_required") {
        return reply.code(401).send({ error: "authentication_required" });
      }
      request.log.error({ err: error }, "operational_gate_failed");
      return reply.code(503).send({ error: "operational_gate_unavailable" });
    }
  });
}
