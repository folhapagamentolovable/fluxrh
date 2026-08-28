import type { FastifyInstance, FastifyRequest } from "fastify";

type RateEntry = { count: number; resetAt: number };

export type ApiSecurityOptions = {
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  allowedOrigins?: string[];
};

const unsafeKeys = new Set(["__proto__", "prototype", "constructor"]);

function hasUnsafeInput(value: unknown): boolean {
  if (typeof value === "string") return value.includes("\0");
  if (Array.isArray(value)) return value.some(hasUnsafeInput);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, nested]) => unsafeKeys.has(key) || hasUnsafeInput(nested),
  );
}

function clientKey(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  return authorization
    ? `${request.ip}:${authorization.slice(-24)}`
    : request.ip;
}

export function registerApiSecurity(
  app: FastifyInstance,
  options: ApiSecurityOptions = {},
) {
  const max = options.rateLimitMax ?? Number(process.env.RATE_LIMIT_MAX ?? 120);
  const windowMs =
    options.rateLimitWindowMs ??
    Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const entries = new Map<string, RateEntry>();

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    const now = Date.now();
    const key = clientKey(request);
    const current = entries.get(key);
    const entry =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    entries.set(key, entry);

    reply.header("X-RateLimit-Limit", max);
    reply.header("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    reply.header("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    if (entry.count > max) {
      reply.header(
        "Retry-After",
        Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      );
      return reply.code(429).send({ error: "rate_limit_exceeded" });
    }

    if (entries.size > 10_000) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= now) entries.delete(entryKey);
      }
    }
  });

  app.addHook("preValidation", async (request, reply) => {
    if (
      hasUnsafeInput(request.body) ||
      hasUnsafeInput(request.query) ||
      hasUnsafeInput(request.params)
    ) {
      return reply.code(400).send({ error: "unsafe_input" });
    }
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    reply.header("Cross-Origin-Resource-Policy", "same-site");
    reply.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
    if (!reply.hasHeader("Cache-Control")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });
}

export function resolveAllowedOrigins(configured?: string[]) {
  if (configured) return configured;
  return (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
