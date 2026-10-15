import Fastify from "fastify";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { aroReceiptRoutes, type ReceiptStore } from "./aro-receipts";
const secret = "synthetic-test-webhook-key-32-characters";
const event = {
  id: "11111111-1111-4111-8111-111111111111",
  project: "espelhomeu",
  type: "entitlement.granted",
  data: { order_id: "synthetic-order" },
};
function headers(
  raw: string,
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  return {
    "content-type": "application/json",
    "x-aro-event-id": event.id,
    "x-aro-timestamp": timestamp,
    "x-aro-signature":
      "v1=" +
      createHmac("sha256", secret)
        .update(timestamp + "." + raw)
        .digest("hex"),
  };
}
describe("ARO notification receipts, never financial truth", () => {
  it("deduplicates concurrent deliveries and detects same-id content conflicts", async () => {
    const receipts = new Map<string, string>();
    const store: ReceiptStore = async (r) => {
      const previous = receipts.get(r.eventId);
      if (previous)
        return previous === r.payloadHash ? "duplicate" : "conflict";
      receipts.set(r.eventId, r.payloadHash);
      return "recorded";
    };
    const app = Fastify();
    await app.register(aroReceiptRoutes, { secret, store });
    const raw = JSON.stringify(event);
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        app.inject({
          method: "POST",
          url: "/aro/webhook",
          headers: headers(raw),
          payload: raw,
        }),
      ),
    );
    expect(results.map((r) => r.statusCode)).toEqual([200, 200, 200]);
    expect(results.filter((r) => r.json().result === "recorded")).toHaveLength(
      1,
    );
    const other = JSON.stringify({ ...event, type: "entitlement.revoked" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/aro/webhook",
          headers: headers(other),
          payload: other,
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/aro/webhook",
          headers: headers(raw),
          payload: other,
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/aro/webhook",
          headers: headers(raw, "1000000000"),
          payload: raw,
        })
      ).statusCode,
    ).toBe(401);
    const foreign = JSON.stringify({ ...event, project: "other" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/aro/webhook",
          headers: headers(foreign),
          payload: foreign,
        })
      ).statusCode,
    ).toBe(401);
    await app.close();
  });
  it("does not acknowledge delivery when durable receipt store is unavailable", async () => {
    const app = Fastify();
    await app.register(aroReceiptRoutes, { secret });
    const raw = JSON.stringify(event);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/aro/webhook",
          headers: headers(raw),
          payload: raw,
        })
      ).statusCode,
    ).toBe(503);
    await app.close();
  });
});
