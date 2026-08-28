import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendData } from "../../shared/http.js";

const emailSchema = z.object({
  to: z.array(z.string().email()).min(1).max(50),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(100000),
  idempotencyKey: z.string().max(256).optional(),
});
const signatureSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});
const configured = (name: string) => Boolean(process.env[name]?.trim());

export async function integrationsRoutes(app: FastifyInstance) {
  app.get("/status", async (_req, reply) =>
    sendData(reply, {
      email: {
        provider: "resend",
        configured: configured("RESEND_API_KEY") && configured("RESEND_FROM"),
      },
      electronicSignature: {
        provider: "opensign",
        configured:
          configured("OPENSIGN_API_URL") && configured("OPENSIGN_API_TOKEN"),
      },
      internalMessaging: { provider: "fluxrh", configured: true },
    }),
  );
  app.post("/email/send", async (req, reply) => {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    const key = process.env.RESEND_API_KEY,
      from = process.env.RESEND_FROM;
    if (!key || !from)
      return reply.code(503).send({ error: "resend_not_configured" });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(parsed.data.idempotencyKey
          ? { "Idempotency-Key": parsed.data.idempotencyKey }
          : {}),
      },
      body: JSON.stringify({
        from,
        to: parsed.data.to,
        subject: parsed.data.subject,
        text: parsed.data.text,
      }),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? sendData(reply, String((body as { id?: unknown }).id ?? "sent"), 201)
      : reply
          .code(502)
          .send({
            error: "resend_delivery_failed",
            providerStatus: response.status,
          });
  });
  app.post("/signatures", async (req, reply) => {
    const parsed = signatureSchema.safeParse(req.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "validation_error", issues: parsed.error.issues });
    const base = process.env.OPENSIGN_API_URL?.replace(/\/$/, ""),
      token = process.env.OPENSIGN_API_TOKEN;
    if (!base || !token)
      return reply.code(503).send({ error: "opensign_not_configured" });
    const response = await fetch(`${base}/createdocument`, {
      method: "POST",
      headers: { "x-api-token": token, "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data.payload),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? sendData(reply, true, 201)
      : reply
          .code(502)
          .send({
            error: "opensign_request_failed",
            providerStatus: response.status,
          });
  });
}
