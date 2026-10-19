export const offerCodes: Record<string, string> = {
  p01: "p01-br",
  p02: "p02-br",
  p03: "p03-br",
  p04: "p04-br",
  p05: "p05-br",
  colecao: "colecao-br",
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

export type AroRead = (path: string, body?: unknown, checkoutSecret?: string) => Promise<unknown>;
/** Always revalidate the source order and its current entitlements. */
export async function resolveAroOrder(read: AroRead, orderId: string, customerId?: string, now = Date.now()) {
  const order = await read("/v1/orders/" + encodeURIComponent(orderId)) as { id?: string; project?: string; status?: string; customer_id?: string };
  if (!order || order.id !== orderId || order.project !== "espelhomeu" || order.status !== "APPROVED" || typeof order.customer_id !== "string" || !UUID.test(order.customer_id) || (customerId !== undefined && order.customer_id !== customerId)) return null;
  const payload = await read("/v1/entitlements/resolve", { project: "espelhomeu", customer_id: order.customer_id });
  return { customerId: order.customer_id, productRefs: activeProductRefs(payload, orderId, order.customer_id, now) };
}
export async function resolveAroCheckout(read: AroRead, capability: Pick<CheckoutCapability, "id" | "orderId" | "secret"> & { offer?: string }, now = Date.now()) {
  const session = await read("/v1/checkout-sessions/" + encodeURIComponent(capability.id), undefined, capability.secret) as CheckoutSession;
  if (!validSession(session) || session.id !== capability.id || session.order_id !== capability.orderId || session.state !== "APPROVED" || (capability.offer !== undefined && session.offer !== capability.offer)) return null;
  const order = await resolveAroOrder(read, capability.orderId, undefined, now);
  return order ? { ...order, offerId: session.offer } : null;
}
