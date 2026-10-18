import { describe, expect, it } from "vitest";
import {
  ACCESS_SESSION_MAX_AGE_MS, ACCESS_OTP_TTL_MS,
  ACCESS_MAGIC_LINK_TTL_MS, ACCESS_MAX_OTP_ATTEMPTS,
  parseAccessChallenge, activeAccessSession, mayBindApprovedOrder,
} from "./policy";
const now = Date.UTC(2026, 9, 18, 12, 0, 0);
const id = "11111111-1111-4111-8111-111111111111";
const order = "22222222-2222-4222-8222-222222222222";
const session = { principalId: id, project: "espelhomeu", issuedAt: now, expiresAt: now + ACCESS_SESSION_MAX_AGE_MS };

describe("Atlas Access V1 policy", () => {
  it("supports email or WhatsApp, OTP or magic link without guessing country", () => {
    expect(parseAccessChallenge({ channel: "email", method: "otp", identifier: " User.Name@EXAMPLE.COM " }))
      .toEqual({ channel: "email", method: "otp", identifier: "User.Name@example.com" });
    expect(parseAccessChallenge({ channel: "whatsapp", method: "magic_link", identifier: "+5562999999999" }))
      .toEqual({ channel: "whatsapp", method: "magic_link", identifier: "+5562999999999" });
    for (const identifier of ["62999999999", "(62) 99999-9999", "+0123456789", "+1234567", "+1234567890123456"])
      expect(parseAccessChallenge({ channel: "whatsapp", method: "otp", identifier })).toBeNull();
    for (const identifier of ["invalid", "a@@x.org", "a@-bad.com", "a@example.com\nBCC:evil", "<a>@x.org"])
      expect(parseAccessChallenge({ channel: "email", method: "otp", identifier })).toBeNull();
    expect(parseAccessChallenge({ channel: "email", method: "password", identifier: "a@example.com" })).toBeNull();
  });
  it("bounds challenge policy", () => {
    expect(ACCESS_OTP_TTL_MS).toBe(300000);
    expect(ACCESS_MAGIC_LINK_TTL_MS).toBe(600000);
    expect(ACCESS_MAX_OTP_ATTEMPTS).toBe(5);
  });
  it("rejects foreign, expired, revoked, malformed and overlong 7-day sessions", () => {
    expect(activeAccessSession(session, "espelhomeu", now + 1000)).toBe(true);
    expect(activeAccessSession(session, "other", now + 1000)).toBe(false);
    expect(activeAccessSession(session, "espelhomeu", now + ACCESS_SESSION_MAX_AGE_MS)).toBe(false);
    expect(activeAccessSession({ ...session, expiresAt: session.expiresAt + 1 }, "espelhomeu", now + 1000)).toBe(false);
    expect(activeAccessSession({ ...session, revokedAt: now + 100 }, "espelhomeu", now + 1000)).toBe(false);
    expect(activeAccessSession({ ...session, issuedAt: now + 2000 }, "espelhomeu", now + 1000)).toBe(false);
    expect(activeAccessSession({ ...session, principalId: "bad" }, "espelhomeu", now + 1000)).toBe(false);
  });
  it("never links a pending/refunded purchase or wrong identity/order/project", () => {
    const binding = { principalId: id, project: "espelhomeu", orderId: order,
      orderState: "APPROVED", entitlementState: "ACTIVE",
      entitlementSourceOrderId: order, checkoutPossessionVerified: true,
      contactPossessionVerified: true };
    expect(mayBindApprovedOrder(binding, session, now + 1000)).toBe(true);
    for (const patch of [
      { principalId: order }, { project: "other" }, { orderState: "PENDING" },
      { orderState: "REFUNDED" }, { entitlementState: "REVOKED" },
      { checkoutPossessionVerified: false }, { contactPossessionVerified: false },
      { entitlementSourceOrderId: id },
    ]) expect(mayBindApprovedOrder({ ...binding, ...patch }, session, now + 1000)).toBe(false);
  });
});
