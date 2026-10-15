import type { Env } from "../env";

export type PixProvider = "pixgo" | "misticpay";
export type PixState = "pending" | "approved" | "failed" | "canceled" | "refunded";

export interface CreatePixInput {
  orderId: string;
  amountMinor: number;
  payerName: string;
  payerDocument: string;
  payerEmail?: string;
  description: string;
}

export interface PixPayment {
  provider: PixProvider;
  providerPaymentId: string;
  state: PixState;
  qrCodeText: string;
  qrImage?: string | null;
  expiresAt?: string | null;
  feeMinor?: number | null;
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function money(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

async function jsonFetch(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error =
      typeof payload?.error === "string"
        ? payload.error
        : typeof payload?.message === "string"
          ? payload.message
          : "provider_request_failed";
    throw new Error(error);
  }
  return payload as Record<string, any>;
}

export function pixProviderReady(env: Env, provider: PixProvider) {
  if (!env.COMMERCE_ENABLED) return false;
  if (provider === "pixgo") return Boolean(env.PIXGO_API_KEY);
  return Boolean(env.MISTICPAY_CLIENT_ID && env.MISTICPAY_CLIENT_SECRET);
}

export function selectedPixProvider(env: Env): PixProvider {
  return env.BR_PIX_PROVIDER;
}

export async function createPixPayment(
  env: Env,
  provider: PixProvider,
  input: CreatePixInput,
): Promise<PixPayment> {
  if (provider === "pixgo") {
    if (!env.PIXGO_API_KEY) throw new Error("pixgo_not_configured");
    const payload = await jsonFetch("https://pixgo.org/api/v1/payment/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-Key": env.PIXGO_API_KEY,
      },
      body: JSON.stringify({
        amount: money(input.amountMinor),
        description: input.description,
        receiver_name: input.payerName,
        receiver_cpf: digits(input.payerDocument),
        receiver_email: input.payerEmail,
        external_id: input.orderId,
        webhook_url:
          env.API_PUBLIC_BASE_URL.replace(/\/$/, "") +
          "/commerce/webhooks/pixgo",
      }),
    });
    const data =
      payload.data && typeof payload.data === "object" ? payload.data : payload;
    const id = String(data.payment_id ?? data.id ?? "");
    const qr = String(data.qr_code ?? data.copy_paste ?? data.pix_code ?? "");
    if (!id || !qr) throw new Error("pixgo_invalid_response");
    return {
      provider,
      providerPaymentId: id,
      state: normalizePixGoState(String(data.status ?? "pending")),
      qrCodeText: qr,
      qrImage:
        typeof data.qr_image_url === "string"
          ? data.qr_image_url
          : typeof data.qr_code_base64 === "string"
            ? data.qr_code_base64
            : null,
      expiresAt: typeof data.expires_at === "string" ? data.expires_at : null,
      feeMinor:
        typeof data.amounts?.fee === "number"
          ? Math.round(data.amounts.fee * 100)
          : null,
    };
  }

  if (!env.MISTICPAY_CLIENT_ID || !env.MISTICPAY_CLIENT_SECRET)
    throw new Error("misticpay_not_configured");
  if (digits(input.payerDocument).length !== 11)
    throw new Error("misticpay_cpf_required");
  const authorization = Buffer.from(
    env.MISTICPAY_CLIENT_ID + ":" + env.MISTICPAY_CLIENT_SECRET,
  ).toString("base64");
  const payload = await jsonFetch(
    "https://api.misticpay.com/api/transactions/create",
    {
      method: "POST",
      headers: {
        authorization: "Basic " + authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amount: money(input.amountMinor),
        payerName: input.payerName,
        payerDocument: digits(input.payerDocument),
        transactionId: input.orderId,
        description: input.description,
        projectWebhook:
          env.API_PUBLIC_BASE_URL.replace(/\/$/, "") +
          "/commerce/webhooks/misticpay",
      }),
    },
  );
  const data =
    payload.data && typeof payload.data === "object" ? payload.data : payload;
  const id = String(data.transactionId ?? "");
  const qr = String(data.copyPaste ?? "");
  if (!id || !qr) throw new Error("misticpay_invalid_response");
  return {
    provider,
    providerPaymentId: id,
    state: normalizeMisticPayState(String(data.transactionState ?? "PENDENTE")),
    qrCodeText: qr,
    qrImage:
      typeof data.qrCodeBase64 === "string"
        ? data.qrCodeBase64
        : typeof data.qrcodeUrl === "string"
          ? data.qrcodeUrl
          : null,
    feeMinor:
      typeof data.transactionFee === "number"
        ? normalizePossibleMinor(data.transactionFee)
        : null,
  };
}

export async function getPixPayment(
  env: Env,
  provider: PixProvider,
  providerPaymentId: string,
): Promise<Pick<PixPayment, "provider" | "providerPaymentId" | "state" | "feeMinor">> {
  if (provider === "pixgo") {
    if (!env.PIXGO_API_KEY) throw new Error("pixgo_not_configured");
    const payload = await jsonFetch(
      "https://pixgo.org/api/v1/payment/" +
        encodeURIComponent(providerPaymentId) +
        "/status",
      {
        method: "GET",
        headers: { "X-API-Key": env.PIXGO_API_KEY },
      },
    );
    const data =
      payload.data && typeof payload.data === "object" ? payload.data : payload;
    return {
      provider,
      providerPaymentId,
      state: normalizePixGoState(String(data.status ?? payload.status ?? "")),
      feeMinor:
        typeof data.amounts?.fee === "number"
          ? Math.round(data.amounts.fee * 100)
          : null,
    };
  }

  if (!env.MISTICPAY_CLIENT_ID || !env.MISTICPAY_CLIENT_SECRET)
    throw new Error("misticpay_not_configured");
  const authorization = Buffer.from(
    env.MISTICPAY_CLIENT_ID + ":" + env.MISTICPAY_CLIENT_SECRET,
  ).toString("base64");
  const payload = await jsonFetch(
    "https://api.misticpay.com/api/transactions/check",
    {
      method: "POST",
      headers: {
        authorization: "Basic " + authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify({ transactionId: providerPaymentId }),
    },
  );
  const data =
    payload.transaction && typeof payload.transaction === "object"
      ? payload.transaction
      : payload.data && typeof payload.data === "object"
        ? payload.data
        : payload;
  return {
    provider,
    providerPaymentId,
    state: normalizeMisticPayState(String(data.transactionState ?? data.status ?? "")),
    feeMinor:
      typeof data.fee === "number" ? Math.round(data.fee * 100) : null,
  };
}

function normalizePixGoState(status: string): PixState {
  switch (status.toLowerCase()) {
    case "completed":
    case "paid":
    case "approved":
      return "approved";
    case "refunded":
      return "refunded";
    case "expired":
    case "cancelled":
    case "canceled":
      return "canceled";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

function normalizeMisticPayState(status: string): PixState {
  switch (status.toUpperCase()) {
    case "COMPLETO":
    case "COMPLETED":
      return "approved";
    case "FALHA":
    case "FAILED":
      return "failed";
    case "CANCELADO":
    case "CANCELED":
      return "canceled";
    case "REFUNDED":
    case "ESTORNADO":
      return "refunded";
    default:
      return "pending";
  }
}

