import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default("0.0.0.0"),
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  WEB_BASE_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url().optional(),
  APP_VERSION: z.string().default("dev"),
  COMMERCE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_API_VERSION: z.string().default("2025-06-30.basil"),
  STRIPE_PAYMENT_METHODS: z
    .string()
    .default("automatic")
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean)),
  ACCESS_TOKEN_DAYS: z.coerce.number().int().min(1).max(3650).default(180),
  API_PUBLIC_BASE_URL: z.url().default("http://localhost:4000"),
  BR_PIX_PROVIDER: z.enum(["pixgo", "misticpay"]).default("pixgo"),
  PIXGO_API_KEY: z.string().min(1).optional(),
  PIXGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  MISTICPAY_CLIENT_ID: z.string().min(1).optional(),
  MISTICPAY_CLIENT_SECRET: z.string().min(1).optional(),
  REVENUE_TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  REVENUE_TELEGRAM_CHAT_ID: z.string().min(1).optional(),
  REVENUE_DISCORD_WEBHOOK_URL: z.url().optional(),
});

export type Env = z.infer<typeof Env>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return Env.parse(source);
}
