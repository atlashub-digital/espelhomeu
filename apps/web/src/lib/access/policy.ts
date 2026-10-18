/**
 * Atlas Access V1 — common server-side input/session policy.
 *
 * This module does not issue OTPs, send WhatsApp, or authorize an ARO purchase.
 * The configured identity provider proves contact possession; an ARO-authenticated
 * backend separately resolves order + entitlement. Never trust buyer-provided
 * contact strings, browser status or return URLs as an access grant.
 */
export type AccessChannel = "email" | "whatsapp";
export type AccessMethod = "otp" | "magic_link";
export type AccessChallenge = {
  channel: AccessChannel;
  method: AccessMethod;
  identifier: string;
};

export const ACCESS_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCESS_OTP_TTL_MS = 5 * 60 * 1000;
export const ACCESS_MAGIC_LINK_TTL_MS = 10 * 60 * 1000;
export const ACCESS_MAX_OTP_ATTEMPTS = 5;

/** Parse only the chosen contact channel. Validation is NOT proof of ownership. */
export function parseAccessChallenge(input: unknown): AccessChallenge | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (
    (value.channel !== "email" && value.channel !== "whatsapp") ||
    (value.method !== "otp" && value.method !== "magic_link") ||
    typeof value.identifier !== "string"
  ) return null;

  const original = value.identifier.trim();
  if (!original || original.length > 254 || /[\u0000-\u001f\u007f]/.test(original)) return null;

  if (value.channel === "whatsapp") {
    // Country is explicit: local phone formats must be normalized by the UI,
    // never guessed from the project or IP. E.164 max 15 digits.
    if (!/^\+[1-9][0-9]{7,14}$/.test(original)) return null;
    return { channel: "whatsapp", method: value.method, identifier: original };
  }

  const at = original.lastIndexOf("@");
  if (at <= 0 || original.indexOf("@") !== at) return null;
  const local = original.slice(0, at);
  const domain = original.slice(at + 1).toLowerCase();
  if (
    local.length > 64 ||
    /[\s<>]/.test(local) ||
    domain.length > 253 ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain) ||
    domain.split(".").some((label) => label.startsWith("-") || label.endsWith("-"))
  ) return null;
  return { channel: "email", method: value.method, identifier: local + "@" + domain };
}

export type AccessSession = {
  principalId: string;
  project: string;
  issuedAt: number;
  expiresAt: number;
  revokedAt?: number | null;
};

/**
 * Check a server-issued identity session (not an ARO entitlement).
 * Project resources MUST still query ARO server-side for ACTIVE rights.
 */
export function activeAccessSession(
  session: AccessSession | null | undefined,
  expectedProject: string,
  now: number = Date.now(),
): boolean {
  if (!session || !expectedProject || session.project !== expectedProject) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.principalId)) return false;
  if (
    !Number.isSafeInteger(session.issuedAt) ||
    !Number.isSafeInteger(session.expiresAt) ||
    !Number.isSafeInteger(now) ||
    session.issuedAt > now ||
    session.expiresAt <= now ||
    session.expiresAt <= session.issuedAt ||
    session.expiresAt - session.issuedAt > ACCESS_SESSION_MAX_AGE_MS
  ) return false;
  return session.revokedAt == null;
}

/** Only server-resolved data. Not safe to call using raw browser payload. */
export type AuthorizedOrderBinding = {
  principalId: string;
  project: string;
  orderId: string;
  orderState: string;
  entitlementState: string;
  entitlementSourceOrderId: string;
  checkoutPossessionVerified: boolean;
  contactPossessionVerified: boolean;
};

/**
 * Additional gate before persisting a binding between a verified identity and
 * an ARO order. Both proofs must come from trusted backends, not flags in JS.
 * An ACTIVE entitlement must later be re-checked on each Reader request.
 */
export function mayBindApprovedOrder(
  binding: AuthorizedOrderBinding,
  session: AccessSession,
  now: number = Date.now(),
): boolean {
  return activeAccessSession(session, binding.project, now) &&
    binding.principalId === session.principalId &&
    binding.checkoutPossessionVerified === true &&
    binding.contactPossessionVerified === true &&
    /^[0-9a-f-]{36}$/i.test(binding.orderId) &&
    binding.orderState === "APPROVED" &&
    binding.entitlementState === "ACTIVE" &&
    binding.entitlementSourceOrderId === binding.orderId;
}
