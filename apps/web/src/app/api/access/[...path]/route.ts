import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/aro/core";
export const dynamic = "force-dynamic";
const cookieName = "__Host-espelho_access";
const allowed = new Set(["challenges", "challenges/verify", "session", "logout", "recover", "aro/claim"]);
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  const headers = { "Cache-Control": "no-store" };
  if (process.env.ACCESS_V1_ENABLED !== "true" || !allowed.has(path)) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  if (request.method === "POST" && !sameOrigin(request.headers.get("origin"), request.headers.get("host"), request.nextUrl.protocol)) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
  if ((request.method === "GET") !== (path === "session")) return NextResponse.json({ error: "method_not_allowed" }, { status: 405, headers });
  try {
    const url = new URL(process.env.ACCESS_V1_API_URL || "http://127.0.0.1:4000");
    if (url.username || url.password || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("access_configuration");
    const token = request.cookies.get(cookieName)?.value;
    const body = request.method === "POST" ? await request.text() : undefined;
    if (body && body.length > 4096) return NextResponse.json({ error: "invalid_request" }, { status: 413, headers });
    const response = await fetch(new URL("/access/" + path, url), {
      method: request.method,
      headers: { "content-type": "application/json", origin: request.nextUrl.origin, ...(token ? { cookie: cookieName + "=" + token } : {}) },
      body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    });
    const result = new NextResponse(await response.text(), { status: response.status, headers: { ...headers, "content-type": "application/json" } });
    const cookie = response.headers.get("set-cookie");
    if (cookie?.startsWith(cookieName + "=")) result.headers.set("Set-Cookie", cookie);
    return result;
  } catch { return NextResponse.json({ error: "access_unavailable" }, { status: 503, headers }); }
}
export const GET = forward;
export const POST = forward;
