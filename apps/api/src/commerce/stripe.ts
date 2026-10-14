export interface StripeCheckoutSession {
  id: string;
  client_secret?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string>;
  payment_intent?: string | null;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

async function stripeRequest<T>(
  secret: string,
  path: string,
  init: RequestInit,
  idempotencyKey?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + secret);
  headers.set("Stripe-Version", process.env.STRIPE_API_VERSION || "2025-06-30.basil");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  const response = await fetch("https://api.stripe.com" + path, {
    ...init,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "stripe_request_failed";
    throw new Error(message);
  }
  return payload as T;
}

export function stripePostForm<T>(
  secret: string,
  path: string,
  form: URLSearchParams,
  idempotencyKey?: string,
) {
  return stripeRequest<T>(
    secret,
    path,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    },
    idempotencyKey,
  );
}

export function stripeGet<T>(secret: string, path: string) {
  return stripeRequest<T>(secret, path, { method: "GET" });
}
