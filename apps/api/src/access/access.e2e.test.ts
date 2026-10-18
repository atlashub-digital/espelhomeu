import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { accessRoutes, sessionToken } from "../routes/access";
import { AccessService, COOKIE } from "./service";
import { supabaseProvider } from "./provider";
import { memoryStore, startSupabaseStub } from "./testing/fixtures";
import { buildApp } from "../app";
import { loadEnv } from "../env";
const origin = "https://espelho.example.invalid";
const testToken = "synthetic-test-token-at-least-32-characters";
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture() {
  const stub = await startSupabaseStub(); cleanup.push(stub.close);
  let now = Date.now();
  const store = memoryStore();
  const service = new AccessService(store, supabaseProvider(stub.url, "synthetic-service-role"), Buffer.alloc(32, 2), true, () => now);
  const app = Fastify({ logger: false }); cleanup.push(() => app.close());
  await app.register(accessRoutes, { enabled: true, service, origins: [origin], testToken });
  await app.ready();
  const post = (url: string, payload: Record<string, unknown>, cookie?: string, from = origin) => app.inject({ method: "POST", url, payload, headers: { origin: from, ...(cookie ? { cookie } : {}) } });
  async function challenge(method = "otp") {
    const res = await post("/access/challenges", { project: "espelhomeu", channel: "email", method, identifier: "ana@example.invalid" });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(["challenge_id", "resend_after"]);
    const id = res.json().challenge_id;
    const preview = await app.inject({ url: "/access/testing/challenges/" + id, headers: { "x-access-test-token": testToken } });
    return { project: "espelhomeu", challenge_id: id, secret: preview.json().secret };
  }
  return { stub, app, post, challenge, service, advance(ms: number) { now += ms; } };
}
describe("E2E HTTP Access + SDK Supabase contra GoTrue local", () => {
  it("OTP real no adapter, cookie seguro, sessão, logout e replay revogado", async () => {
    const f = await fixture(), c = await f.challenge();
    expect(c.secret).toMatch(/^\d{6}$/);
    const verified = await f.post("/access/challenges/verify", c);
    expect(verified.statusCode).toBe(200);
    const setCookie = String(verified.headers["set-cookie"]);
    expect(setCookie).toContain(COOKIE + "=");
    for (const attr of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=604800", "Path=/"]) expect(setCookie).toContain(attr);
    expect(setCookie).not.toContain("Domain=");
    const cookie = setCookie.split(";")[0];
    expect((await f.app.inject({ url: "/access/session", headers: { cookie } })).json()).toMatchObject({ project: "espelhomeu", verified_contacts: ["email"] });
    for (const result of await Promise.all(Array.from({ length: 4 }, () => f.app.inject({ url: "/access/session", headers: { cookie } })))) expect(result.statusCode).toBe(200);
    expect((await f.post("/access/challenges/verify", c)).statusCode).toBe(401);
    const logout = await f.post("/access/logout", {}, cookie);
    expect(logout.statusCode).toBe(200); expect(logout.headers["set-cookie"]).toContain("Max-Age=0");
    expect((await f.app.inject({ url: "/access/session", headers: { cookie } })).statusCode).toBe(401);
    expect(f.stub.calls).toContain("POST /auth/v1/logout?scope=local");
    expect(f.stub.calls.some(path => path.includes("/otp"))).toBe(false);
  });
  it("Magic Link GET não consome; POST explícito, replay/cross-project negados", async () => {
    const f = await fixture(), c = await f.challenge("magic_link");
    expect((await f.app.inject({ url: "/access/challenges/verify" })).statusCode).toBe(404);
    expect((await f.post("/access/challenges/verify", { ...c, project: "club" })).statusCode).toBe(400);
    expect((await f.post("/access/challenges/verify", { ...c, redirect: "https://evil.invalid" })).statusCode).toBe(400);
    expect((await f.post("/access/challenges/verify", c)).json()).toEqual({ ok: true, redirect: "/biblioteca" });
    expect((await f.post("/access/challenges/verify", c)).statusCode).toBe(401);
  });
  it("OTP expirado e sexta tentativa rejeitados antes do Supabase", async () => {
    const f = await fixture(), expired = await f.challenge(); f.advance(300000);
    expect((await f.post("/access/challenges/verify", expired)).statusCode).toBe(401);
    const c = await f.challenge();
    for (let i = 0; i < 5; i++) expect((await f.post("/access/challenges/verify", { ...c, secret: "bad" })).statusCode).toBe(401);
    expect((await f.post("/access/challenges/verify", c)).statusCode).toBe(401);
    expect(f.stub.calls.filter(v => v === "POST /auth/v1/verify")).toHaveLength(0);
  });
  it("rotação de refresh persiste; revogação remota fecha sessão", async () => {
    const f = await fixture(), c = await f.challenge();
    const res = await f.post("/access/challenges/verify", c); const cookie = String(res.headers["set-cookie"]).split(";")[0];
    f.advance(3600000);
    expect((await f.app.inject({ url: "/access/session", headers: { cookie } })).statusCode).toBe(200);
    expect(f.stub.calls).toContain("POST /auth/v1/token?grant_type=refresh_token");
    f.stub.revokeAll();
    expect((await f.app.inject({ url: "/access/session", headers: { cookie } })).statusCode).toBe(401);
  });
  it("CSRF, fixação, token de teste, recuperação e claim fechado", async () => {
    const f = await fixture(), c = await f.challenge();
    expect((await f.app.inject({ url: "/access/testing/challenges/" + c.challenge_id })).statusCode).toBe(404);
    expect((await f.post("/access/challenges/verify", c, undefined, "https://evil.invalid")).statusCode).toBe(403);
    const first = await f.post("/access/challenges/verify", c); const cookie = String(first.headers["set-cookie"]).split(";")[0];
    const next = await f.challenge(); const second = await f.post("/access/challenges/verify", next, cookie);
    expect(second.statusCode).toBe(200); expect(sessionToken(String(second.headers["set-cookie"]))).not.toBe(sessionToken(cookie));
    expect((await f.app.inject({ url: "/access/session", headers: { cookie } })).statusCode).toBe(401);
    expect((await f.post("/access/logout", {}, cookie, "https://evil.invalid")).statusCode).toBe(403);
    expect((await f.post("/access/recover", { project: "espelhomeu", channel: "email", method: "otp", identifier: "ana@example.invalid" })).statusCode).toBe(200);
    expect((await f.post("/access/aro/claim", { order_id: "forged", entitlement: "ACTIVE" })).statusCode).toBe(409);
  });
  it("flag OFF por defeito e testes impossíveis em produção mesmo com flags true", async () => {
    for (const env of [loadEnv({ NODE_ENV: "test" }), loadEnv({ NODE_ENV: "production", ACCESS_V1_ENABLED: "true", ACCESS_V1_TEST_MODE: "true", ACCESS_V1_TEST_TOKEN: testToken })]) {
      const app = await buildApp(env); cleanup.push(() => app.close());
      const result = await app.inject({ url: "/access/session" });
      expect(result.statusCode).toBe(env.ACCESS_V1_ENABLED ? 503 : 404);
      expect((await app.inject({ url: "/access/testing/challenges/11111111-1111-4111-8111-111111111111", headers: { "x-access-test-token": testToken } })).statusCode).not.toBe(200);
    }
  });
});
