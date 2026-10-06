import type { HealthResponse } from "@espelhomeu/shared";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client";

export function healthRoutes(app: FastifyInstance, opts: { db?: Db; version: string }) {
  app.get("/health", async (): Promise<HealthResponse> => {
    let db: HealthResponse["db"] = "not_configured";
    if (opts.db) {
      try {
        await opts.db.sql`select 1`;
        db = "up";
      } catch {
        db = "down";
      }
    }
    return { status: "ok", service: "espelhomeu-api", version: opts.version, db };
  });
}
