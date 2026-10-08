import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { loadEnv } from "./env";

describe("GET /health", () => {
  it("responde ok sem base de dados configurada", async () => {
    const app = await buildApp(loadEnv({ NODE_ENV: "test" }));
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", db: "not_configured" });
    await app.close();
  });

  it("só aceita CORS das origens configuradas", async () => {
    const app = await buildApp(loadEnv({ NODE_ENV: "test", WEB_ORIGINS: "https://espelhomeu.app" }));
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://outro.site" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });
});

describe("POST /waitlist", () => {
  const body = {
    email: "ana@exemplo.pt",
    market: "PT",
    adult: true,
    consent: true,
    consentVersion: "lista-espera-2026-10-08",
  };

  it("rejeita inscrições sem consentimento", async () => {
    const app = await buildApp(loadEnv({ NODE_ENV: "test" }));
    const res = await app.inject({ method: "POST", url: "/waitlist", payload: { ...body, consent: false } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("responde 503 sem base de dados", async () => {
    const app = await buildApp(loadEnv({ NODE_ENV: "test" }));
    const res = await app.inject({ method: "POST", url: "/waitlist", payload: body });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});
