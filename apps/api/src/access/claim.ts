import { resolveAroCheckout, resolveAroOrder, type CheckoutCapability } from "@espelhomeu/shared";
/** Future ARO #24 exchange. Only trusted backend responses may populate these fields.
 * The HTTP endpoint deliberately returns 409 until the hosted proof contract exists.
 */
export interface HostedCheckoutProof {
  project: "espelhomeu";
  orderId: string;
  checkoutSessionId: string;
  proof: string;
  offerId: string;
}
export interface AuthorizedPurchaseBinding {
  principalId: string;
  project: "espelhomeu";
  orderId: string;
  aroCustomerId: string;
  offerId: string;
  checkoutSessionId: string;
  /** Hosted proof freshness; the purchase access period always comes from ARO. */
  expiresAt?: number;
}
export interface AroClaimAdapter {
  bind?(capability: Pick<CheckoutCapability, "id" | "orderId" | "secret">, principalId: string): Promise<AuthorizedPurchaseBinding | null>;
  resolve?(binding: AuthorizedPurchaseBinding): Promise<string[]>;
  claim(proof: HostedCheckoutProof, principalId: string): Promise<AuthorizedPurchaseBinding | null>;
}
export const unavailableAroClaim: AroClaimAdapter = { async claim() { return null; } };

/** Consumer contract proposal for ARO #24. Enable only after the issuer agrees
 * this response shape and implements atomic consumption + current entitlement checks. */
export function remoteAroClaim(endpoint: string, serverKey: string, now = Date.now): AroClaimAdapter {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) throw new Error("aro_configuration");
  const read = async (path: string, body?: unknown, secret?: string) => {
    const r = await fetch(new URL(path, url), { method: body ? "POST" : "GET", headers: secret ? { "X-ARO-Checkout-Secret": secret } : { authorization: "Bearer " + serverKey, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error("aro_unavailable");
    return r.json();
  };
  return { async bind(capability, principalId) {
    try {
      const result = await resolveAroCheckout(read, capability, now());
      if (!result?.productRefs.length) return null;
      return { principalId, project: "espelhomeu", orderId: capability.orderId, aroCustomerId: result.customerId, offerId: result.offerId, checkoutSessionId: capability.id };
    } catch { return null; }
  }, async resolve(binding) {
    try { return (await resolveAroOrder(read, binding.orderId, binding.aroCustomerId, now()))?.productRefs ?? []; }
    catch { return []; }
  }, async claim(proof, principalId) {
    try {
      const response = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + serverKey, "content-type": "application/json" }, body: JSON.stringify({ ...proof, principalId }), redirect: "error", signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      const b = await response.json();
      if (b.project !== "espelhomeu" || b.project !== proof.project || b.orderId !== proof.orderId || b.checkoutSessionId !== proof.checkoutSessionId || b.principalId !== principalId || b.orderStatus !== "APPROVED" || b.entitlementStatus !== "ACTIVE" || typeof b.issuedAt !== "number" || typeof b.expiresAt !== "number" || b.issuedAt > now() || b.expiresAt <= now() || b.expiresAt - b.issuedAt > 120000 || b.expiresAt <= b.issuedAt || b.offerId !== proof.offerId || typeof b.aroCustomerId !== "string" || !b.aroCustomerId || !Number.isSafeInteger(b.issuedAt) || !Number.isSafeInteger(b.expiresAt)) return null;
      return { principalId, project: "espelhomeu", orderId: b.orderId, aroCustomerId: b.aroCustomerId, offerId: b.offerId, checkoutSessionId: b.checkoutSessionId, expiresAt: b.expiresAt };
    } catch { return null; }
  } };
}
