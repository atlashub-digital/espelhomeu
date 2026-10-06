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
