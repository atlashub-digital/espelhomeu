import type { Env } from "../env";

export type RevenueNotificationEvent = {
  type: "payment.approved" | "payment.refunded";
  project: string;
  orderId: string;
  offerId: string;
  amountMinor: number;
  currency: string;
  provider: string;
};

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function eventText(event: RevenueNotificationEvent) {
  const status =
    event.type === "payment.approved"
      ? "✅ Pagamento aprovado"
      : "↩️ Pagamento reembolsado";
  return [
    status,
    "Projeto: " + event.project,
    "Oferta: " + event.offerId,
    "Valor: " + money(event.amountMinor, event.currency),
    "Provider: " + event.provider,
    "Order: " + event.orderId.slice(0, 8),
  ].join("\n");
}

async function sendTelegram(env: Env, text: string) {
  if (!env.REVENUE_TELEGRAM_BOT_TOKEN || !env.REVENUE_TELEGRAM_CHAT_ID) return;
  await fetch(
    "https://api.telegram.org/bot" +
      encodeURIComponent(env.REVENUE_TELEGRAM_BOT_TOKEN) +
      "/sendMessage",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.REVENUE_TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(2500),
    },
  );
}

async function sendDiscord(env: Env, text: string) {
  if (!env.REVENUE_DISCORD_WEBHOOK_URL) return;
  await fetch(env.REVENUE_DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: text,
      allowed_mentions: { parse: [] },
    }),
    signal: AbortSignal.timeout(2500),
  });
}

export async function notifyRevenueEvent(
  env: Env,
  event: RevenueNotificationEvent,
) {
  const text = eventText(event);
  await Promise.allSettled([
    sendTelegram(env, text),
    sendDiscord(env, text),
  ]);
}
