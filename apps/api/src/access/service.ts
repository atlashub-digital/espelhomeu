import type { AroClaimAdapter, HostedCheckoutProof, AuthorizedPurchaseBinding } from "./claim";
import type { AccessTransport, Channel } from "./transport";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { IdentityProvider, ProviderSession } from "./provider";
import type { AccessStore, RecordValue } from "./store";

export const PROJECT = "espelhomeu";
export const COOKIE = "__Host-espelho_access";
export const SESSION_MS = 7 * 86400000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type Method = "otp" | "magic_link";
type Challenge = RecordValue & { project: string; emailHash: string; method: Method; secretHash: string; proof: string; expires: number; attempts: number; consumed: boolean; delivery?: string; channel?: Channel; preview?: string };
type Session = RecordValue & { project: string; principalId: string; email: string; issued: number; expires: number; revoked: boolean; tokens: string };
export class AccessService {
  constructor(private store: AccessStore, private provider: IdentityProvider, private key: Buffer, private preview = false, private now = Date.now, private transport?: AccessTransport) {
    if (key.length !== 32) throw new Error("access_key_required");
  }
  hash(value: string) { return createHmac("sha256", this.key).update(value).digest("hex"); }
  private seal(value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
  }
  private open<T>(value: string): T {
    const bytes = Buffer.from(value, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", this.key, bytes.subarray(0, 12));
    cipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
  }
  async rate(ip: string, email: string) {
    let allowed = true;
    for (const [name, limit] of [["ip:" + ip, 10], ["email:" + email, 3], ["project:" + PROJECT, 100]] as const) {
      const ok = await this.store.update("rate:" + this.hash(name), async old => {
        const value = old && Number(old.until) > this.now() ? old : { count: 0, until: this.now() + 60000 };
        value.count = Number(value.count) + 1;
        return { value, result: Number(value.count) <= limit };
      });
      allowed = allowed && ok;
    }
    return allowed;
  }
  async challenge(email: string, method: Method, ip: string, channel: Channel = "email") {
    // A contact lock makes cooldown and delivery atomic across workers. Keys contain hashes only.
    if (channel === "whatsapp" && await this.store.update("suppressed:" + this.hash(email), async old => ({ value: old ?? {}, result: !!old?.suppressed }))) return { challenge_id: randomUUID(), resend_after: 60 };
    if (this.transport) return this.store.update("cooldown:" + this.hash(channel + email), async old => {
      if (old && Number(old.until) > this.now()) return { value: old, result: { challenge_id: String(old.id), resend_after: 60 } };
      if (old?.id) {
        const reused = await this.store.update("challenge:" + old.id, async raw => {
          const challenge = raw as Challenge | null;
          if (!challenge || challenge.consumed || challenge.expires <= this.now() || challenge.method !== method || !challenge.delivery) return { value: raw ?? {}, result: false };
          if (!(await this.rate(ip, email))) return { value: challenge, result: true };
          const delivered = await this.deliver(this.open<import("./transport").Delivery>(challenge.delivery));
          if (!delivered) { challenge.consumed = true; delete challenge.preview; delete challenge.delivery; }
          return { value: challenge, result: true };
        });
        if (reused) return { value: { ...old, until: this.now() + 60000 }, result: { challenge_id: String(old.id), resend_after: 60 } };
        await this.store.update("challenge:" + old.id, async raw => ({ value: { ...raw, consumed: true }, result: null }));
      }
      const result = await this.issue(email, method, ip, channel);
      return { value: { id: result.challenge_id, until: this.now() + 60000 }, result };
    });
    return this.issue(email, method, ip, channel);
  }
  private async issue(email: string, method: Method, ip: string, channel: Channel) {
    const id = randomUUID();
    const secret = method === "otp" ? randomInt(0, 1000000).toString().padStart(6, "0") : randomBytes(32).toString("base64url");
    if (!(await this.rate(ip, email))) return { challenge_id: id, resend_after: 60 };
    if (channel === "whatsapp" && await this.store.update("suppressed:" + this.hash(email), async old => ({ value: old ?? {}, result: !!old?.suppressed }))) return { challenge_id: id, resend_after: 60 };
    let proof = "";
    try { proof = channel === "email" ? await this.provider.generate(email) : "whatsapp-possession"; } catch { /* Same public acknowledgement, including provider failures. */ }
    const value: Challenge = {
      project: PROJECT, channel, emailHash: this.hash(email), method, secretHash: this.hash(id + ":" + secret),
      proof: this.seal(proof), expires: this.now() + (method === "otp" ? 300000 : 600000), attempts: 0, consumed: false,
      ...(this.preview && proof ? { preview: this.seal(secret) } : {}),
    };
    if (this.transport) {
      if (!proof || !(await this.deliver({ channel, identifier: email, method, secret, challengeId: id }))) return { challenge_id: id, resend_after: 60 };
      value.delivery = this.seal({ channel, identifier: email, method, secret, challengeId: id });
    }
    await this.store.update("challenge:" + id, async () => ({ value, result: null }));
    return { challenge_id: id, resend_after: 60 };
  }
  private async deliver(message: import("./transport").Delivery) {
    const { channel, identifier } = message;
    const audit = "delivery:" + randomUUID();
    await this.store.update(audit, async () => ({ value: { contactHash: this.hash(identifier), channel, attempted: this.now(), result: "attempt" }, result: null }));
    const ready = await this.store.update("breaker:" + channel, async old => ({ value: old ?? {}, result: !old || Number(old.until ?? 0) <= this.now() }));
    let delivered = false;
    try { if (ready) { await this.transport!.send(message); delivered = true; } } catch { /* Never log payloads or errors. */ }
    await this.store.update(audit, async old => ({ value: { ...old, result: delivered ? "accepted" : "failed", completed: this.now() }, result: null }));
    if (ready) await this.store.update("breaker:" + channel, async old => {
      const failures = delivered ? 0 : Number(old?.failures ?? 0) + 1;
      return { value: { failures, until: failures >= 3 ? this.now() + 60000 : 0 }, result: null };
    });
    return delivered;
  }
  async previewSecret(id: string): Promise<string | null> {
    if (!this.preview || !UUID.test(id)) return null;
    return this.store.update("challenge:" + id, async value => ({ value: value ?? {}, result: value?.preview && Number(value.expires) > this.now() ? this.open<string>(String(value.preview)) : null }));
  }
  async verify(id: string, secret: string, project: string) {
    if (!UUID.test(id) || project !== PROJECT || secret.length > 128) return null;
    // Consume locally before calling the provider. A crash cannot resurrect a proof.
    const proof = await this.store.update("challenge:" + id, async raw => {
      const value = raw as Challenge | null;
      if (!value || value.project !== project || value.consumed || value.expires <= this.now() || value.attempts >= 5) return { value: raw ?? {}, result: null };
      value.attempts++;
      const expected = Buffer.from(value.secretHash, "hex");
      const actual = Buffer.from(this.hash(id + ":" + secret), "hex");
      const matches = (value.method !== "otp" || /^\d{6}$/.test(secret)) && timingSafeEqual(expected, actual);
      if (!matches) return { value, result: null };
      value.consumed = true;
      delete value.preview;
      delete value.delivery;
      return { value, result: { token: this.open<string>(value.proof), emailHash: value.emailHash, channel: value.channel } };
    });
    if (!proof?.token) return null;
    let identity: ProviderSession;
    try { identity = proof.channel === "whatsapp" ? {
      principalId: await this.store.update("principal:wa:" + proof.emailHash, async old => { const value = old ?? { id: randomUUID() }; return { value, result: String(value.id) }; }),
      email: proof.emailHash, accessToken: "", refreshToken: "", expiresAt: this.now() + SESSION_MS,
    } : await this.provider.verify(proof.token); } catch { return null; }
    if ((proof.channel !== "whatsapp" && this.hash(identity.email.toLowerCase()) !== proof.emailHash) || !/^[0-9a-f-]{36}$/i.test(identity.principalId)) return null;
    const token = randomBytes(32).toString("base64url");
    const value: Session = {
      project, principalId: identity.principalId, email: this.seal(identity.email), issued: this.now(), expires: this.now() + SESSION_MS,
      revoked: false, channel: proof.channel ?? "email", tokens: this.seal(identity),
    };
    await this.store.update("session:" + this.hash(token), async () => ({ value, result: null }));
    return token;
  }
  async session(token: string, project = PROJECT) {
    if (!/^[\w-]{43}$/.test(token) || project !== PROJECT) return null;
    return this.store.update("session:" + this.hash(token), async raw => {
      const value = raw as Session | null;
      if (!value || value.project !== project || value.revoked || value.issued > this.now() || value.expires <= this.now() || value.expires - value.issued > SESSION_MS) return { value: raw ?? {}, result: null };
      try {
        let identity = this.open<ProviderSession>(value.tokens);
        // Validate refresh authority on every session read: remote logout must not
        // remain valid until the old access JWT expires. Serialized in PostgreSQL.
        if (value.channel !== "whatsapp") {
          identity = await this.provider.refresh(identity.refreshToken);
          if (identity.principalId !== value.principalId || identity.email !== this.open<string>(value.email)) throw new Error("identity_changed");
          value.tokens = this.seal(identity);
        }
        if (value.channel !== "whatsapp" && !(await this.provider.check(identity.accessToken, value.principalId))) throw new Error("identity_revoked");
        return { value, result: { principal_id: value.principalId, project, verified_contacts: [String(value.channel ?? "email")], expires_at: value.expires } };
      } catch {
        value.revoked = true;
        return { value, result: null };
      }
    });
  }
  async products(token: string, adapter?: AroClaimAdapter) {
    const session = await this.session(token);
    if (!session || !adapter?.resolve) return [];
    const binding = await this.store.update("binding:" + this.hash(PROJECT + ":" + session.principal_id), async old => ({ value: old ?? {}, result: old?.sealed ? this.open<AuthorizedPurchaseBinding>(String(old.sealed)) : null }));
    return binding && binding.principalId === session.principal_id && binding.project === PROJECT ? adapter.resolve(binding) : [];
  }
  async optOut(token: string) {
    const session = await this.session(token);
    if (!session) return false;
    return this.store.update("session:" + this.hash(token), async old => {
      if (!old || old.channel !== "whatsapp") return { value: old ?? {}, result: false };
      const identity = this.open<ProviderSession>(String(old.tokens));
      await this.store.update("suppressed:" + identity.email, async () => ({ value: { suppressed: true }, result: null }));
      return { value: old, result: true };
    });
  }
  async claim(token: string, proof: HostedCheckoutProof, adapter: AroClaimAdapter) {
    const session = await this.session(token);
    if (!session || proof.project !== PROJECT) return false;
    // Consume before exchange. Network failures cannot resurrect claims. ARO must
    // also enforce replay protection and check APPROVED/ACTIVE atomically.
    return this.store.update("claim:" + this.hash(proof.proof), async old => {
      if (old) return { value: old, result: false };
      const binding = await adapter.claim(proof, session.principal_id);
      if (binding && binding.project === PROJECT && binding.principalId === session.principal_id && binding.orderId === proof.orderId && binding.checkoutSessionId === proof.checkoutSessionId && binding.offerId === proof.offerId && binding.expiresAt > this.now()) {
        await this.store.update("binding:" + this.hash(PROJECT + ":" + session.principal_id), async () => ({ value: { sealed: this.seal(binding) }, result: null }));
        return { value: { consumed: true }, result: true };
      }
      return { value: { consumed: true }, result: false };
    });
  }
  async logout(token: string) {
    if (!/^[\w-]{43}$/.test(token)) return;
    // Commit local revocation even when the identity provider is offline.
    const identity = await this.store.update("session:" + this.hash(token), async raw => {
      const value = raw as Session | null;
      if (!value || value.revoked) return { value: raw ?? {}, result: null };
      value.revoked = true;
      return { value, result: value.channel === "whatsapp" ? null : this.open<ProviderSession>(value.tokens) };
    });
    if (identity) { try { await this.provider.revoke(identity.accessToken); } catch { /* Local revocation is authoritative for this project. */ } }
  }
}
