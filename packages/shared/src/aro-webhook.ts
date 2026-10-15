import { createHash, createHmac, timingSafeEqual } from "node:crypto";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function verifyAroEvent(
  raw: Buffer,
  headers: { timestamp: string; signature: string; eventId: string },
  secret: string,
  now = Date.now(),
) {
  if (
    !/^\d{10}$/.test(headers.timestamp) ||
    Math.abs(now / 1000 - Number(headers.timestamp)) > 300 ||
    !uuid.test(headers.eventId)
  )
    return null;
  const signature = /^v1=([a-f0-9]{64})$/i.exec(headers.signature)?.[1];
  if (!signature) return null;
  const expected = createHmac("sha256", secret)
    .update(headers.timestamp + ".")
    .update(raw)
    .digest();
  const received = Buffer.from(signature, "hex");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(expected, received)
  )
    return null;
  try {
    const event = JSON.parse(raw.toString("utf8"));
    if (
      event.id !== headers.eventId ||
      event.project !== "espelhomeu" ||
      typeof event.type !== "string" ||
      !event.data ||
      typeof event.data !== "object"
    )
      return null;
    return {
      eventId: event.id as string,
      project: "espelhomeu",
      payloadHash: createHash("sha256").update(raw).digest("hex"),
    };
  } catch {
    return null;
  }
}
