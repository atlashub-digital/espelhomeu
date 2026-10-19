import Fastify from "fastify";
import { SMTPServer } from "smtp-server";
import nodemailer from "nodemailer";
import { AccessService } from "../src/access/service";
import { supabaseProvider } from "../src/access/provider";
import { memoryStore, startSupabaseStub } from "../src/access/testing/fixtures";
import { accessRoutes } from "../src/routes/access";
import { transport } from "../src/access/transport";
import { remoteAroClaim } from "../src/access/claim";
import { loadEnv } from "../src/env";
if (process.env.NODE_ENV !== "test") throw new Error("test_only");
const liveResend = process.env.ACCESS_TEST_REAL_RESEND === "true";
if (liveResend && !process.env.RESEND_API_KEY) throw new Error("resend_key_required");
const emailIds = new Map<string, string>();
let sendCount = 0;
const stub = await startSupabaseStub(!!process.env.RECOVERY_ARO_URL);
const smtp = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS"], onData(stream, _s, cb) { stream.resume(); stream.on("end", cb); } });
await new Promise<void>(resolve => smtp.listen(0, "127.0.0.1", resolve));
const smtpPort = (smtp.server.address() as { port: number }).port;
const wa = Fastify({ logger: false });
const deliveredEmails = new Map<string, string>();
wa.post<{ Body: { to: string[]; text: string } }>("/emails", async (req, reply) => {
  if (req.headers.authorization !== "Bearer synthetic-resend-key") return reply.code(401).send({});
  deliveredEmails.set(req.body.to[0]!, req.body.text);
  return { id: "synthetic-resend-message" };
});
wa.post("/message/sendText/atlashub-wa", async () => ({ status: "PENDING" }));
const waUrl = await wa.listen({ host: "127.0.0.1", port: 0 });
const realFetch = globalThis.fetch;
globalThis.fetch = ((input, init) => {
  const url = String(input);
  if (process.env.RECOVERY_ARO_URL && url === "https://api.resend.com/emails") {
    if (!liveResend) return realFetch(waUrl + "/emails", init);
    const payload = JSON.parse(String(init?.body));
    if (++sendCount > 2 || payload.to.length !== 1 || payload.to[0] !== "atlashub.digital@gmail.com") throw new Error("live_send_gate");
    return realFetch(input, init).then(async response => {
      if (response.ok) emailIds.set(payload.to[0], (await response.clone().json()).id);
      return response;
    });
  }
  return realFetch(url.startsWith("http://atendimento-evolution:8080/") ? url.replace("http://atendimento-evolution:8080", waUrl) : input, init);
}) as typeof fetch;
const aro = Fastify({ logger: false });
let status = "APPROVED";
const orderId = "22222222-2222-4222-8222-222222222222", checkoutSessionId = "33333333-3333-4333-8333-333333333333";
let consumed = false;
aro.post<{ Body: { proof: string; principalId: string } }>("/claim", async (req, reply) => {
  if (consumed || req.body.proof !== "synthetic-hosted-claim-proof-at-least-32" || status !== "APPROVED" || req.headers.authorization !== "Bearer synthetic-scoped-server-key") return reply.code(409).send({});
  consumed = true;
  const issuedAt = Date.now();
  return { project: "espelhomeu", principalId: req.body.principalId, orderId, checkoutSessionId, aroCustomerId: "44444444-4444-4444-8444-444444444444", offerId: "p01", issuedAt, expiresAt: issuedAt + 120000, orderStatus: status, entitlementStatus: "ACTIVE" };
});
aro.get("/v1/orders/:id", async () => ({ project: "espelhomeu", id: orderId, customer_id: "44444444-4444-4444-8444-444444444444", status }));
aro.post("/v1/entitlements/resolve", async () => ({ project: "espelhomeu", customer_id: "44444444-4444-4444-8444-444444444444", entitlements: [{ key: "espelhomeu:p01", status: status === "APPROVED" ? "ACTIVE" : "REVOKED", source_order_id: orderId, starts_at: new Date(0).toISOString() }] }));
const aroUrl = await aro.listen({ host: "127.0.0.1", port: 0 });
const app = Fastify({ logger: false });
const testToken = "synthetic-browser-test-token-32-chars";
const sender = transport(loadEnv({ NODE_ENV: "test", ACCESS_V1_EMAIL_PROVIDER: process.env.RECOVERY_ARO_URL ? "resend" : "smtp", RESEND_API_KEY: liveResend ? process.env.RESEND_API_KEY : "synthetic-resend-key", ACCESS_V1_EMAIL_TRANSPORT: "live", ACCESS_V1_WA_TRANSPORT: "live", ACCESS_V1_EMAIL_ALLOWLIST: liveResend ? "atlashub.digital@gmail.com" : "browser@example.invalid,link@example.invalid", ACCESS_V1_WA_ALLOWLIST: "+351910000000", ACCESS_V1_SMTP_HOST: "127.0.0.1", HOSTINGER_EMAIL_TOKEN: "synthetic", ATENDIMENTO_EVOLUTION_KEY: "synthetic" }), nodemailer.createTransport({ host: "127.0.0.1", port: smtpPort, secure: false, ignoreTLS: true }));
let clockOffset = 0;
const service = new AccessService(memoryStore(), supabaseProvider(stub.url, "synthetic-service-role"), Buffer.alloc(32, 3), true, () => Date.now() + clockOffset, sender);
await app.register(accessRoutes, { enabled: true, service, origins: ["http://localhost:3100"], testToken, aroClaim: remoteAroClaim((process.env.RECOVERY_ARO_URL ?? aroUrl) + "/claim", process.env.RECOVERY_ARO_URL ? "synthetic-server-key-for-ci-only" : "synthetic-scoped-server-key") });
app.get<{ Params: { identifier: string } }>("/testing/email-code/:identifier", async (req, reply) => {
  if (!process.env.RECOVERY_ARO_URL || req.headers["x-access-test-token"] !== testToken) return reply.code(404).send();
  if (liveResend) {
    const id = emailIds.get(req.params.identifier);
    if (!id) return reply.code(404).send();
    const response = await realFetch("https://api.resend.com/emails/" + encodeURIComponent(id), { headers: { authorization: "Bearer " + process.env.RESEND_API_KEY }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return reply.code(502).send();
    const email = await response.json() as { last_event?: string; text?: string };
    if (email.last_event !== "delivered") return reply.code(202).send({ pending: true });
    const code = email.text?.match(/código Atlas Access é (\d{6})/)?.[1];
    if (!code) return reply.code(502).send();
    console.log("Resend delivered id=" + id);
    return { secret: code, email_id: id, last_event: email.last_event };
  }
  const code = deliveredEmails.get(req.params.identifier)?.match(/código Atlas Access é (\d{6})/)?.[1];
  return code ? { secret: code } : reply.code(404).send();
});
app.post("/testing/advance", async (req, reply) => {
  if (!process.env.RECOVERY_ARO_URL || req.headers["x-access-test-token"] !== testToken) return reply.code(404).send();
  clockOffset += 61000; return { ok: true };
});
app.post("/testing/revoke", async (req, reply) => {
  if (req.headers["x-access-test-token"] !== testToken) return reply.code(404).send();
  status = "REFUNDED"; return { ok: true };
});
await app.listen({ host: "127.0.0.1", port: 4100 });
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, async () => { await app.close(); await aro.close(); await wa.close(); await stub.close(); smtp.close(); process.exit(0); });
