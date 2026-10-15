import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  );
}

export async function POST(request: NextRequest) {
  const claim = request.cookies.get("espelho_checkout_claim")?.value;
  const dot = claim?.indexOf(".") ?? -1;
  const orderId = dot > 0 ? claim!.slice(0, dot) : "";
  const claimSecret = dot > 0 ? claim!.slice(dot + 1) : "";
  if (!orderId || !claimSecret)
    return NextResponse.json({ ok: false, error: "claim_missing" }, { status: 401 });

  try {
    const upstream = await fetch(apiBase() + "/commerce/checkout/pix/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, claimSecret }),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "status_unavailable" },
      { status: 502 },
    );
  }
}
