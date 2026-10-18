import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default("0.0.0.0"),
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  DATABASE_URL: z.url().optional(),
  ARO_WEBHOOK_SECRET: z.preprocess(value => value === "" ? undefined : value, z.string().min(32).optional()),
  ACCESS_V1_ENABLED: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  ACCESS_V1_TEST_MODE: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  ACCESS_V1_TEST_TOKEN: z.string().min(32).optional(),
  ACCESS_V1_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  SUPABASE_URL_MASTER: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY_MASTER: z.string().min(1).optional(),
  APP_VERSION: z.string().default("dev"),
});

export type Env = z.infer<typeof Env>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return Env.parse(source);
}
