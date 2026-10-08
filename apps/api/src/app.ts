import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { createDb, type Db } from "./db/client";
import type { Env } from "./env";
import { healthRoutes } from "./routes/health";
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

  return app;
}
