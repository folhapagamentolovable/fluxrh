import { describe, expect, it } from "vitest";
import { InMemoryCommunicationsRepository } from "./communications.repository.js";
const event = {
  recipientId: "emp_test",
  recipientName: "Pessoa Teste",
  title: "Documento pendente",
  message: "Envie o documento solicitado.",
  priority: "important" as const,
  source: "document" as const,
  eventKey: "document.pending:test:emp_test",
};
describe("communications", () => {
  it("deduplicates the same event for the same recipient", async () => {
    const repo = new InMemoryCommunicationsRepository();
    expect((await repo.emit(event)).duplicate).toBe(false);
    expect((await repo.emit(event)).duplicate).toBe(true);
  });
  it("records acknowledgement evidence", async () => {
    const repo = new InMemoryCommunicationsRepository();
    const created = (
      await repo.emit({ ...event, eventKey: `${event.eventKey}:ack` })
    ).data;
    const value = await repo.acknowledge(created.id);
    expect(value?.status).toBe("acknowledged");
    expect(value?.acknowledgedAt).toBeTruthy();
  });
  it("creates scheduled announcements", async () => {
    const repo = new InMemoryCommunicationsRepository();
    const value = await repo.createAnnouncement({
      title: "Aviso programado",
      message: "Mensagem para toda a equipe.",
      audience: "Todos os colaboradores",
      priority: "informational",
      requiresAcknowledgement: false,
      scheduledAt: "2026-09-01T08:00:00.000Z",
    });
    expect(value.status).toBe("scheduled");
  });
});
