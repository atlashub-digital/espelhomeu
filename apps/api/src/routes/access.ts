import type { AroClaimAdapter } from "../access/claim";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AccessService, COOKIE, PROJECT, SESSION_MS } from "../access/service";
import { timingSafeEqual } from "node:crypto";

const challengeInput = z.object({ project: z.literal(PROJECT), channel: z.enum(["email", "whatsapp"]), method: z.enum(["otp", "magic_link"]), identifier: z.string().max(254), transactionalConsent: z.boolean().optional() }).strict().refine(v => v.channel === "email" ? z.email().safeParse(v.identifier).success : (v.transactionalConsent === true && /^\+[1-9]\d{7,14}$/.test(v.identifier)));
export function accessCookie(token: string, clear = false) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_MS / 1000}`;
}
export function sessionToken(cookie = "") {
  return cookie.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1) ?? "";
}
export async function accessRoutes(app: FastifyInstance, opts: { enabled: boolean; service?: AccessService; origins: string[]; testToken?: string; aroClaim?: AroClaimAdapter }) {
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!opts.enabled) return reply.code(404).send({ error: "not_found" });
    if (!opts.service) return reply.code(503).send({ error: "access_unavailable" });
    if (req.method !== "GET" && (!req.headers.origin || !opts.origins.includes(req.headers.origin))) return reply.code(403).send({ error: "invalid_origin" });
  });
  const routeOptions = { logLevel: "silent" as const, bodyLimit: 4096 };
  for (const path of ["/access/challenges", "/access/recover"]) {
    app.post(path, routeOptions, async (req, reply) => {
      const input = challengeInput.safeParse(req.body);
      if (!input.success) return reply.code(400).send({ error: "invalid_request" });
      try {
        return await opts.service!.challenge(input.data.identifier.trim().toLowerCase(), input.data.method, req.raw.socket.remoteAddress ?? "unknown", input.data.channel);
      } catch { return reply.code(503).send({ error: "access_unavailable" }); }
    });
  }
  app.post("/access/challenges/verify", routeOptions, async (req, reply) => {
    const input = z.object({ project: z.literal(PROJECT), challenge_id: z.uuid(), secret: z.string().max(128) }).strict().safeParse(req.body);
    if (!input.success) return reply.code(400).send({ error: "invalid_request" });
    try {
      const token = await opts.service!.verify(input.data.challenge_id, input.data.secret, input.data.project);
      if (!token) return reply.code(401).send({ error: "invalid_or_expired" });
      // Fresh opaque token every successful verification prevents fixation.
      const old = sessionToken(req.headers.cookie);
      if (old) await opts.service!.logout(old);
      return reply.header("Set-Cookie", accessCookie(token)).send({ ok: true, redirect: "/biblioteca" });
    } catch { return reply.code(503).send({ error: "access_unavailable" }); }
  });
  app.get("/access/session", routeOptions, async (req, reply) => {
    try {
      const session = await opts.service!.session(sessionToken(req.headers.cookie));
      return session ?? reply.code(401).send({ error: "unauthenticated" });
    } catch { return reply.code(503).send({ error: "access_unavailable" }); }
  });
  app.post("/access/bind", routeOptions, async (req, reply) => {
    const input = z.object({ id: z.uuid(), orderId: z.uuid(), checkoutSecret: z.string().min(16).max(2048) }).strict().safeParse(req.body);
    if (!input.success) return reply.code(400).send({ error: "invalid_request" });
    try {
      const token = sessionToken(req.headers.cookie);
      if (!await opts.service!.session(token)) return reply.code(401).send({ error: "unauthenticated" });
      const bound = await opts.service!.bind(token, { id: input.data.id, orderId: input.data.orderId, secret: input.data.checkoutSecret }, opts.aroClaim);
      return bound ? { ok: true } : reply.code(409).send({ error: "binding_denied" });
    } catch { return reply.code(503).send({ error: "access_unavailable" }); }
  });
  app.get("/access/entitlements", routeOptions, async (req) => ({ productRefs: await opts.service!.products(sessionToken(req.headers.cookie), opts.aroClaim) }));
  app.post("/access/opt-out", routeOptions, async (req, reply) => await opts.service!.optOut(sessionToken(req.headers.cookie)) ? { ok: true } : reply.code(401).send({ error: "unauthenticated" }));
  app.post("/access/logout", routeOptions, async (req, reply) => {
    try {
      await opts.service!.logout(sessionToken(req.headers.cookie));
      return reply.header("Set-Cookie", accessCookie("", true)).send({ ok: true });
    } catch { return reply.code(503).send({ error: "access_unavailable" }); }
  });
  app.post("/access/aro/claim", routeOptions, async (req, reply) => {
    if (!opts.aroClaim) return reply.code(409).send({ error: "not_available_yet" });
    const input = z.object({ project: z.literal(PROJECT), orderId: z.uuid(), checkoutSessionId: z.uuid(), proof: z.string().min(32).max(2048), offerId: z.string().min(1).max(128) }).strict().safeParse(req.body);
    if (!input.success) return reply.code(400).send({ error: "invalid_request" });
    const token = sessionToken(req.headers.cookie);
    const session = await opts.service!.session(token);
    if (!session) return reply.code(401).send({ error: "unauthenticated" });
    const binding = await opts.service!.claim(token, input.data, opts.aroClaim);
    return binding ? { ok: true } : reply.code(409).send({ error: "claim_denied" });
  });
  if (opts.testToken) app.get<{ Params: { id: string } }>("/access/testing/challenges/:id", routeOptions, async (req, reply) => {
    const supplied = req.headers["x-access-test-token"];
    const expected = Buffer.from(opts.testToken!);
    if (typeof supplied !== "string" || Buffer.byteLength(supplied) !== expected.length || !timingSafeEqual(Buffer.from(supplied), expected)) return reply.code(404).send({ error: "not_found" });
    const secret = await opts.service!.previewSecret(req.params.id);
    return secret ? { secret } : reply.code(404).send({ error: "not_found" });
  });
}
