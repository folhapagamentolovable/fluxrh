import type { FastifyReply } from "fastify";

export function sendData<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.code(statusCode).send({ data, meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() } });
}
