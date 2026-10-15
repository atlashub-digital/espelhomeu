import { NextRequest, NextResponse } from "next/server";
import { verifyAroEvent } from "@espelhomeu/shared/aro-webhook";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const secret = process.env.ARO_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json({ error: "webhook_unavailable" }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 65536)
    return new NextResponse(null, { status: 413 });
  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.length > 65536) return new NextResponse(null, { status: 413 });
  const timestamp = request.headers.get("x-aro-timestamp") ?? "",
    signature = request.headers.get("x-aro-signature") ?? "",
    eventId = request.headers.get("x-aro-event-id") ?? "";
  if (!verifyAroEvent(raw, { timestamp, signature, eventId }, secret))
    return NextResponse.json({ error: "invalid_aro_event" }, { status: 401 });
  try {
    // Only a notification receipt is stored. No payment state or entitlement projection.
    const api = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    ).replace(/\/$/, "");
    const upstream = await fetch(api + "/aro/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-aro-timestamp": timestamp,
        "x-aro-signature": signature,
        "x-aro-event-id": eventId,
      },
      body: raw,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (upstream.status === 409)
      return NextResponse.json({ error: "event_conflict" }, { status: 409 });
    if (!upstream.ok) throw new Error("receipt_unavailable");
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "receipt_unavailable" }, { status: 503 });
  }
}
