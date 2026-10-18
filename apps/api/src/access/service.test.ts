import { describe, it, expect, vi } from "vitest";
import { AccessService, PROJECT, SESSION_MS } from "./service";
import { memoryStore } from "./testing/fixtures";
import type { IdentityProvider, ProviderSession } from "./provider";
function fixture(preview = true) {
  let now = 1800000000000;
  const store = memoryStore();
  const identity: ProviderSession = { principalId: "11111111-1111-4111-8111-111111111111", email: "ana@example.invalid", accessToken: "access", refreshToken: "refresh", expiresAt: now + 3600000 };
  const provider: IdentityProvider = { generate: vi.fn(async () => "provider-proof"), verify: vi.fn(async () => identity), refresh: vi.fn(async () => ({ ...identity, refreshToken: "rotated", expiresAt: now + 3600000 })), check: vi.fn(async () => true), revoke: vi.fn(async () => {}) };
  const service = new AccessService(store, provider, Buffer.alloc(32, 1), preview, () => now);
  async function challenge(method: "otp" | "magic_link" = "otp") {
    const result = await service.challenge(identity.email, method, "local");
    const secret = await service.previewSecret(result.challenge_id);
    return { id: result.challenge_id, secret: secret! };
  }
  return { service, store, provider, identity, challenge, advance(ms: number) { now += ms; } };
}
describe("Access: política e persistência", () => {
  it("código CSPRNG de seis dígitos, tokens cifrados e nenhum identificador legível no store", async () => {
    const f = fixture(), c = await f.challenge();
    expect(c.secret).toMatch(/^\d{6}$/);
    const token = await f.service.verify(c.id, c.secret, PROJECT);
    expect(token).toHaveLength(43);
    const raw = JSON.stringify([...f.store.records]);
    for (const secret of [c.secret, f.identity.email, "provider-proof", "rotated", token!]) expect(raw).not.toContain(secret);
  });
  it.each([["otp", 300000], ["magic_link", 600000]] as const)("%s expira no limite", async (method, ttl) => {
    const f = fixture(), c = await f.challenge(method); f.advance(ttl);
    expect(await f.service.verify(c.id, c.secret, PROJECT)).toBeNull();
    expect(f.provider.verify).not.toHaveBeenCalled();
  });
  it("sexta tentativa bloqueada mesmo com código correto", async () => {
    const f = fixture(), c = await f.challenge();
    for (let i = 0; i < 5; i++) expect(await f.service.verify(c.id, "invalid", PROJECT)).toBeNull();
    expect(await f.service.verify(c.id, c.secret, PROJECT)).toBeNull();
  });
  it("replay concorrente permite apenas um consumo e nega cross-tenant", async () => {
    const f = fixture(), c = await f.challenge("magic_link");
    expect(await f.service.verify(c.id, c.secret, "club")).toBeNull();
    const results = await Promise.all([f.service.verify(c.id, c.secret, PROJECT), f.service.verify(c.id, c.secret, PROJECT)]);
    expect(results.filter(Boolean)).toHaveLength(1); expect(f.provider.verify).toHaveBeenCalledTimes(1);
  });
  it("não aceita identidade Supabase com contacto diferente", async () => {
    const f = fixture(), c = await f.challenge(); f.identity.email = "other@example.invalid";
    expect(await f.service.verify(c.id, c.secret, PROJECT)).toBeNull();
  });
  it("renova e persiste refresh rotativo sem prolongar sete dias", async () => {
    const f = fixture(), c = await f.challenge(); const token = (await f.service.verify(c.id, c.secret, PROJECT))!;
    const session = await f.service.session(token); f.advance(3600000);
    expect((await f.service.session(token))?.expires_at).toBe(session?.expires_at);
    expect(f.provider.refresh).toHaveBeenCalledWith("refresh");
    f.advance(3600000); await f.service.session(token);
    expect(f.provider.refresh).toHaveBeenLastCalledWith("rotated");
    f.advance(SESSION_MS); expect(await f.service.session(token)).toBeNull();
  });
  it("revoga localmente mesmo com Supabase indisponível", async () => {
    const f = fixture(), c = await f.challenge(); const token = (await f.service.verify(c.id, c.secret, PROJECT))!;
    vi.mocked(f.provider.revoke).mockRejectedValue(new Error("offline"));
    await f.service.logout(token); expect(await f.service.session(token)).toBeNull();
    expect(await f.service.session(token, "club")).toBeNull();
  });
  it("revogação remota ou falha de refresh fecha sessão", async () => {
    const f = fixture(), c = await f.challenge(); const token = (await f.service.verify(c.id, c.secret, PROJECT))!;
    f.advance(3600000); vi.mocked(f.provider.refresh).mockRejectedValue(new Error("revoked"));
    expect(await f.service.session(token)).toBeNull();
  });
  it("rate limit por identificador, IP e projeto mantém resposta indistinguível", async () => {
    const f = fixture();
    for (let i = 0; i < 4; i++) expect(await f.service.challenge(f.identity.email, "otp", "ip" + i)).toEqual({ challenge_id: expect.any(String), resend_after: 60 });
    expect(f.provider.generate).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 11; i++) await f.service.challenge(`other${i}@example.invalid`, "otp", "same-ip");
    expect(f.provider.generate).toHaveBeenCalledTimes(13);
    for (let i = 0; i < 100; i++) await f.service.challenge(`project${i}@example.invalid`, "otp", "ip-" + i);
    expect(f.provider.generate).toHaveBeenCalledTimes(98);
  });
  it("test secret desligado por defeito", async () => {
    const f = fixture(false), c = await f.challenge(); expect(c.secret).toBeNull();
  });
});
