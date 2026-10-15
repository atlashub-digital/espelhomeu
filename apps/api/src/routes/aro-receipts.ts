import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { verifyAroEvent } from "@espelhomeu/shared/aro-webhook";
import type { Db } from "../db/client";
import { aroWebhookReceipts } from "../db/schema";
type Receipt = NonNullable<ReturnType<typeof verifyAroEvent>>;
export type ReceiptStore = (
  receipt: Receipt,
) => Promise<"recorded" | "duplicate" | "conflict">;
export function receiptStore(db: Db): ReceiptStore {
  return async (receipt) => {
    const inserted = await db.db
      .insert(aroWebhookReceipts)
      .values(receipt)
      .onConflictDoNothing()
      .returning({ id: aroWebhookReceipts.eventId });
    if (inserted.length) return "recorded";
    const [existing] = await db.db
      .select()
      .from(aroWebhookReceipts)
      .where(eq(aroWebhookReceipts.eventId, receipt.eventId));
    return existing?.payloadHash === receipt.payloadHash &&
      existing.project === receipt.project
      ? "duplicate"
      : "conflict";
  };
}
export async function aroReceiptRoutes(
  app: FastifyInstance,
  opts: { db?: Db; secret?: string; store?: ReceiptStore },
) {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: 65536 },
    (_request, body, done) => done(null, body),
  );
  app.post(
    "/aro/webhook",
    { bodyLimit: 65536, logLevel: "silent" },
    async (request, reply) => {
      if (!opts.secret)
        return reply.code(503).send({ error: "aro_webhook_unavailable" });
      const read = (key: string) =>
        typeof request.headers[key] === "string"
          ? (request.headers[key] as string)
          : "";
      const receipt = verifyAroEvent(
        request.body as Buffer,
        {
          timestamp: read("x-aro-timestamp"),
          signature: read("x-aro-signature"),
          eventId: read("x-aro-event-id"),
        },
        opts.secret,
      );
      if (!receipt) return reply.code(401).send({ error: "invalid_aro_event" });
      const store = opts.store ?? (opts.db ? receiptStore(opts.db) : undefined);
      if (!store)
        return reply.code(503).send({ error: "receipt_store_unavailable" });
      try {
        const result = await store(receipt);
        return reply
          .code(result === "conflict" ? 409 : 200)
          .send({ ok: result !== "conflict", result });
      } catch {
        return reply.code(503).send({ error: "receipt_store_unavailable" });
      }
    },
  );
}
