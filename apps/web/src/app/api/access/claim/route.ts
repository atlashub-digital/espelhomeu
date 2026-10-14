import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  );
}

export async function POST(request: NextRequest) {
  const claim = request.cookies.get("espelho_checkout_claim")?.value;
  const claimSecret = claim?.split(".").slice(1).join(".");
  if (!claimSecret)
    return NextResponse.json({ ok: false, error: "claim_missing" }, { status: 401 });

  let body: { sessionId?: string };
  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  if (!body.sessionId)
    return NextResponse.json({ ok: false, error: "session_missing" }, { status: 400 });

  try {
    const upstream = await fetch(apiBase() + "/commerce/access/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: body.sessionId,
        claimSecret,
      }),
      cache: "no-store",
    });
    const payload = (await upstream.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (upstream.status === 202)
      return NextResponse.json(payload, { status: 202 });
    if (!upstream.ok)
      return NextResponse.json(payload, { status: upstream.status });

    const accessToken =
      typeof payload.accessToken === "string" ? payload.accessToken : "";
    if (!accessToken)
      return NextResponse.json(
        { ok: false, error: "access_token_missing" },
        { status: 502 },
      );
    delete payload.accessToken;
    const response = NextResponse.json(payload);
    response.cookies.set("espelho_access", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 180 * 24 * 60 * 60,
    });
    response.cookies.delete("espelho_checkout_claim");
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "claim_unavailable" },
      { status: 502 },
    );
  }
}
