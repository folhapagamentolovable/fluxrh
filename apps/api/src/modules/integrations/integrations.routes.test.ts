import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

const saved = {
  resend: process.env.RESEND_API_KEY,
  from: process.env.RESEND_FROM,
  openUrl: process.env.OPENSIGN_API_URL,
  openToken: process.env.OPENSIGN_API_TOKEN,
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("RESEND_API_KEY", saved.resend);
  restore("RESEND_FROM", saved.from);
  restore("OPENSIGN_API_URL", saved.openUrl);
  restore("OPENSIGN_API_TOKEN", saved.openToken);
});

describe("optional external integrations", () => {
  it("reports providers as disabled without exposing secrets", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    delete process.env.OPENSIGN_API_URL;
    delete process.env.OPENSIGN_API_TOKEN;
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/integrations/status",
    });
    await app.close();
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      email: { provider: "resend", configured: false },
      electronicSignature: { provider: "opensign", configured: false },
      internalMessaging: { provider: "fluxrh", configured: true },
    });
  });

  it("fails safely when optional providers are not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/email/send",
      payload: {
        to: ["teste@example.invalid"],
        subject: "Teste",
        text: "Mensagem fictícia",
      },
    });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "resend_not_configured" });
  });
});
