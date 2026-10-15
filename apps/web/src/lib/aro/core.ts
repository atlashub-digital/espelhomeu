import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const offerCodes: Record<string, string> = {
  p01: "p01-br",
  p02: "p02-br",
  p03: "p03-br",
  p04: "p04-br",
  p05: "p05-br",
  colecao: "colecao-br",
};
export const bumpIds: Record<string, string> = {
  p01: "p02",
  p02: "p03",
  p04: "p05",
  p05: "p04",
};
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type CheckoutSession = {
  id: string;
  order_id: string;
  project: string;
  offer: string;
  state: string;
  amount: { amount_minor: number; currency: string };
  checkout_secret?: string;
  payment?: {
    kind: string;
    qr_payload: string;
    copy_paste: string;
    expires_at: string;
  };
};
export type CheckoutCapability = {
  id: string;
  orderId: string;
  secret: string;
  offer: string;
  exp: number;
};
export const sessionCookie = "espelho_aro_checkout";
function key(secret: string) {
  return createHash("sha256")
    .update("espelhomeu:aro:cookie:v1:")
    .update(secret)
    .digest();
}
export function sealSession(capability: CheckoutCapability, secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(capability), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function openSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): CheckoutCapability | null {
  if (!value || value.length > 3000) return null;
  try {
    const data = Buffer.from(value, "base64url"),
      decipher = createDecipheriv(
        "aes-256-gcm",
        key(secret),
        data.subarray(0, 12),
      );
    decipher.setAuthTag(data.subarray(12, 28));
    const c = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
    if (
      !UUID.test(c.id) ||
      !UUID.test(c.orderId) ||
      typeof c.secret !== "string" ||
      c.secret.length < 16 ||
      !Object.values(offerCodes).includes(c.offer) ||
      !Number.isFinite(c.exp) ||
      c.exp <= now
    )
      return null;
    return c;
  } catch {
    return null;
  }
}
export function validSession(
  c: CheckoutSession,
  capability?: CheckoutCapability,
) {
  return (
    c &&
    UUID.test(c.id) &&
    UUID.test(c.order_id) &&
    c.project === "espelhomeu" &&
    Object.values(offerCodes).includes(c.offer) &&
    [
      "CREATED",
      "PENDING",
      "APPROVED",
      "FAILED",
      "CANCELED",
      "EXPIRED",
      "REFUNDED",
      "CHARGEBACK",
    ].includes(c.state) &&
    c.amount?.currency === "BRL" &&
    Number.isSafeInteger(c.amount.amount_minor) &&
    c.amount.amount_minor > 0 &&
    (!capability ||
      (c.id === capability.id &&
        c.order_id === capability.orderId &&
        c.offer === capability.offer))
  );
}
export function activeProductRefs(
  payload: unknown,
  orderId: string,
  customerId: string,
  now = Date.now(),
): string[] {
  const p = payload as {
    project?: string;
    customer_id?: string;
    entitlements?: {
      key: string;
      status: string;
      source_order_id?: string;
      starts_at: string;
      expires_at?: string;
    }[];
  };
  if (
    !p ||
    p.project !== "espelhomeu" ||
    p.customer_id !== customerId ||
    !Array.isArray(p.entitlements)
  )
    return [];
  return ["p01", "p02", "p03", "p04", "p05"].filter((id) =>
    p.entitlements!.some(
      (e) =>
        e &&
        e.key === "espelhomeu:" + id &&
        e.status === "ACTIVE" &&
        e.source_order_id === orderId &&
        Date.parse(e.starts_at) <= now &&
        (e.expires_at === undefined || Date.parse(e.expires_at) > now),
    ),
  );
}
