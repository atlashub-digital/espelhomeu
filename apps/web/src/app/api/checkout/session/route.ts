import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  try {
    const upstream = await fetch(apiBase() + "/commerce/checkout/pix", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await upstream.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!upstream.ok)
      return NextResponse.json(payload, { status: upstream.status });

    const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
    const claimSecret =
      typeof payload.claimSecret === "string" ? payload.claimSecret : "";
    if (!orderId || !claimSecret)
      return NextResponse.json(
        { ok: false, error: "invalid_checkout_response" },
        { status: 502 },
      );

    delete payload.claimSecret;
    const response = NextResponse.json(payload, { status: 201 });
    response.cookies.set(
      "espelho_checkout_claim",
      orderId + "." + claimSecret,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 2 * 60 * 60,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "checkout_unavailable" },
      { status: 502 },
    );
  }
}
