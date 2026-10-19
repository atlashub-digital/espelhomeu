import { resolveAroCheckout } from "@espelhomeu/shared";
import "server-only";
import { cookies } from "next/headers";
import {
  openSession,
  sessionCookie,
  validSession,
  type CheckoutCapability,
  type CheckoutSession,
} from "./core";
export function aroConfig() {
  const apiUrl = process.env.ARO_API_URL || "https://aro.atlashub.si";
  const url = new URL(apiUrl);
  if (
    url.protocol !== "https:" &&
    !(
      (process.env.NODE_ENV !== "production" || process.env.CI === "true") &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("aro_configuration");
  if (
    process.env.ARO_PROJECT_SLUG &&
    process.env.ARO_PROJECT_SLUG !== "espelhomeu"
  )
    throw new Error("aro_configuration");
  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    publicKey: process.env.ARO_PUBLIC_KEY,
    serverKey: process.env.ARO_SERVER_KEY,
  };
}
export async function aroFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(aroConfig().apiUrl + path, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("aro_unavailable");
  return response.json();
}
export async function currentCapability() {
  const key = aroConfig().serverKey;
  return key
    ? openSession((await cookies()).get(sessionCookie)?.value, key)
    : null;
}
export async function getAroCheckout(
  c: CheckoutCapability,
): Promise<CheckoutSession> {
  const session = await aroFetch(
    "/v1/checkout-sessions/" + encodeURIComponent(c.id),
    { headers: { "X-ARO-Checkout-Secret": c.secret } },
  );
  if (!validSession(session, c)) throw new Error("aro_invalid_session");
  return session;
}
/** Checkout capability proves only possession of this order, never identity by submitted email. */
export async function resolveCheckoutAccess(c: CheckoutCapability) {
  const key = aroConfig().serverKey;
  if (!key) return [];
  const result = await resolveAroCheckout((path, body, secret) => aroFetch(path, {
    method: body ? "POST" : "GET",
    headers: secret ? { "X-ARO-Checkout-Secret": secret } : { authorization: "Bearer " + key, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), c);
  return result?.productRefs ?? [];
}
