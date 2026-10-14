import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId)
    return NextResponse.redirect(new URL("/checkout/erro?motivo=session", request.url));
  const target = new URL("/checkout/processando", request.url);
  target.searchParams.set("session_id", sessionId);
  return NextResponse.redirect(target);
}
