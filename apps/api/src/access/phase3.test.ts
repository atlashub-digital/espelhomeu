import { afterEach, describe, expect, it, vi } from "vitest";
import { SMTPServer } from "smtp-server";
import nodemailer from "nodemailer";
import Fastify from "fastify";
import { loadEnv } from "../env";
import { transport, type Delivery } from "./transport";
import { AccessService } from "./service";
import { remoteAroClaim } from "./claim";
import { memoryStore, startSupabaseStub } from "./testing/fixtures";
import { supabaseProvider } from "./provider";
import { accessRoutes } from "../routes/access";
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.unstubAllGlobals(); for (const f of cleanup.splice(0).reverse()) await f(); });
const message: Delivery = { channel: "email", identifier: "test@example.invalid", method: "otp", secret: "123456", challengeId: "11111111-1111-4111-8111-111111111111" };
const config = { ACCESS_V1_EMAIL_TRANSPORT: "live", ACCESS_V1_WA_TRANSPORT: "live", ACCESS_V1_EMAIL_ALLOWLIST: message.identifier, ACCESS_V1_WA_ALLOWLIST: "+351910000000", ATENDIMENTO_EVOLUTION_KEY: "test-only", ACCESS_V1_SMTP_HOST: "localhost", HOSTINGER_EMAIL_TOKEN: "test-only" };
describe("transportes transacionais com gates", () => {
  it("SMTP fake recebe remetente, código e link, sem marketing", async () => {
    const mail: string[] = [];
    const server = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS"], onData(stream, _session, callback) { let data = ""; stream.on("data", chunk => { data += chunk; }); stream.on("end", () => { mail.push(data); callback(); }); } });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    cleanup.push(() => new Promise<void>(resolve => server.close(resolve)));
    const port = (server.server.address() as { port: number }).port;
    const smtp = nodemailer.createTransport({ host: "127.0.0.1", port, secure: false, ignoreTLS: true });
    const sender = transport(loadEnv(config), smtp);
    await sender.send(message);
    await sender.send({ ...message, method: "magic_link" });
    expect(mail).toHaveLength(2);
    expect(mail[0]).toContain("contact@atlashub.si"); expect(mail[0]).toContain("123456");
    expect(mail[1]).toContain("access_challenge");
  });
  it.each([{}, { ...config, ACCESS_V1_EMAIL_ALLOWLIST: "" }, { ...config, NODE_ENV: "production" }])("nega envio sem gates %j", async env => {
    const sendMail = vi.fn();
    await expect(transport(loadEnv(env), { sendMail } as never).send(message)).rejects.toThrow();
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("production exige ambos os gates; preview exige allowlist", async () => {
    const sendMail = vi.fn(async () => ({ accepted: [message.identifier], rejected: [] }));
    await transport(loadEnv({ ...config, NODE_ENV: "production", ACCESS_V1_LIVE_ENABLED: "true" }), { sendMail } as never).send(message);
    expect(sendMail).toHaveBeenCalledOnce();
  });
  it.each(["https://evolution.example.invalid", "https://evolution.example.invalid/"])("Evolution usa URL configurada %s e mantém o pedido", async url => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "PENDING" })));
    vi.stubGlobal("fetch", fetcher);
    await transport(loadEnv({ ...config, ATENDIMENTO_EVOLUTION_URL: url })).send({ ...message, channel: "whatsapp", identifier: "+351910000000" });
    expect(fetcher).toHaveBeenCalledWith("https://evolution.example.invalid/message/sendText/atlashub-wa", expect.objectContaining({
      method: "POST", headers: { apikey: "test-only", "content-type": "application/json" },
      body: expect.stringContaining('"number":"351910000000"'), redirect: "error", signal: expect.any(AbortSignal),
    }));
  });
  it("Evolution 2.3.7 usa apenas atlashub-wa, E.164 sem + e feedback fail-closed", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "PENDING" })));
    vi.stubGlobal("fetch", fetcher);
    const sender = transport(loadEnv(config));
    await sender.send({ ...message, channel: "whatsapp", identifier: "+351910000000" });
    expect(fetcher.mock.calls[0]).toMatchObject(["http://atendimento-evolution:8080/message/sendText/atlashub-wa", { body: expect.stringContaining('"number":"351910000000"'), redirect: "error" }]);
    fetcher.mockResolvedValue(new Response(JSON.stringify({ status: "ERROR" })));
    await expect(sender.send({ ...message, channel: "whatsapp", identifier: "+351910000000" })).rejects.toThrow();
    fetcher.mockResolvedValue(new Response("", { status: 503 }));
    await expect(sender.send({ ...message, channel: "whatsapp", identifier: "+351910000000" })).rejects.toThrow();
  });
});
async function fixture(fail = false) {
  const stub = await startSupabaseStub(); cleanup.push(stub.close);
  const store = memoryStore(); let now = Date.now();
  const messages: Delivery[] = [];
  const send = vi.fn(async (m: Delivery) => { if (fail) throw new Error("offline"); messages.push(m); });
  const service = new AccessService(store, supabaseProvider(stub.url, "test"), Buffer.alloc(32, 7), true, () => now, { send });
  return { service, store, send, messages, advance(ms: number) { now += ms; } };
}
describe("posse do canal, cooldown, auditoria e circuit breaker", () => {
  it("reenvio concorrente mantém challenge; após 60s pode pedir outro", async () => {
    const f = await fixture();
    const results = await Promise.all(Array.from({ length: 5 }, () => f.service.challenge(message.identifier, "otp", "ip")));
    expect(new Set(results.map(r => r.challenge_id)).size).toBe(1); expect(f.send).toHaveBeenCalledOnce();
    f.advance(60000); const resent = await f.service.challenge(message.identifier, "otp", "ip"); expect(resent.challenge_id).toBe(results[0]!.challenge_id); expect(f.send).toHaveBeenCalledTimes(2); expect(f.messages[1]!.secret).toBe(f.messages[0]!.secret);
    const raw = JSON.stringify([...f.store.records]); expect(raw).not.toContain(message.identifier); expect(raw).not.toContain(f.messages[0]!.secret);
    expect([...f.store.records.values()].filter(v => v.result === "accepted")).toHaveLength(2);
  });
  it("falha de envio nunca persiste challenge; terceira falha abre breaker", async () => {
    const f = await fixture(true);
    for (let i = 0; i < 4; i++) {
      const r = await f.service.challenge(`test${i}@example.invalid`, "otp", "ip");
      expect(await f.service.previewSecret(r.challenge_id)).toBeNull();
    }
    expect(f.send).toHaveBeenCalledTimes(3);
    expect([...f.store.records.values()].some(v => v.tokens)).toBe(false);
    f.advance(60000); await f.service.challenge("retry@example.invalid", "otp", "ip"); expect(f.send).toHaveBeenCalledTimes(4);
  });
  it.each(["otp", "magic_link"] as const)("WA %s prova só o telefone e suporta opt-out e revogação", async method => {
    const f = await fixture();
    const c = await f.service.challenge("+351910000000", method, "ip", "whatsapp");
    expect(await f.service.verify(c.challenge_id, f.messages[0]!.secret, "other")).toBeNull();
    const token = (await f.service.verify(c.challenge_id, f.messages[0]!.secret, "espelhomeu"))!;
    expect((await f.service.session(token))?.verified_contacts).toEqual(["whatsapp"]);
    expect(await f.service.verify(c.challenge_id, f.messages[0]!.secret, "espelhomeu")).toBeNull();
    expect(await f.service.optOut(token)).toBe(true);
    f.advance(60000); await f.service.challenge("+351910000000", method, "ip", "whatsapp"); expect(f.send).toHaveBeenCalledOnce();
    await f.service.logout(token); expect(await f.service.session(token)).toBeNull();
  });
  it("limite próprio por número permanece mesmo com IPs diferentes", async () => {
    const f = await fixture();
    for (let i = 0; i < 4; i++) expect(await f.service.rate("ip" + i, "+351910000000")).toBe(i < 3);
  });
});
describe("consumidor HTTP hosted ARO → sessão verificada → Reader", () => {
  it("APPROVED/ACTIVE autoriza; revogação, replay, outro tenant e provas inválidas negam", async () => {
    const f = await fixture();
    const aro = Fastify({ logger: false }); cleanup.push(() => aro.close());
    let status = "APPROVED", entitlement = "ACTIVE";
    const orderId = "22222222-2222-4222-8222-222222222222", checkoutSessionId = "33333333-3333-4333-8333-333333333333";
    aro.post<{ Body: { proof: string; principalId: string; project: string } }>("/claim", async (req, reply) => {
      if (req.headers.authorization !== "Bearer scoped-test-key" || req.body.proof !== "valid".repeat(8) || status !== "APPROVED" || entitlement !== "ACTIVE") return reply.code(409).send({});
      return { project: req.body.project, principalId: req.body.principalId, orderId, checkoutSessionId, aroCustomerId: "44444444-4444-4444-8444-444444444444", offerId: "p01", issuedAt: Date.now(), expiresAt: Date.now() + 120000, orderStatus: status, entitlementStatus: entitlement };
    });
    aro.get("/v1/orders/:id", async () => ({ project: "espelhomeu", id: orderId, customer_id: "44444444-4444-4444-8444-444444444444", status }));
    aro.post("/v1/entitlements/resolve", async () => ({ project: "espelhomeu", customer_id: "44444444-4444-4444-8444-444444444444", entitlements: [{ key: "espelhomeu:p01", status: entitlement, source_order_id: orderId, starts_at: new Date(0).toISOString() }] }));
    const url = await aro.listen({ host: "127.0.0.1", port: 0 });
    const adapter = remoteAroClaim(url + "/claim", "scoped-test-key");
    const app = Fastify(); cleanup.push(() => app.close());
    await app.register(accessRoutes, { enabled: true, origins: ["https://test.invalid"], service: f.service, aroClaim: adapter });
    const c = await f.service.challenge(message.identifier, "otp", "ip");
    const token = (await f.service.verify(c.challenge_id, f.messages[0]!.secret, "espelhomeu"))!;
    const headers = { origin: "https://test.invalid", cookie: "__Host-espelho_access=" + token };
    const proof = { project: "espelhomeu" as const, orderId, checkoutSessionId, offerId: "p01", proof: "valid".repeat(8) };
    const post = (payload = proof) => app.inject({ method: "POST", url: "/access/aro/claim", headers, payload });
    expect((await post()).statusCode).toBe(200);
    expect(await f.service.products(token, adapter)).toEqual(["p01"]);
    expect((await post()).statusCode).toBe(409);
    for (const denied of ["PENDING", "REFUNDED", "REVOKED"]) { status = denied; expect(await f.service.products(token, adapter)).toEqual([]); }
    status = "APPROVED"; entitlement = "REVOKED"; expect(await f.service.products(token, adapter)).toEqual([]);
    entitlement = "ACTIVE";
    expect((await post({ ...proof, project: "other" as "espelhomeu" })).statusCode).toBe(400);
    for (const invalid of ["expired", "forged", "foreign-session"]) expect((await post({ ...proof, proof: invalid.repeat(8) })).statusCode).toBe(409);
    await f.service.logout(token); expect(await f.service.products(token, adapter)).toEqual([]);
  });
});

it("claim valida TTL <=120s, sessão/pedido/oferta/principal/tenant e estado atuais", async () => {
  const proof = { project: "espelhomeu" as const, orderId: "order", checkoutSessionId: "checkout", offerId: "p01", proof: "opaque" };
  const good = { ...proof, principalId: "principal", aroCustomerId: "customer", issuedAt: 1000, expiresAt: 121000, orderStatus: "APPROVED", entitlementStatus: "ACTIVE" };
  const fetcher = vi.fn(async () => new Response(JSON.stringify(good)));
  vi.stubGlobal("fetch", fetcher);
  const adapter = remoteAroClaim("https://aro.example.invalid/claim", "scoped", () => 2000);
  expect(await adapter.claim(proof, "principal")).not.toBeNull();
  for (const bad of [{ expiresAt: 2000 }, { expiresAt: 121001 }, { issuedAt: 2001 }, { project: "club" }, { orderId: "other" }, { checkoutSessionId: "other" }, { offerId: "other" }, { principalId: "other" }, { orderStatus: "PENDING" }, { orderStatus: "REFUNDED" }, { entitlementStatus: "REVOKED" }]) {
    fetcher.mockImplementation(async () => new Response(JSON.stringify({ ...good, ...bad })));
    expect(await adapter.claim(proof, "principal")).toBeNull();
  }
});
it("corrida da claim serializa consumo local e mantém um único binding", async () => {
  const f = await fixture();
  const c = await f.service.challenge(message.identifier, "otp", "ip");
  const token = (await f.service.verify(c.challenge_id, f.messages[0]!.secret, "espelhomeu"))!;
  const proof = { project: "espelhomeu" as const, orderId: "order", checkoutSessionId: "checkout", offerId: "p01", proof: "same-proof" };
  const claim = vi.fn(async () => ({ ...proof, principalId: "11111111-1111-4111-8111-111111111111", aroCustomerId: "customer", expiresAt: Date.now() + 120000 }));
  const results = await Promise.all(Array.from({ length: 5 }, () => f.service.claim(token, proof, { claim })));
  expect(results.filter(Boolean)).toHaveLength(1); expect(claim).toHaveBeenCalledOnce();
});

it("WA mantém gates OFF/allowlist/produção antes de qualquer HTTP", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "PENDING" })));
  vi.stubGlobal("fetch", fetcher);
  const wa: Delivery = { ...message, channel: "whatsapp", identifier: "+351910000000" };
  for (const env of [{}, { ...config, ACCESS_V1_WA_ALLOWLIST: "" }, { ...config, NODE_ENV: "production" }]) {
    await expect(transport(loadEnv(env)).send(wa)).rejects.toThrow();
  }
  expect(fetcher).not.toHaveBeenCalled();
  await transport(loadEnv({ ...config, NODE_ENV: "production", ACCESS_V1_LIVE_ENABLED: "true" })).send(wa);
  expect(fetcher).toHaveBeenCalledOnce();
});
it.each(["otp", "magic_link"] as const)("WA %s expirado ou forjado nunca cria sessão", async method => {
  const f = await fixture();
  const c = await f.service.challenge("+351910000000", method, "ip", "whatsapp");
  expect(await f.service.verify(c.challenge_id, "forged", "espelhomeu")).toBeNull();
  f.advance(method === "otp" ? 300000 : 600000);
  expect(await f.service.verify(c.challenge_id, f.messages[0]!.secret, "espelhomeu")).toBeNull();
  expect([...f.store.records.keys()].some(k => k.startsWith("session:"))).toBe(false);
});

describe("Resend HTTPS com gates e política de reenvio", () => {
  const resend = { ...config, ACCESS_V1_EMAIL_PROVIDER: "resend", RESEND_API_KEY: "synthetic-only" };
  it.each(["otp", "magic_link"] as const)("envia %s com mensagem idêntica ao SMTP e tag transacional", async method => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "synthetic-email" })));
    vi.stubGlobal("fetch", fetcher);
    const sendMail = vi.fn(async () => ({ accepted: [message.identifier], rejected: [] }));
    const delivery = { ...message, method };
    await transport(loadEnv(config), { sendMail } as never).send(delivery);
    await transport(loadEnv(resend)).send(delivery);
    expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST", redirect: "error", signal: expect.any(AbortSignal),
      headers: { authorization: "Bearer synthetic-only", "content-type": "application/json" },
    }));
    const body = JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({
      from: "contact@atlashub.si", to: [message.identifier],
      subject: "Confirmar entrada — Atlas Access",
      text: (sendMail.mock.calls[0] as unknown as [{ text: string }])[0].text,
      tags: [{ name: "category", value: "atlas-access" }],
    });
  });
  it("nega sem key, OFF, fora da allowlist ou production sem LIVE antes do HTTP", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const env of [
      { ...resend, RESEND_API_KEY: "" },
      { ...resend, ACCESS_V1_EMAIL_TRANSPORT: "off" },
      { ...resend, ACCESS_V1_EMAIL_ALLOWLIST: "" },
      { ...resend, NODE_ENV: "production" },
    ]) await expect(transport(loadEnv(env)).send(message)).rejects.toThrow("delivery_disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("5xx, resposta inválida e falha de rede tornam-se delivery_failed", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const sender = transport(loadEnv(resend));
    await expect(sender.send(message)).rejects.toThrow("delivery_failed");
    fetcher.mockResolvedValue(new Response("{}"));
    await expect(sender.send(message)).rejects.toThrow("delivery_failed");
    fetcher.mockRejectedValue(new Error("network"));
    await expect(sender.send(message)).rejects.toThrow("delivery_failed");
  });
  it("production com LIVE permite; concorrência/cooldown mantêm um só envio e o mesmo segredo", async () => {
    const stub = await startSupabaseStub(); cleanup.push(stub.close);
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => new Response(JSON.stringify({ id: "synthetic-email" })));
    vi.stubGlobal("fetch", fetcher);
    let now = Date.now();
    const sender = transport(loadEnv({ ...resend, NODE_ENV: "production", ACCESS_V1_LIVE_ENABLED: "true" }));
    const service = new AccessService(memoryStore(), supabaseProvider(stub.url, "test"), Buffer.alloc(32, 7), true, () => now, sender);
    // Email identity generation uses the local GoTrue HTTP stub.
    vi.unstubAllGlobals();
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn((input: Parameters<typeof fetch>[0], init?: RequestInit) =>
      input === "https://api.resend.com/emails" ? fetcher(input, init) : nativeFetch(input, init)));
    const results = await Promise.all(Array.from({ length: 5 }, () => service.challenge(message.identifier, "otp", "ip")));
    expect(new Set(results.map(r => r.challenge_id)).size).toBe(1);
    expect(fetcher).toHaveBeenCalledOnce();
    now += 60000;
    expect((await service.challenge(message.identifier, "otp", "ip")).challenge_id).toBe(results[0]!.challenge_id);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]![1]!.body).toBe(fetcher.mock.calls[0]![1]!.body);
  });
});

it("bind E7 exige sessão OTP, prova de checkout e ARO atual; falhas não gravam binding", async () => {
  const f = await fixture();
  const orderId = "22222222-2222-4222-8222-222222222222", id = "33333333-3333-4333-8333-333333333333", customer = "44444444-4444-4444-8444-444444444444";
  const capability = { id, orderId, checkoutSecret: "checkout-possession-secret" };
  let state = "APPROVED", status = "ACTIVE", project = "espelhomeu", source = orderId;
  const aro = Fastify({ logger: false }); cleanup.push(() => aro.close());
  aro.get("/v1/checkout-sessions/:id", async (req, reply) => req.headers["x-aro-checkout-secret"] === capability.checkoutSecret ? { id, order_id: orderId, project, state, offer: "p01-br", amount: { amount_minor: 1190, currency: "BRL" } } : reply.code(401).send({}));
  aro.get("/v1/orders/:id", async req => {
    expect(req.headers.authorization).toBe("Bearer scoped-test-key");
    return { id: orderId, project, status: state, customer_id: customer };
  });
  aro.post("/v1/entitlements/resolve", async () => ({ project, customer_id: customer, entitlements: [{ key: "espelhomeu:p01", status, source_order_id: source, starts_at: new Date(0).toISOString() }] }));
  const url = await aro.listen({ host: "127.0.0.1", port: 0 });
  const adapter = remoteAroClaim(url + "/claim", "scoped-test-key");
  const app = Fastify(); cleanup.push(() => app.close());
  await app.register(accessRoutes, { enabled: true, origins: ["https://test.invalid"], service: f.service, aroClaim: adapter });
  let cookie = "";
  const post = (payload = capability) => app.inject({ method: "POST", url: "/access/bind", headers: { origin: "https://test.invalid", cookie }, payload });
  expect((await post()).statusCode).toBe(401);
  const c = await f.service.challenge(message.identifier, "otp", "ip");
  expect((await post()).statusCode).toBe(401); // Typed contact and challenge do not prove possession.
  const token = (await f.service.verify(c.challenge_id, f.messages[0]!.secret, "espelhomeu"))!;
  cookie = "__Host-espelho_access=" + token;
  expect((await post({ ...capability, checkoutSecret: "forged-checkout-secret" })).statusCode).toBe(409);
  for (const denied of ["PENDING", "REFUNDED", "EXPIRED"]) { state = denied; expect((await post()).statusCode).toBe(409); }
  state = "APPROVED"; project = "club"; expect((await post()).statusCode).toBe(409);
  project = "espelhomeu"; source = id; expect((await post()).statusCode).toBe(409);
  source = orderId; status = "REVOKED"; expect((await post()).statusCode).toBe(409);
  expect([...f.store.records.keys()].some(k => k.startsWith("binding:"))).toBe(false);
  status = "ACTIVE";
  expect((await post()).statusCode).toBe(200);
  expect(await f.service.products(token, adapter)).toEqual(["p01"]);
  expect(JSON.stringify([...f.store.records])).not.toContain(capability.checkoutSecret);
  for (const revoked of ["EXPIRED", "REFUNDED", "REVOKED"]) { status = revoked; expect(await f.service.products(token, adapter)).toEqual([]); }
});
