import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import type { AccessStore, RecordValue } from "../store";
export function memoryStore(): AccessStore & { records: Map<string, RecordValue> } {
  const records = new Map<string, RecordValue>();
  const queues = new Map<string, Promise<void>>();
  return { records, async update(key, fn) {
    const previous = queues.get(key) ?? Promise.resolve();
    let release!: () => void;
    queues.set(key, new Promise<void>(resolve => { release = resolve; }));
    await previous;
    try {
      const { value, result } = await fn(structuredClone(records.get(key) ?? null));
      records.set(key, structuredClone(value));
      return result;
    } finally { release(); }
  } };
}
/** Local wire-level GoTrue stub. No request can reach Master or an SMTP service. */
export async function startSupabaseStub(distinctPrincipals = false) {
  const app = Fastify({ logger: false });
  const proofs = new Map<string, string>();
  const refreshes = new Map<string, string>();
  const access = new Map<string, string>();
  const calls: string[] = [];
  const id = "11111111-1111-4111-8111-111111111111";
  const principals = new Map<string, string>();
  const principal = (email: string) => { if (!principals.has(email)) principals.set(email, randomUUID()); return distinctPrincipals ? principals.get(email)! : id; };
  const user = (email: string) => ({ id: principal(email), aud: "authenticated", role: "authenticated", email, email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
  function session(email: string) {
    const refresh_token = randomUUID();
    const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: principal(email), exp: Math.floor(Date.now() / 1000) + 3600, session_id: randomUUID() })).toString("base64url"), "synthetic"].join(".");
    access.set(jwt, email); refreshes.set(refresh_token, email);
    return { access_token: jwt, refresh_token, expires_in: 3600, token_type: "bearer", user: user(email) };
  }
  app.addHook("onRequest", async req => { calls.push(req.method + " " + req.url); });
  app.post<{ Body: { email: string } }>("/auth/v1/admin/generate_link", async req => {
    const hashed_token = randomUUID(); proofs.set(hashed_token, req.body.email);
    return { ...user(req.body.email), hashed_token, email_otp: "12345678", action_link: "https://unused.invalid", verification_type: "magiclink", redirect_to: "https://unused.invalid" };
  });
  app.post<{ Body: { token_hash: string } }>("/auth/v1/verify", async (req, reply) => {
    const email = proofs.get(req.body.token_hash); proofs.delete(req.body.token_hash);
    return email ? session(email) : reply.code(403).send({ msg: "invalid" });
  });
  app.post<{ Body: { refresh_token: string } }>("/auth/v1/token", async (req, reply) => {
    const email = refreshes.get(req.body.refresh_token); refreshes.delete(req.body.refresh_token);
    return email ? session(email) : reply.code(403).send({ msg: "revoked" });
  });
  app.get("/auth/v1/user", async (req, reply) => {
    const email = access.get(req.headers.authorization?.replace("Bearer ", "") ?? "");
    return email ? user(email) : reply.code(401).send({ msg: "revoked" });
  });
  app.post("/auth/v1/logout", async (req, reply) => {
    const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
    const email = access.get(token); access.delete(token);
    for (const [key, value] of refreshes) if (value === email) refreshes.delete(key);
    return reply.code(204).send();
  });
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  return { url, calls, close: () => app.close(), revokeAll() { refreshes.clear(); access.clear(); } };
}
