import { remoteAroClaim } from "./access/claim";
import { transport } from "./access/transport";
import { accessRoutes } from "./routes/access";
import { AccessService } from "./access/service";
import { postgresAccessStore } from "./access/store";
import { supabaseProvider } from "./access/provider";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { createDb, type Db } from "./db/client";
import type { Env } from "./env";
import { healthRoutes } from "./routes/health";
import { aroReceiptRoutes } from "./routes/aro-receipts";
import { waitlistRoutes } from "./routes/waitlist";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty" } }
        : env.NODE_ENV !== "test",
    trustProxy: true, // atrás do Caddy na VPS
  });

  await app.register(helmet);
  await app.register(cors, { origin: env.WEB_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  const db: Db | undefined = env.DATABASE_URL ? createDb(env.DATABASE_URL) : undefined;
  if (db) app.addHook("onClose", async () => db.sql.end());

  healthRoutes(app, { db, version: env.APP_VERSION });
  waitlistRoutes(app, { db });
  await app.register(aroReceiptRoutes, { db, secret: env.ARO_WEBHOOK_SECRET });

  const preview = env.NODE_ENV !== "production" && env.ACCESS_V1_TEST_MODE && !!env.ACCESS_V1_TEST_TOKEN;
  // Transport gates are enforced per recipient; no Master settings are changed.
  const access = env.ACCESS_V1_ENABLED && db && env.ACCESS_V1_ENCRYPTION_KEY && env.SUPABASE_URL_MASTER && env.SUPABASE_SERVICE_ROLE_KEY_MASTER
    ? new AccessService(postgresAccessStore(db), supabaseProvider(env.SUPABASE_URL_MASTER, env.SUPABASE_SERVICE_ROLE_KEY_MASTER), Buffer.from(env.ACCESS_V1_ENCRYPTION_KEY, "hex"), preview, Date.now, transport(env))
    : undefined;
  const aroKey = env.ACCESS_V1_ARO_SERVER_KEY ?? env.ARO_SERVER_KEY;
  await app.register(accessRoutes, { enabled: env.ACCESS_V1_ENABLED, service: access, origins: env.WEB_ORIGINS, aroClaim: aroKey ? remoteAroClaim(env.ACCESS_V1_ARO_CLAIM_URL ?? new URL("/claim", env.ARO_API_URL).href, aroKey) : undefined, testToken: preview ? env.ACCESS_V1_TEST_TOKEN : undefined });

  return app;
}
