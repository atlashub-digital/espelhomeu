import { sameOrigin } from "@/lib/aro/core";
import { NextRequest, NextResponse } from "next/server";
import { currentCapability, getAroCheckout } from "@/lib/aro/client";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"), request.nextUrl.protocol))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  try {
    const capability = await currentCapability();
    if (!capability)
      return NextResponse.json({ error: "checkout_missing" }, { status: 401 });
    const session = await getAroCheckout(capability);
    return NextResponse.json(
      { status: session.state, orderId: session.order_id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "status_unavailable" }, { status: 503 });
  }
}
