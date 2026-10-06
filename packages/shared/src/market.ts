import { z } from "zod";

/** Mercados suportados: Portugal/UE (Stripe, EUR) e Brasil (PIX via PixGo, BRL). */
export const Market = z.enum(["PT", "BR"]);
export type Market = z.infer<typeof Market>;

export const marketConfig = {
  PT: { locale: "pt-PT", currency: "EUR", paymentProvider: "stripe" },
  BR: { locale: "pt-BR", currency: "BRL", paymentProvider: "pixgo" },
} as const satisfies Record<Market, { locale: string; currency: string; paymentProvider: string }>;
