import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("API security baseline", () => {
  it("adds defensive headers and disables response caching", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    });
    expect(response.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
  });

  it("allows configured origins and rejects unknown origins", async () => {
    const app = buildApp({ allowedOrigins: ["https://app.fluxrh.example"] });
    apps.push(app);
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/files/",
      headers: {
        origin: "https://app.fluxrh.example",
        "access-control-request-method": "GET",
      },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://app.fluxrh.example",
    );

    const denied = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/files/",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "GET",
      },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("limits repeated API requests per client", async () => {
    const app = buildApp({ rateLimitMax: 2, rateLimitWindowMs: 60_000 });
    apps.push(app);
    const first = await app.inject({
      method: "GET",
      url: "/api/v1/operations/dashboard",
    });
    const second = await app.inject({
      method: "GET",
      url: "/api/v1/operations/dashboard",
    });
    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/operations/dashboard",
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: "rate_limit_exceeded" });
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("rejects null-byte and prototype-pollution payloads", async () => {
    const app = buildApp();
    apps.push(app);
    const nullByte = await app.inject({
      method: "POST",
      url: "/api/v1/files/uploads",
      payload: {
        category: "documents",
        originalName: "invoice\0.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
      },
    });
    expect(nullByte.statusCode).toBe(400);
    expect(nullByte.json()).toEqual({ error: "unsafe_input" });

    const pollution = await app.inject({
      method: "POST",
      url: "/api/v1/files/uploads",
      payload: JSON.parse(
        '{"category":"documents","__proto__":{"admin":true}}',
      ),
    });
    expect(pollution.statusCode).toBe(400);
    expect(pollution.json().code).toBe("FST_ERR_CTP_INVALID_JSON_BODY");
  });

  it("rejects bodies larger than the API metadata limit", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/files/uploads",
      payload: { value: "x".repeat(1_100_000) },
    });
    expect(response.statusCode).toBe(413);
  });

  it("rejects spoofed extensions before contacting Storage", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/files/uploads",
      payload: {
        category: "documents",
        originalName: "malware.exe",
        mimeType: "application/pdf",
        sizeBytes: 100,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("validation_error");
    expect(response.json().issues[0].path).toEqual(["originalName"]);
  });
});
